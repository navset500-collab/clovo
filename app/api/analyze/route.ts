import { createModelSession, modelName, searchMarket } from "@/lib/model";
import {
  inputSchema,
  briefSchema,
  marketSchema,
  panelPlanSchema,
  panelBatchSchema,
  critiqueSchema,
  planSchema,
  experimentSchema,
  validSourceIds,
} from "@/lib/validation";
import { makeEvidenceSources, groundConcerns, linkPlans } from "@/lib/evidence";
import { scoreReadiness } from "@/lib/scoring";
import { matchResearchCitations } from "@/lib/research";
import { PANEL_SIZE, checkPanelCoverage } from "@/lib/panel";
import { ModelError } from "@/lib/model-error";
import { openRecovery, sealRecovery, type Recovery } from "@/lib/recovery";
import { REVIEW_METHOD } from "@/lib/review-method";
import { needsClarification } from "@/lib/intake";
import { auditResearch } from "@/lib/research";
import { alignFictionalProfiles, contradictsAudience } from "@/lib/personas";
import { guard, limitedJson, sameSecret } from "@/lib/access";
import { visitorIdentity } from "@/lib/visitor-quota";
import { reserve, usageResponse } from "@/lib/usage";
import { errorCode, errorText, reviewErrorCode } from "@/lib/messages";
import type {
  AgentId,
  AgentTrace,
  AnalysisEvent,
  Report,
  RunEvent,
} from "@/lib/types";
export const maxDuration = 180;
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (process.env.ANALYSIS_ENABLED === "false" || !process.env.GEMINI_API_KEY)
    return Response.json(
      {
        error:
          "New reviews are paused by the owner. The walkthrough and saved reports still work.",
        code: "review_paused",
      },
      { status: 503 },
    );
  const denied = guard(request, "analysis", 10);
  if (denied)
    return Response.json(
      { error: denied, code: errorCode(denied) },
      { status: denied === "Invalid request origin." ? 403 : 429 },
    );
  let raw;
  try {
    raw = await limitedJson(request);
  } catch {
    return Response.json(
      {
        error: "The input is invalid or exceeds 4 MB. Use fewer attachments.",
        code: "invalid_input",
      },
      { status: 400 },
    );
  }
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success)
    return Response.json(
      {
        code: "invalid_input",
        error:
          parsed.error.issues[0]?.message ||
          "Add a name, at least 50 words about your project, and a specific audience.",
      },
      { status: 400 },
    );
  const input = parsed.data;
  const evidenceSources = makeEvidenceSources(input);
  if (
    process.env.ANALYSIS_ACCESS_CODE &&
    !sameSecret(input.accessCode || "", process.env.ANALYSIS_ACCESS_CODE)
  )
    return Response.json(
      { error: "Invalid access code.", code: "invalid_access" },
      { status: 401 },
    );
  const visitor = process.env.BLOB_READ_WRITE_TOKEN
    ? visitorIdentity(request, process.env.BLOB_READ_WRITE_TOKEN)
    : null;
  let recovery: Recovery | undefined;
  if (input.recoveryToken) {
    try {
      if (!visitor || !process.env.BLOB_READ_WRITE_TOKEN)
        throw new ModelError("recovery_invalid");
      recovery = openRecovery(
        input.recoveryToken,
        input,
        visitor.key,
        process.env.BLOB_READ_WRITE_TOKEN,
      );
    } catch {
      return Response.json({ code: "recovery_invalid" }, { status: 400 });
    }
  }
  let release: (completed?: boolean, failureCode?: string) => Promise<void>;
  try {
    release = await reserve(
      request,
      "analysis",
      recovery ? `resume:${recovery.id}` : undefined,
      visitor?.key,
    );
  } catch (e) {
    const response = usageResponse(e);
    if (visitor?.cookie) response.headers.set("Set-Cookie", visitor.cookie);
    return response;
  }
  const lifetime = new AbortController();
  const signal = AbortSignal.any([
    request.signal,
    lifetime.signal,
    AbortSignal.timeout(150000),
  ]);
  const lang = input.language === "es" ? "Spanish" : "English";
  const locale = `Write ALL prose in ${lang}. Keep enum values as defined. `;
  const context = JSON.stringify({
    ...input,
    attachments: input.attachments.map((f) => ({
      id: f.id,
      name: f.name,
      kind: f.kind,
    })),
    accessCode: undefined,
    recoveryToken: undefined,
  });
  const encoder = new TextEncoder();
  const started = Date.now();
  let open = true;
  let completed = false;
  let failureCode = "";
  let failureAgent: AgentId | undefined;
  const reviewId = recovery?.reviewId || crypto.randomUUID();
  const stream = new ReadableStream({
    async start(controller) {
      const runEvents: RunEvent[] = [];
      const emit = (e: AnalysisEvent) => {
        if (e.type === "agent") {
          e.at = Date.now() - started;
          runEvents.push({
            at: e.at,
            agent: e.agent,
            status: e.status,
            message: e.message,
          });
        } else if (e.type === "panel-status")
          runEvents.push({
            at: e.at,
            agent: "juno",
            status: e.status,
            message: e.message,
            persona: e.index,
            profile: e.profile,
          });
        else if (e.type === "work") {
          e.at = Date.now() - started;
          runEvents.push({
            at: e.at,
            agent: e.agent,
            status: "running",
            kind: "activity",
            title: e.title,
            message: e.message,
            url: e.url,
          });
        }
        if (open)
          try {
            controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
          } catch {
            open = false;
          }
      };
      const work = (
        agent: AgentId,
        title: string,
        message: string,
        url?: string,
      ) => emit({ type: "work", agent, title, message, url });
      const askModel = createModelSession((schema) => {
        const agent: AgentId =
          schema === briefSchema
            ? "mira"
            : schema === marketSchema
              ? "sora"
              : schema === critiqueSchema
                ? "rook"
                : schema === planSchema
                  ? "leo"
                  : schema === experimentSchema
                    ? "vera"
                    : "juno";
        work(
          agent,
          lang === "Spanish" ? "Proveedor ocupado" : "Provider busy",
          lang === "Spanish"
            ? "Un único reintento automático dentro del presupuesto fijo de este análisis."
            : "One automatic retry within this review’s fixed attempt budget.",
        );
      }, recovery?.calls || 0);
      const traces: Partial<Record<AgentId, AgentTrace>> = {
        ...recovery?.traces,
      };
      const stages: Partial<Record<AgentId, unknown>> = { ...recovery?.stages };
      async function run<T>(
        id: AgentId,
        info: string,
        fn: () => Promise<T>,
        trace: (v: T) => Omit<AgentTrace, "durationMs">,
      ) {
        const at = Date.now();
        if (Object.prototype.hasOwnProperty.call(stages, id) && traces[id]) {
          work(
            id,
            lang === "Spanish"
              ? "Resultado recuperado"
              : "Completed work restored",
            lang === "Spanish"
              ? "Se conserva el resultado anterior; no se repite la llamada de IA."
              : "Reusing the completed result; no new AI call for this agent.",
          );
          emit({
            type: "agent",
            agent: id,
            status: "done",
            message: traces[id]!.output,
            trace: traces[id],
          });
          return stages[id] as T;
        }
        emit({ type: "agent", agent: id, status: "running", message: info });
        try {
          const value = await fn();
          traces[id] = { ...trace(value), durationMs: Date.now() - at };
          stages[id] = value;
          emit({
            type: "agent",
            agent: id,
            status: "done",
            message: traces[id]!.output,
            trace: traces[id],
          });
          return value;
        } catch (e) {
          failureAgent ||= id;
          emit({
            type: "agent",
            agent: id,
            status: "error",
            message:
              lang === "Spanish"
                ? "No se pudo completar."
                : "Could not complete.",
          });
          throw e;
        }
      }
      try {
        work(
          "mira",
          lang === "Spanish" ? "Material recibido" : "Material received",
          lang === "Spanish"
            ? `${input.attachments.length} archivos y el texto original. Se identificará el problema, el proceso y la suposición principal.`
            : `${input.attachments.length} evidence files and the original brief. Mapping the problem, workflow and pivotal assumption.`,
        );
        const brief = await run(
          "mira",
          lang === "Spanish" ? "Leyendo tu proyecto." : "Reading your project.",
          () =>
            askModel(
              locale + `${REVIEW_METHOD.mira} Project: ${context}`,
              input.attachments,
              briefSchema,
              signal,
            ),
          (v) => ({
            input: input.description,
            output: v.product,
            details: [
              {
                title: lang === "Spanish" ? "Problema" : "Problem",
                detail: v.problem,
              },
              ...v.evidence.map((detail) => ({
                title: lang === "Spanish" ? "Evidencia" : "Evidence",
                detail,
              })),
            ],
          }),
        );
        if (needsClarification(brief)) {
          emit({ type: "clarify", questions: brief.clarifyingQuestions });
          return;
        }
        const [market, panelResult] = await Promise.all([
          run(
            "sora",
            lang === "Spanish"
              ? "Investigando señales de demanda."
              : "Investigating demand signals.",
            async () => {
              const search = await searchMarket(
                JSON.stringify({
                  product: brief.product,
                  problem: brief.problem,
                  audience: input.audience,
                }),
                lang,
                signal,
                brief.researchQueries,
                input.name,
                (title, detail, url) => work("sora", title, detail, url),
              );
              const m = await askModel(
                locale +
                  `${REVIEW_METHOD.sora} Brief: ${JSON.stringify(brief)}. Research: ${search.text}. Sources: ${JSON.stringify(search.sources)}`,
                [],
                marketSchema,
                signal,
              );
              const validated = {
                ...m,
                signals: m.signals
                  .map((s) => {
                    const citations = matchResearchCitations(
                      s.citations,
                      search.sources,
                    );
                    return {
                      ...s,
                      citations,
                      sourceIds: [...new Set(citations.map((c) => c.sourceId))],
                    };
                  })
                  .filter((s) => s.sourceIds.length),
                alternatives: m.alternatives
                  .map((s) => {
                    const citations = matchResearchCitations(
                      s.citations,
                      search.sources,
                    );
                    return {
                      ...s,
                      citations,
                      sourceIds: [...new Set(citations.map((c) => c.sourceId))],
                    };
                  })
                  .filter((s) => s.sourceIds.length),
                sources: search.sources,
                grounded: search.sources.length > 0,
                searchNotice: search.notice,
                searchHtml: search.html,
                provider: search.provider,
                queries: search.queries,
              };
              const audit = auditResearch(
                validated,
                m.signals.length + m.alternatives.length,
              );
              work(
                "sora",
                lang === "Spanish"
                  ? "Citas comprobadas"
                  : "Citation checks complete",
                lang === "Spanish"
                  ? `${audit.retainedFindings} hallazgos conservados; ${audit.discardedFindings} descartados por falta de citas coincidentes. La coincidencia no demuestra demanda.`
                  : `${audit.retainedFindings} findings retained; ${audit.discardedFindings} discarded for unmatched support. A quote match is not proof of demand.`,
              );
              return { ...validated, audit };
            },
            (v) => ({
              input: brief.problem,
              output: v.summary,
              details: [
                ...v.signals.map((s) => ({ title: s.title, detail: s.detail })),
                ...v.unknowns.map((detail) => ({
                  title: lang === "Spanish" ? "Por verificar" : "To verify",
                  detail,
                })),
              ],
            }),
          ),
          run(
            "juno",
            lang === "Spanish"
              ? "Preparando cinco perspectivas distintas."
              : "Planning five distinct perspectives.",
            async () => {
              const plan = await askModel(
                locale +
                  `${REVIEW_METHOD.panel} Audience:${input.audience}. Brief:${JSON.stringify(brief)}. Description:${input.description}`,
                [],
                panelPlanSchema,
                signal,
              );
              const profiles = checkPanelCoverage(
                alignFictionalProfiles(plan.profiles, input.audience),
              );
              for (const [index, role] of profiles.entries()) {
                emit({
                  type: "panel-status",
                  at: Date.now() - started,
                  index,
                  profile: role,
                  status: "running",
                  message:
                    lang === "Spanish"
                      ? "Evaluando cinco perspectivas en una solicitud conjunta."
                      : "Evaluating five distinct perspectives in one shared request.",
                });
              }
              const batch = await askModel(
                locale +
                  `Evaluate these five FICTIONAL profiles as distinct scenario perspectives, not real research. Return exactly one persona for each profileIndex 0-4, preserving its assigned name, role and situation. Each must focus on its assigned lens, not repeat the others. Use one short sentence per response field, preferably under 180 characters. Include a concrete nonUseReason, suggestedChange, reaction, useful part, friction, current alternative, wouldTry and condition. Do not invent actual use, observations, statistics, UI controls, or demand. When details are missing frame friction as a conditional concern. Maintain the intended audience and consistent identities; do not infer pronouns from names. These perspectives are generated together, not independent interviews. Profiles: ${JSON.stringify(profiles)}. Audience:${input.audience}. Brief:${JSON.stringify(brief)}. Builder focus:${input.task}. Original description:${input.description}`,
                input.attachments,
                panelBatchSchema,
                signal,
              );
              if (
                new Set(batch.personas.map((p) => p.profileIndex)).size !==
                PANEL_SIZE
              )
                throw new ModelError("panel_invalid");
              const personas = batch.personas
                .sort((a, b) => a.profileIndex - b.profileIndex)
                .map((result) => {
                  const index = result.profileIndex,
                    role = profiles[index];
                  if (
                    contradictsAudience(
                      input.audience,
                      result.role + " " + result.situation,
                    )
                  )
                    throw new ModelError("panel_invalid");
                  return {
                    ...result,
                    name: role.name,
                    role: role.role,
                    situation: role.situation,
                    ageRange: role.ageRange,
                    context: role.context,
                    lens: role.lens,
                    panelIndex: index,
                  };
                });
              for (const p of personas) {
                emit({ type: "panel", index: p.panelIndex, persona: p });
                emit({
                  type: "panel-status",
                  at: Date.now() - started,
                  index: p.panelIndex,
                  status: "done",
                  message: p.reaction,
                });
              }
              return { personas, unavailable: [] as number[] };
            },
            (v) => ({
              input: input.audience,
              output:
                lang === "Spanish"
                  ? `${v.personas.length} de ${PANEL_SIZE} perspectivas simuladas disponibles. No son entrevistas reales.`
                  : `${v.personas.length} of ${PANEL_SIZE} simulated perspectives available. These are not real interviews.`,
              details: v.personas.map((p) => ({
                title: `${p.name} · ${p.role}`,
                detail: p.reaction + " " + p.friction,
              })),
            }),
          ),
        ]);
        const personas = panelResult.personas;
        if (recovery?.stages.juno) {
          for (const p of personas)
            emit({ type: "panel", index: p.panelIndex, persona: p });
        }
        work(
          "rook",
          lang === "Spanish"
            ? "Auditoría de afirmaciones"
            : "Auditing the claims",
          lang === "Spanish"
            ? `${market.signals.length} hallazgos citados y ${personas.length} perspectivas simuladas para cuestionar.`
            : `${market.signals.length} cited findings and ${personas.length} simulated perspectives to challenge.`,
        );
        const rawCritique = await run(
          "rook",
          lang === "Spanish"
            ? "Cuestionando las suposiciones."
            : "Challenging the assumptions.",
          () =>
            askModel(
              locale +
                `${REVIEW_METHOD.rook} ORIGINAL SOURCES: ${JSON.stringify(evidenceSources)}. Brief:${JSON.stringify(brief)}. Market:${JSON.stringify(market)}. FICTIONAL panel:${JSON.stringify(personas)}`,
              input.attachments,
              critiqueSchema,
              signal,
            ),
          (v) => ({
            input:
              lang === "Spanish"
                ? "Informe, investigación y panel simulado."
                : "Brief, research and simulated panel.",
            output: v.summary,
            details: v.concerns.map((c) => ({
              title: c.title,
              detail: c.evidence + " " + c.risk,
            })),
          }),
        );
        const critique = {
          ...rawCritique,
          concerns: groundConcerns(rawCritique.concerns, evidenceSources),
        };
        work(
          "leo",
          lang === "Spanish" ? "Riesgos priorizados" : "Risks prioritized",
          lang === "Spanish"
            ? `${critique.concerns.length} riesgos; se buscan cambios mínimos y direcciones alternativas.`
            : `${critique.concerns.length} risks; looking for small changes and alternative directions.`,
        );
        const plan = await run(
          "leo",
          lang === "Spanish"
            ? "Preparando cambios concretos."
            : "Preparing concrete improvements.",
          () =>
            askModel(
              locale +
                `${REVIEW_METHOD.leo} Brief:${JSON.stringify(brief)}. Concerns:${JSON.stringify(critique)}. FICTIONAL tester reactions:${JSON.stringify(personas)}`,
              [],
              planSchema,
              signal,
            ),
          (v) => ({
            input: critique.summary,
            output: v.summary,
            details: v.improvements.map((i) => ({
              title: i.title,
              detail: i.change,
            })),
          }),
        );
        work(
          "vera",
          lang === "Spanish"
            ? "Preparando una prueba falsable"
            : "Preparing a falsifiable test",
          lang === "Spanish"
            ? "Definiendo qué observar y qué resultado haría reconsiderar la idea."
            : "Defining what to observe and what result would make you reconsider the idea.",
        );
        const experiment = await run(
          "vera",
          lang === "Spanish"
            ? "Diseñando una prueba con personas."
            : "Designing a test with people.",
          () =>
            askModel(
              locale +
                `${REVIEW_METHOD.vera} Brief:${JSON.stringify(brief)}. Priorities:${JSON.stringify(plan)}. Concerns:${JSON.stringify(critique)}`,
              [],
              experimentSchema,
              signal,
            ),
          (v) => ({
            input: plan.summary,
            output: v.summary,
            details: [
              { title: lang === "Spanish" ? "Tarea" : "Task", detail: v.task },
              {
                title: lang === "Spanish" ? "Qué observar" : "What to observe",
                detail: v.successSignal,
              },
            ],
          }),
        );
        const report: Report = {
          readiness: scoreReadiness(rawCritique.readiness, evidenceSources),
          id: reviewId,
          createdAt: new Date().toISOString(),
          language: input.language,
          mode: "live",
          model: modelName(),
          summary: plan.summary,
          brief,
          market,
          personas,
          panelSize: PANEL_SIZE,
          panelUnavailable: panelResult.unavailable,
          directions: linkPlans(plan.directions, critique.concerns),
          critique: critique.concerns,
          improvements: linkPlans(plan.improvements, critique.concerns),
          experiment,
          evidenceSources,
          runEvents,
          durationMs: Date.now() - started,
          traces,
        };
        try {
          await release(true);
        } catch {
          throw new ModelError("completion_save_failed");
        }
        completed = true;
        emit({ type: "result", report });
      } catch (e) {
        failureCode =
          signal.aborted && signal.reason?.name === "TimeoutError"
            ? "review_timeout"
            : reviewErrorCode(e);
        lifetime.abort();
        console.error("Review interrupted", {
          code: failureCode,
          reviewId,
          agent: failureAgent,
          status: e instanceof ModelError ? e.status : undefined,
        });
        if (
          ![
            "review_cancelled",
            "completion_save_failed",
            "model_budget",
          ].includes(failureCode) &&
          visitor &&
          process.env.BLOB_READ_WRITE_TOKEN
        ) {
          const checkpoint = sealRecovery(
            { reviewId, calls: askModel.callsUsed(), stages, traces },
            input,
            visitor.key,
            process.env.BLOB_READ_WRITE_TOKEN,
          );
          if (checkpoint) emit({ type: "recovery", ...checkpoint });
        }
        emit({
          type: "error",
          code: failureCode,
          reference: reviewId.slice(0, 8),
          agent: failureAgent,
          message: errorText(failureCode, input.language),
        });
      } finally {
        lifetime.abort();
        try {
          await release(false, failureCode);
        } catch {
          /* A failed cleanup does not fabricate a completion; the lease expires. */
        }
        if (open) {
          open = false;
          controller.close();
        }
      }
    },
    cancel() {
      lifetime.abort();
      open = false;
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      ...(visitor?.cookie ? { "Set-Cookie": visitor.cookie } : {}),
    },
  });
}
