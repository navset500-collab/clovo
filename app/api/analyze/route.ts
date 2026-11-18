import { createModelSession, modelName, searchMarket } from "@/lib/model";
import {
  inputSchema,
  briefSchema,
  marketSchema,
  panelPlanSchema,
  personaSchema,
  critiqueSchema,
  planSchema,
  experimentSchema,
  validSourceIds,
} from "@/lib/validation";
import { makeEvidenceSources, groundConcerns, linkPlans } from "@/lib/evidence";
import { scoreReadiness } from "@/lib/scoring";
import { matchResearchCitations } from "@/lib/research";
import { PANEL_SIZE, checkPanelCoverage, collectPanel } from "@/lib/panel";
import { ModelError } from "@/lib/model-error";
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
      { status: 429 },
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
  let release: (completed?: boolean, failureCode?: string) => Promise<void>;
  try {
    release = await reserve(request, "analysis", undefined, visitor?.key);
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
  });
  const encoder = new TextEncoder();
  const started = Date.now();
  let open = true;
  let completed = false;
  let failureCode = "";
  let failureAgent: AgentId | undefined;
  const reviewId = crypto.randomUUID();
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
      });
      const traces: Partial<Record<AgentId, AgentTrace>> = {};
      async function run<T>(
        id: AgentId,
        info: string,
        fn: () => Promise<T>,
        trace: (v: T) => Omit<AgentTrace, "durationMs">,
      ) {
        const at = Date.now();
        emit({ type: "agent", agent: id, status: "running", message: info });
        try {
          const value = await fn();
          traces[id] = { ...trace(value), durationMs: Date.now() - at };
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
              return collectPanel(
                profiles,
                async (role, index) => {
                  emit({
                    type: "panel-status",
                    at: Date.now() - started,
                    index,
                    profile: role,
                    status: "running",
                    message:
                      lang === "Spanish"
                        ? `Perspectiva ${index + 1}: evaluando el proyecto.`
                        : `Perspective ${index + 1}: evaluating the project.`,
                  });
                  const result = await askModel(
                    locale +
                      `You are Juno's simulated tester ${index + 1}. Include nonUseReason: the strongest specific reason you might never adopt this even if it works, and suggestedChange: one focused adjustment that would address it. Your lens is ${role.lens}; do not mirror the objections of the other profiles. Your age range and context are fictional scenario parameters, never research findings.  You are FICTIONAL, not a real respondent. Your assigned identity and focus: ${JSON.stringify(role)}. Other profiles for comparison: ${JSON.stringify(profiles.filter((_, i) => i !== index))}. Stick to your assigned focus; do NOT repeat the other profiles’ main objection. Your name and identity MUST remain exactly as assigned. Keep identity and pronouns consistent. Prefer neutral or first-person wording; never infer identity from a name. If the audience is mothers, the persona must actually be a mother, not an unrelated male customer. These are fictional identities, not demographic evidence. Produce a concrete distinct name, role, situation, natural first-person reaction, useful part, point of friction, current workaround/alternative, whether you would try it, and condition needed. Do not claim actual use or measured behavior. Keep each field to 1-2 short sentences. Give specific constructive feedback; don't uniformly praise. Focus on your assigned perspective instead of repeating generic concerns. If interface details are not supplied, phrase usability friction as a conditional concern, never an observed failure. Do not invent tap counts, screen-reader failures, visual controls or actual use. A mobility limitation does not imply a visual impairment; keep the chosen access constraint consistent. Audience: ${input.audience}. Product: ${JSON.stringify(brief)}. Builder's focus: ${input.task}. Original description: ${input.description}. Every useful/friction/condition field must refer to a concrete aspect of this project, not a generic request for an intuitive UI.`,
                    input.attachments,
                    personaSchema,
                    signal,
                  );
                  if (
                    contradictsAudience(
                      input.audience,
                      result.role + " " + result.situation,
                    )
                  )
                    throw new Error(
                      lang === "Spanish"
                        ? "Un perfil no coincidió con el público indicado. Vuelve a intentarlo."
                        : "A simulated profile did not match the specified audience. Please retry.",
                    );
                  const p = {
                    ...result,
                    name: role.name,
                    role: role.role,
                    situation: role.situation,
                    ageRange: role.ageRange,
                    context: role.context,
                    lens: role.lens,
                    panelIndex: index,
                  };
                  emit({ type: "panel", index, persona: p });
                  emit({
                    type: "panel-status",
                    at: Date.now() - started,
                    index,
                    status: "done",
                    message: p.reaction,
                  });
                  return p;
                },
                (index) =>
                  emit({
                    type: "panel-status",
                    at: Date.now() - started,
                    index,
                    status: "error",
                    message:
                      lang === "Spanish"
                        ? "Esta perspectiva no se pudo completar. No se inventó una respuesta."
                        : "This perspective could not complete. No response was invented.",
                  }),
                signal,
              );
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
