"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Upload,
  FileText,
  Film,
  X,
  Download,
  ChevronRight,
  Check,
  Plus,
} from "lucide-react";
import type {
  AgentId,
  AgentStatus,
  AgentTrace,
  AnalysisEvent,
  Attachment,
  HumanResponse,
  Language,
  ProjectInput,
  Review,
  Persona,
  RunEvent,
} from "@/lib/types";
import { AgentRail, AgentBrain, AGENTS } from "./AgentLab";
import { Header, Footer, Modal } from "./Shared";
import HumanFeedback from "./HumanFeedback";
import AgentReplay from "./AgentReplay";
import LiveRun from "./LiveRun";
import Walkthrough, { ProductPreview } from "./Walkthrough";
import ProjectForm from "./ProjectForm";
import Readiness from "./Readiness";
import { PANEL_LABELS } from "@/lib/panel";
import {
  DecisionFrame,
  ResearchAudit,
  ConcernPriority,
  AlternativeDirections,
} from "./ReviewDepth";
import { EvidenceBadges, EvidenceDrawer, EvidenceSummary } from "./Evidence";
import { prepareFile } from "@/lib/files";
import { errorText, errorHeading, reviewErrorCode } from "@/lib/messages";
import { reportMarkdown } from "@/lib/export";
const blank: ProjectInput = {
  name: "",
  description: "",
  audience: "",
  task: "",
  url: "",
  stage: "idea",
  language: "en",
  attachments: [],
};
const STORAGE = "clovo-workspace-v3";
export default function Studio() {
  const [walkthrough, setWalkthrough] = useState(false),
    [questions, setQuestions] = useState<string[]>([]),
    [runReady, setRunReady] = useState(false),
    [exportHelp, setExportHelp] = useState(false);
  const [events, setEvents] = useState<RunEvent[]>([]),
    [sourceId, setSourceId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("en"),
    [page, setPage] = useState<"home" | "running" | "report">("home"),
    [review, setReview] = useState<Review | null>(null),
    [saved, setSaved] = useState<Review | null>(null),
    [form, setForm] = useState(false),
    [brain, setBrain] = useState<AgentId | null>(null),
    [draft, setDraft] = useState<ProjectInput>(blank),
    [filesBusy, setFilesBusy] = useState(false),
    [error, setError] = useState(""),
    [errorReset, setErrorReset] = useState<string | undefined>(),
    [failureDetail, setFailureDetail] = useState<{
      reference?: string;
      agent?: AgentId;
    } | null>(null),
    [status, setStatus] = useState<Partial<Record<AgentId, AgentStatus>>>({}),
    [traces, setTraces] = useState<Partial<Record<AgentId, AgentTrace>>>({}),
    [panel, setPanel] = useState<Persona[]>([]),
    [tab, setTab] = useState("overview"),
    [responses, setResponses] = useState<HumanResponse[]>([]),
    [elapsed, setElapsed] = useState(0),
    [clear, setClear] = useState(false),
    [checks, setChecks] = useState<string[]>([]);
  const abort = useRef<AbortController | null>(null),
    es = language === "es",
    t = (a: string, b: string) => (es ? b : a);
  useEffect(() => {
    try {
      const l = localStorage.getItem("clovo-language");
      if (l === "en" || l === "es") setLanguage(l);
      const legacy = localStorage.getItem("clovo-workspace-v2");
      if (legacy) {
        const old = JSON.parse(legacy);
        if (
          ["CampusQueue", "BookLoop"].includes(old?.input?.name) &&
          [
            "CampusQueue targets a real student pain point",
            "Como Leo, propongo",
          ].some((x) => old?.report?.summary?.startsWith(x))
        )
          localStorage.removeItem("clovo-workspace-v2");
      }
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const v = JSON.parse(raw);
        if (v?.report?.traces && v?.input) {
          setSaved(v);
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem("clovo-language", language);
    } catch {}
  }, [language]);
  useEffect(() => {
    if (page !== "running" || runReady) return;
    const timer = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [page, runReady]);
  useEffect(() => {
    if (review)
      try {
        setChecks(
          JSON.parse(
            localStorage.getItem(`clovo-checks-${review.report.id}`) || "[]",
          ),
        );
      } catch {
        setChecks([]);
      }
  }, [review?.report.id]);
  function openForm(seed?: ProjectInput) {
    setDraft(
      seed
        ? {
            ...seed,
            language,
            attachments: seed.attachments.filter((a) => a.data),
          }
        : { ...draft, language },
    );
    setError("");
    setForm(true);
  }
  function showReview(r: Review) {
    setReview(r);
    setTraces(r.report.traces);
    setStatus(Object.fromEntries(AGENTS.map((a) => [a.id, "done"])));
    setPage("report");
    setTab("overview");
    setResponses([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function addFiles(files: FileList | File[] | null) {
    if (!files?.length) return;
    setFilesBusy(true);
    setError("");
    try {
      let next = [...draft.attachments];
      for (const file of Array.from(files)) {
        const prepared = await prepareFile(file);
        next = [...next, ...prepared];
        if (next.length > 8)
          throw new Error(
            t(
              "Use up to 8 evidence items. A video uses 6 frames.",
              "Usa hasta 8 elementos. Un video utiliza 6 fotogramas.",
            ),
          );
        if (JSON.stringify(next).length > 3700000)
          throw new Error(
            t(
              "These files exceed the 3.7 MB processing limit. Use fewer files or a smaller PDF.",
              "Los archivos superan el límite de 3,7 MB. Usa menos archivos o un PDF más pequeño.",
            ),
          );
      }
      setDraft((d) => ({ ...d, attachments: next }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFilesBusy(false);
    }
  }
  async function analyze(e: React.FormEvent, input: ProjectInput = draft) {
    e.preventDefault();
    setDraft(input);
    setQuestions([]);
    setErrorReset(undefined);
    setFailureDetail(null);
    setError("");
    setForm(false);
    setRunReady(false);
    setPage("running");
    setStatus({});
    setTraces({});
    setPanel([]);
    setEvents([]);
    setElapsed(0);
    window.scrollTo({ top: 0 });
    const controller = new AbortController();
    abort.current = controller;
    let finished = false;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, language }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const j = await response.json();
        setErrorReset(j.resetAt);
        throw new Error(j.code || j.error);
      }
      const reader = response.body!.getReader(),
        decoder = new TextDecoder();
      let buffer = "";
      function handle(line: string) {
        if (!line.trim()) return;
        const event = JSON.parse(line) as AnalysisEvent;
        if (event.type === "agent") {
          setEvents((v) => [
            ...v,
            {
              at: event.at || 0,
              agent: event.agent,
              status: event.status,
              message: event.message,
            },
          ]);
          setStatus((s) => ({ ...s, [event.agent]: event.status }));
          if (event.trace)
            setTraces((s) => ({ ...s, [event.agent]: event.trace }));
        } else if (event.type === "work") {
          setEvents((v) => [
            ...v,
            {
              at: event.at || 0,
              agent: event.agent,
              status: "running",
              kind: "activity",
              title: event.title,
              message: event.message,
              url: event.url,
            },
          ]);
        } else if (event.type === "panel-status") {
          setEvents((v) => [
            ...v,
            {
              at: event.at,
              agent: "juno",
              status: event.status,
              message: event.message,
              persona: event.index,
              profile: event.profile,
            },
          ]);
        } else if (event.type === "panel")
          setPanel((p) => {
            const next = [...p];
            next[event.index] = event.persona;
            return next;
          });
        else if (event.type === "clarify") {
          setQuestions(event.questions);
          setPage("home");
          setForm(true);
          finished = true;
        } else if (event.type === "error") {
          setFailureDetail({ reference: event.reference, agent: event.agent });
          throw new Error(event.code || event.message);
        } else if (event.type === "result") {
          const result = {
            input: { ...input, accessCode: undefined, language },
            report: event.report,
          };
          setReview(result);
          setSaved(result);
          setTab("overview");
          setResponses([]);
          setRunReady(true);
          finished = true;
          try {
            localStorage.setItem(
              STORAGE,
              JSON.stringify({
                ...result,
                input: {
                  ...result.input,
                  attachments: result.input.attachments.map((a) => ({
                    ...a,
                    data: "",
                  })),
                },
              }),
            );
          } catch {
            setError(
              t(
                "The report is ready, but browser storage is full. Download it to keep a copy.",
                "El informe está listo, pero el almacenamiento está lleno. Descárgalo para conservarlo.",
              ),
            );
          }
        }
      }
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        lines.forEach(handle);
      }
      if (buffer.trim()) handle(buffer);
      if (!finished) throw new Error("stream_interrupted");
    } catch (e) {
      setError(
        controller.signal.aborted ? "review_cancelled" : reviewErrorCode(e),
      );
      setPage("home");
    } finally {
      abort.current = null;
    }
  }
  function download() {
    if (!review) return;
    const blob = new Blob([reportMarkdown(review, responses)], {
        type: "text/markdown",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `${review.input.name.replace(/[^a-z0-9]/gi, "-")}-clovo.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function toggleCheck(key: string) {
    const next = checks.includes(key)
      ? checks.filter((k) => k !== key)
      : [...checks, key];
    setChecks(next);
    if (review)
      try {
        localStorage.setItem(
          `clovo-checks-${review.report.id}`,
          JSON.stringify(next),
        );
      } catch {}
  }
  const r = review?.report;
  return (
    <>
      <Header
        language={language}
        onLanguage={setLanguage}
        onHome={() => {
          if (page !== "running") setPage("home");
        }}
        onBrain={() => {
          if (page === "home")
            document
              .getElementById("agents")
              ?.scrollIntoView({ behavior: "smooth" });
          else setBrain("mira");
        }}
      />
      <main id="main" tabIndex={-1}>
        {page === "home" && (
          <>
            <section className="home-hero">
              <div className="hero-copy">
                <h1>
                  {t("You have an idea.", "Tienes una idea.")}
                  <br />
                  <em>{t("Will people want it?", "¿La querrá la gente?")}</em>
                </h1>
                <p className="hero-description">
                  {t(
                    "Describe what you’re building. Get research, five simulated user perspectives, and a plan to improve it. Then invite real people to test your idea.",
                    "Describe lo que construyes. Recibe investigación, cinco perspectivas simuladas y un plan de mejoras. Después invita a personas reales a probar tu idea.",
                  )}
                </p>
                <div className="hero-actions">
                  <button className="primary large" onClick={() => openForm()}>
                    {t("Test your idea", "Pon a prueba tu idea")}
                    <ArrowUpRight size={23} />
                  </button>
                  <button
                    className="walkthrough-link"
                    onClick={() => setWalkthrough(true)}
                  >
                    <span className="play-outline">▷</span>
                    {t("See a walkthrough", "Ver un recorrido")}
                  </button>
                </div>
                <p className="hero-formats">
                  {t(
                    "Write it out. Drop in a PDF. Show a demo video.",
                    "Escríbela. Añade un PDF. Muestra un video.",
                  )}
                </p>
                {saved && (
                  <button
                    className="resume-link"
                    onClick={() => showReview(saved)}
                  >
                    {t("Continue with", "Continúa con")} {saved.input.name}
                    <ArrowRight size={18} />
                  </button>
                )}
              </div>
              <ProductPreview language={language} />
            </section>
            {error && (
              <div className="error page-error" role="alert">
                <div>
                  <strong>{errorHeading(error, language)}</strong>
                  <p>{errorText(error, language)}</p>
                  {failureDetail?.agent && (
                    <p>
                      {t("Stopped at: ", "Se detuvo en: ")}
                      {AGENTS.find((a) => a.id === failureDetail.agent)?.name}
                    </p>
                  )}
                  {failureDetail?.reference && (
                    <p>
                      {t("Support reference: ", "Referencia: ")}
                      {failureDetail.reference}
                    </p>
                  )}
                  {errorReset && (
                    <p>
                      {t("Resets: ", "Se reinicia: ")}
                      {new Date(errorReset).toLocaleString(es ? "es" : "en", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZoneName: "short",
                      })}
                    </p>
                  )}
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    setForm(true);
                    setError("");
                  }}
                >
                  {t("Return to your brief", "Volver a tu texto")}
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
            <section className="three-steps">
              <div>
                <span>01</span>
                <h3>{t("Describe your idea.", "Describe tu idea.")}</h3>
                <p>
                  {t(
                    "An idea in your notes is enough. Or bring a product brief, screenshots, a demo, and a prototype link.",
                    "Basta una idea en tus notas. También puedes añadir un documento, capturas, un video y un enlace.",
                  )}
                </p>
              </div>
              <div>
                <span>02</span>
                <h3>{t("Review the evidence.", "Revisa la evidencia.")}</h3>
                <p>
                  {t(
                    "Explore five simulated reactions, challenge assumptions, and get a practical plan for the next version.",
                    "Explora cinco reacciones simuladas, cuestiona suposiciones y recibe un plan práctico para la próxima versión.",
                  )}
                </p>
              </div>
              <div>
                <span>03</span>
                <h3>{t("Invite real people.", "Invita a personas reales.")}</h3>
                <p>
                  {t(
                    "Share a no-login feedback link with people you invite. Their actual responses stay separate from AI simulations.",
                    "Comparte un enlace sin inicio de sesión con quienes invites. Sus respuestas reales se distinguen de las simulaciones.",
                  )}
                </p>
              </div>
            </section>
            <section className="agents-home" id="agents">
              <div className="section-heading">
                <div>
                  <h2>
                    {t(
                      "Meet your first six perspectives.",
                      "Conoce tus seis primeras perspectivas.",
                    )}
                  </h2>
                  <p>
                    {t(
                      "A small team with different jobs. Click anyone to see how it works.",
                      "Un pequeño equipo con distintas tareas. Abre un agente para ver cómo trabaja.",
                    )}
                  </p>
                </div>
                <button className="secondary" onClick={() => setBrain("juno")}>
                  {t("Open the agent map", "Abrir mapa de agentes")}
                  <ArrowUpRight size={19} />
                </button>
              </div>
              <AgentRail language={language} onSelect={setBrain} />
            </section>
            <section className="perspective-section">
              <div className="perspective-preview">
                <div className="perspective-lines" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <div>
                  <h2>
                    {t(
                      "See it through someone else’s eyes.",
                      "Míralo desde otra perspectiva.",
                    )}
                  </h2>
                  <p>
                    {t(
                      "Six specialist agents. Five simulated perspectives. One clear next step.",
                      "Seis agentes especialistas. Cinco perspectivas simuladas. Un siguiente paso claro.",
                    )}
                  </p>
                </div>
              </div>
              <div className="surface-proof">
                <Check size={23} aria-hidden="true" />
                {t(
                  "Trace the feedback back to your evidence.",
                  "Relaciona los comentarios con tu evidencia.",
                )}
              </div>
            </section>
          </>
        )}
        {page === "running" && (
          <section className="running-page">
            <div className="section-heading">
              <div>
                <span className="live-dot">
                  {runReady
                    ? t("Your review is ready", "Tu análisis está listo")
                    : t(
                        "Your agents are working",
                        "Tus agentes están trabajando",
                      )}
                </span>
                <h1>
                  {t("Let’s put", "Vamos a poner")} {draft.name}{" "}
                  {t("to the test.", "a prueba.")}
                </h1>
                <p>
                  {t(
                    "Watch each agent turn your brief into findings. Click a completed agent to read its result while the others work.",
                    "Observa cómo cada agente convierte tu texto en hallazgos. Abre un agente completado para leer su resultado mientras los demás trabajan.",
                  )}
                </p>
              </div>
              <div className="run-controls">
                <span>
                  {elapsed}s ·{" "}
                  {Object.values(status).filter((s) => s === "done").length}/6{" "}
                  {t("complete", "completados")}
                </span>
                {runReady ? (
                  <button
                    className="primary"
                    onClick={() => {
                      setPage("report");
                      window.scrollTo({ top: 0 });
                    }}
                  >
                    {t("Open your review", "Abrir tu análisis")}
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    className="secondary"
                    onClick={() => abort.current?.abort()}
                  >
                    {t("Cancel", "Cancelar")}
                  </button>
                )}
              </div>
            </div>
            <LiveRun
              language={language}
              statuses={status}
              traces={traces}
              events={events}
              onOpen={setBrain}
              personas={panel}
            />
          </section>
        )}
        {page === "report" && review && r && (
          <section className="report-page">
            <div className="report-heading">
              <div>
                <button className="back-link" onClick={() => setPage("home")}>
                  ← {t("Home", "Inicio")}
                </button>
                <div className="title-row">
                  <h1>{review.input.name}</h1>
                  <span className="pill">
                    {r.mode === "example"
                      ? t("Illustrative example", "Ejemplo ilustrativo")
                      : t("Product review", "Análisis del producto")}
                  </span>
                </div>
                <p>{r.summary}</p>
              </div>
              <div className="report-actions">
                <button className="secondary" onClick={download}>
                  <Download size={18} />
                  {t("Download report", "Descargar informe")}
                </button>
                <button
                  className="text-button"
                  onClick={() => setExportHelp(true)}
                >
                  {t("Export & language help", "Ayuda: exportación e idiomas")}
                </button>
                <button
                  className="primary"
                  onClick={() => openForm(review.input)}
                >
                  {t("Test a new version", "Probar otra versión")}
                  <Plus size={18} />
                </button>
              </div>
            </div>
            {r.mode === "example" && (
              <p className="example-notice">
                {t(
                  "This is a written example, not a live analysis or real user study. Start your own review to get results for your product.",
                  "Este es un ejemplo escrito, no un análisis en vivo ni una prueba con usuarios. Inicia tu análisis para obtener resultados sobre tu producto.",
                )}
              </p>
            )}
            {r.language !== language && (
              <p className="example-notice">
                {t(
                  "The interface is now English. This report remains in Spanish; switching languages does not rerun the agents or use your allowance.",
                  "La interfaz está en español. El informe sigue en inglés; cambiar el idioma no ejecuta la IA ni consume tu límite.",
                )}
              </p>
            )}
            <div
              className="report-route"
              aria-label={t("How to use your report", "Cómo usar tu informe")}
            >
              <div>
                <strong>
                  {t("Your next three moves", "Tus tres próximos pasos")}
                </strong>
                <p>
                  {t(
                    "Read the findings, choose a change, then test it with people.",
                    "Lee los hallazgos, elige una mejora y pruébala con personas.",
                  )}
                </p>
              </div>
              <button onClick={() => setTab("demand")}>
                <span>1</span>
                {t("Check the research", "Revisa las fuentes")}
                <ArrowRight size={18} />
              </button>
              <button onClick={() => setTab("build")}>
                <span>2</span>
                {t("Choose what to improve", "Elige qué mejorar")}
                <ArrowRight size={18} />
              </button>
              <button onClick={() => setTab("humans")}>
                <span>3</span>
                {t("Ask real people", "Pregunta a personas")}
                <ArrowRight size={18} />
              </button>
            </div>
            <nav
              className="report-tabs"
              aria-label={t("Report sections", "Secciones del informe")}
            >
              {[
                ["overview", "Overview", "Resumen"],
                ["demand", "Demand", "Demanda"],
                ["panel", "Perspectives", "Perspectivas"],
                ["build", "Build next", "Qué construir"],
                ["humans", "Real feedback", "Comentarios reales"],
                ["activity", "Agent activity", "Actividad"],
              ].map(([id, en, sp]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? "page" : undefined}
                  className={tab === id ? "active" : ""}
                >
                  {t(en, sp)}
                  {id === "humans" && <span>{responses.length}</span>}
                </button>
              ))}
            </nav>
            <EvidenceSummary
              review={review}
              language={language}
              onOpen={setSourceId}
            />
            <div className="report-content" key={tab}>
              {tab === "overview" && (
                <>
                  <Readiness
                    review={review}
                    language={language}
                    onSource={setSourceId}
                  />
                  <DecisionFrame report={r} language={language} />
                  <div className="overview-grid">
                    <article className="lead-card">
                      <span className="detail-label">
                        {t("The idea, understood", "Tu idea, comprendida")}
                      </span>
                      <h2>{r.brief.product}</h2>
                      <p>{r.brief.problem}</p>
                      <button
                        className="text-button"
                        onClick={() => setBrain("mira")}
                      >
                        {t("See what Mira read", "Ver lo que leyó Mira")}
                        <ArrowUpRight size={18} />
                      </button>
                    </article>
                    <article className="next-card">
                      <span className="detail-label">
                        {t("Your next best step", "Tu siguiente paso")}
                      </span>
                      <h3>{r.improvements[0]?.title}</h3>
                      <p>{r.improvements[0]?.change}</p>
                      <button
                        className="primary"
                        onClick={() => setTab("build")}
                      >
                        {t("Open your build plan", "Abrir plan de mejoras")}
                        <ArrowRight size={19} />
                      </button>
                    </article>
                  </div>
                  <div className="two-columns">
                    <article className="plain-card">
                      <h3>{t("What already works", "Lo que ya funciona")}</h3>
                      {r.brief.strengths.map((s, i) => (
                        <p className="check-line" key={i}>
                          <Check size={20} />
                          {s}
                        </p>
                      ))}
                    </article>
                    <article className="plain-card">
                      <h3>
                        {t("What still needs proof", "Lo que falta demostrar")}
                      </h3>
                      {r.brief.assumptions.map((s, i) => (
                        <p className="number-line" key={i}>
                          <span>{i + 1}</span>
                          {s}
                        </p>
                      ))}
                    </article>
                  </div>
                  <div className="section-heading">
                    <h2>
                      {t(
                        "The questions worth taking seriously.",
                        "Las preguntas que merecen atención.",
                      )}
                    </h2>
                  </div>
                  {r.critique.map((c, i) => (
                    <article className="concern" key={i}>
                      <span className="concern-number">0{i + 1}</span>
                      <div>
                        <ConcernPriority concern={c} language={language} />
                        <h3>{c.title}</h3>
                        <EvidenceBadges
                          concern={c}
                          language={language}
                          onOpen={setSourceId}
                        />
                        <p>{c.evidence}</p>
                        <p>{c.risk}</p>
                        {c.counterEvidence && (
                          <p className="counter-evidence">
                            <strong>
                              {t(
                                "What could change this view: ",
                                "Qué podría cambiar esta opinión: ",
                              )}
                            </strong>
                            {c.counterEvidence}
                          </p>
                        )}
                        <div className="test-prompt">
                          <strong>{t("Test it: ", "Compruébalo: ")}</strong>
                          {c.test}
                        </div>
                      </div>
                    </article>
                  ))}
                  <div className="evidence-foot">
                    <h3>
                      {t("What was actually reviewed", "Lo que se analizó")}
                    </h3>
                    {r.brief.evidence.map((s, i) => (
                      <p key={i}>{s}</p>
                    ))}
                    {review.input.url && (
                      <p>
                        {t(
                          "Prototype link provided for human testers. The agents did not browse or interact with the live application.",
                          "Enlace del prototipo disponible para los participantes. Los agentes no navegaron ni interactuaron con la aplicación.",
                        )}
                      </p>
                    )}
                  </div>
                </>
              )}
              {tab === "demand" && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>
                        {t(
                          "Is there a reason to want this?",
                          "¿Hay una razón para querer esto?",
                        )}
                      </h2>
                      <p>
                        {t(
                          "Look for evidence of a problem before treating an idea as validated.",
                          "Busca evidencia de un problema antes de considerar validada una idea.",
                        )}
                      </p>
                    </div>
                    <span className="pill">
                      {r.market.grounded
                        ? t(
                            "Public source signals",
                            "Señales de fuentes públicas",
                          )
                        : t("Demand unverified", "Demanda sin verificar")}
                    </span>
                  </div>
                  <div className="lead-card">
                    <p className="large-copy">{r.market.summary}</p>
                    {r.market.searchNotice && (
                      <p className="search-notice">{r.market.searchNotice}</p>
                    )}
                  </div>
                  <ResearchAudit report={r} language={language} />
                  {r.market.signals.map((s, i) => (
                    <article className="plain-card" key={i}>
                      <span className="research-kind">
                        {s.evidenceType === "provider-claim"
                          ? t("Provider claim", "Afirmación del proveedor")
                          : s.evidenceType === "research"
                            ? t("Research finding", "Hallazgo de investigación")
                            : t("Reported experience", "Experiencia relatada")}
                      </span>
                      <h3>{s.title}</h3>
                      <p>{s.detail}</p>
                      {s.relevance && (
                        <p className="research-relevance">
                          <strong>
                            {t("For your idea: ", "Para tu idea: ")}
                          </strong>
                          {s.relevance}
                        </p>
                      )}
                      <ResearchQuotes
                        citations={s.citations}
                        sources={r.market.sources}
                        language={language}
                      />
                      <SourceLinks
                        ids={s.sourceIds}
                        sources={r.market.sources}
                      />
                    </article>
                  ))}
                  {r.market.alternatives.length > 0 && (
                    <>
                      <h2>
                        {t(
                          "What people might choose instead",
                          "Lo que podrían elegir en su lugar",
                        )}
                      </h2>
                      <div className="two-columns">
                        {r.market.alternatives.map((a, i) => (
                          <article className="plain-card" key={i}>
                            <h3>{a.name}</h3>
                            <p>{a.difference}</p>
                            {a.targetUser && (
                              <p>
                                <strong>
                                  {t("Who it serves: ", "A quién sirve: ")}
                                </strong>
                                {a.targetUser}
                              </p>
                            )}
                            {a.switchingCost && (
                              <p>
                                <strong>
                                  {t(
                                    "Switching friction · hypothesis: ",
                                    "Fricción al cambiar · hipótesis: ",
                                  )}
                                </strong>
                                {a.switchingCost}
                              </p>
                            )}
                            {a.opportunity && (
                              <p className="research-relevance">
                                <strong>
                                  {t(
                                    "Possible opening · inference: ",
                                    "Posible oportunidad · inferencia: ",
                                  )}
                                </strong>
                                {a.opportunity}
                              </p>
                            )}
                            <ResearchQuotes
                              citations={a.citations}
                              sources={r.market.sources}
                              language={language}
                            />
                            <SourceLinks
                              ids={a.sourceIds}
                              sources={r.market.sources}
                            />
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                  <article className="plain-card">
                    <h3>
                      {t(
                        "The evidence to collect next",
                        "La evidencia que falta recopilar",
                      )}
                    </h3>
                    {r.market.unknowns.map((u, i) => (
                      <p className="number-line" key={i}>
                        <span>{i + 1}</span>
                        {u}
                      </p>
                    ))}
                    <button
                      className="primary"
                      onClick={() => setTab("humans")}
                    >
                      {t("Ask your audience", "Pregunta a tu público")}
                      <ArrowRight size={20} />
                    </button>
                  </article>
                  {r.market.sources.length > 0 && (
                    <details className="research-library">
                      <summary>
                        {t(
                          "Research sources & search terms",
                          "Fuentes y consultas",
                        )}{" "}
                        · {r.market.sources.length}
                      </summary>
                      <p>
                        {r.market.provider} ·{" "}
                        {t(
                          "Retrieved during this review",
                          "Recuperadas durante este análisis",
                        )}
                      </p>
                      {r.market.queries?.map((q) => (
                        <span className="query-chip" key={q}>
                          {q}
                        </span>
                      ))}
                      {r.market.sources.map((source) => (
                        <article key={source.id}>
                          <a href={source.url} target="_blank" rel="noreferrer">
                            <strong>{source.title}</strong>
                            <ArrowUpRight size={18} />
                          </a>
                          <p>{source.excerpt}</p>
                          <span>
                            {new URL(source.url).hostname} · {source.id}
                          </span>
                        </article>
                      ))}
                    </details>
                  )}
                  {r.market.searchHtml && (
                    <iframe
                      title="Google Search suggestions"
                      className="search-attribution"
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                      srcDoc={r.market.searchHtml}
                    />
                  )}
                  <p className="evidence-note">
                    {t(
                      "Competitor activity and AI reactions do not prove demand for your product. Real usage, repeat use and meaningful commitments provide stronger evidence.",
                      "La actividad de competidores y las reacciones de IA no demuestran demanda de tu producto. El uso real, repetido y los compromisos concretos aportan evidencia más sólida.",
                    )}
                  </p>
                </>
              )}
              {tab === "panel" && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>
                        {t(
                          `${r.personas.length} simulated perspectives. Real people still needed.`,
                          `${r.personas.length} perspectivas simuladas. Aún faltan personas reales.`,
                        )}
                      </h2>
                      <p>
                        {t(
                          "Juno’s sub-agents explore different needs within your audience. Use their objections to design better real-world tests.",
                          "Los subagentes de Juno exploran distintas necesidades de tu público. Usa sus objeciones para diseñar pruebas reales.",
                        )}
                      </p>
                    </div>
                    <span className="pill purple">
                      {t("AI simulation", "Simulación de IA")}
                    </span>
                  </div>
                  {(r.panelUnavailable?.length || 0) > 0 && (
                    <p className="example-notice">
                      {t(
                        `${r.panelUnavailable!.length} of ${r.panelSize} perspectives were unavailable. This is a partial panel; no responses were invented.`,
                        `${r.panelUnavailable!.length} de ${r.panelSize} perspectivas no estuvieron disponibles. El panel es parcial; no se inventaron respuestas.`,
                      )}
                    </p>
                  )}
                  <div className="persona-grid">
                    {r.personas.map((p, i) => (
                      <article className="persona-card" key={i}>
                        <div className="persona-heading">
                          <span className={`persona-monogram persona-${i}`}>
                            {p.name.slice(0, 1)}
                          </span>
                          <div>
                            <h3>{p.name}</h3>
                            <span>{p.role}</span>
                          </div>
                        </div>
                        {p.lens && (
                          <span className="panel-lens">
                            {PANEL_LABELS[p.lens][es ? 1 : 0]}
                          </span>
                        )}
                        {p.ageRange && (
                          <p className="persona-context">
                            {t("Fictional age range: ", "Edad ficticia: ")}
                            {p.ageRange} · {p.context}
                          </p>
                        )}
                        <p className="situation">{p.situation}</p>
                        <blockquote>“{p.reaction}”</blockquote>
                        <h4>{t("What feels useful", "Lo que parece útil")}</h4>
                        <p>{p.useful}</p>
                        <h4>
                          {t("What gets in the way", "Lo que dificulta el uso")}
                        </h4>
                        <p>{p.friction}</p>
                        <h4>
                          {t(
                            "What they might use instead",
                            "Lo que podrían usar en su lugar",
                          )}
                        </h4>
                        <p>{p.alternative}</p>
                        {p.nonUseReason && (
                          <>
                            <h4>
                              {t(
                                "Why they might never use it",
                                "Por qué podrían no usarlo",
                              )}
                            </h4>
                            <p>{p.nonUseReason}</p>
                          </>
                        )}
                        {p.suggestedChange && (
                          <>
                            <h4>
                              {t(
                                "One change worth testing",
                                "Un cambio que probar",
                              )}
                            </h4>
                            <p>{p.suggestedChange}</p>
                          </>
                        )}
                        <div className="persona-condition">
                          <strong>
                            {t(
                              "The condition for trying it",
                              "La condición para probarlo",
                            )}
                          </strong>
                          <p>{p.condition}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                  <button
                    className="secondary"
                    onClick={() => setTab("humans")}
                  >
                    {t(
                      "Replace assumptions with real feedback",
                      "Sustituye suposiciones por comentarios reales",
                    )}
                    <ArrowRight size={20} />
                  </button>
                </>
              )}
              {tab === "build" && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>
                        {t(
                          "A better next version starts here.",
                          "Aquí empieza una versión mejor.",
                        )}
                      </h2>
                      <p>
                        {t(
                          "Specific changes, in priority order. Check off what you’ve built.",
                          "Cambios concretos, por prioridad. Marca lo que hayas completado.",
                        )}
                      </p>
                    </div>
                    <span>
                      {checks.length}/{r.improvements.length}{" "}
                      {t("complete", "completados")}
                    </span>
                  </div>
                  {r.improvements.map((i, n) => (
                    <article
                      className={`build-card ${checks.includes(i.title) ? "complete" : ""}`}
                      key={n}
                    >
                      <label className="build-check">
                        <input
                          type="checkbox"
                          checked={checks.includes(i.title)}
                          onChange={() => toggleCheck(i.title)}
                          aria-label={`${t("Complete", "Completar")}: ${i.title}`}
                        />
                        <span>{String(n + 1).padStart(2, "0")}</span>
                      </label>
                      <div>
                        <div className="card-top">
                          <h3>{i.title}</h3>
                          <span className="pill">{i.effort}</span>
                        </div>
                        <p className="large-copy">{i.change}</p>
                        <p>{i.why}</p>
                        {i.firstStep && (
                          <p className="first-step">
                            <strong>
                              {t("Start here: ", "Empieza aquí: ")}
                            </strong>
                            {i.firstStep}
                          </p>
                        )}
                        {i.tradeoff && (
                          <p>
                            <strong>
                              {t("Tradeoff: ", "Lo que sacrificas: ")}
                            </strong>
                            {i.tradeoff}
                          </p>
                        )}
                        <div className="plan-provenance">
                          {(i.findingIds || []).map((id) => {
                            const concern = r.critique.find((c) => c.id === id);
                            return concern ? (
                              <div key={id}>
                                <span>
                                  {t("Addresses: ", "Resuelve: ")}
                                  {concern.title}
                                </span>
                                <EvidenceBadges
                                  concern={concern}
                                  language={language}
                                  onOpen={setSourceId}
                                />
                              </div>
                            ) : null;
                          })}
                        </div>
                        <div className="test-prompt">
                          <strong>
                            {t("Done when: ", "Completado cuando: ")}
                          </strong>
                          {i.check}
                        </div>
                      </div>
                    </article>
                  ))}
                  <AlternativeDirections report={r} language={language} />
                  <div className="closing-line">
                    <h3>
                      {t(
                        "Built something better? Put it back to the test.",
                        "¿Ya lo mejoraste? Ponlo a prueba otra vez.",
                      )}
                    </h3>
                    <button
                      className="primary"
                      onClick={() => openForm(review.input)}
                    >
                      {t("Test the next version", "Probar la próxima versión")}
                      <ArrowUpRight size={20} />
                    </button>
                  </div>
                </>
              )}
              {tab === "activity" && (
                <AgentReplay language={language} report={r} onOpen={setBrain} />
              )}
              {tab === "humans" && (
                <HumanFeedback
                  review={review}
                  language={language}
                  onResponses={setResponses}
                />
              )}
            </div>
            <div className="report-foot">
              <span>
                {r.mode === "live"
                  ? `${(r.durationMs / 1000).toFixed(1)} s · ${r.model}`
                  : t("Illustrative example", "Ejemplo ilustrativo")}
              </span>
              <button className="text-button" onClick={() => setClear(true)}>
                {t("Clear this browser’s workspace", "Borrar el espacio local")}
              </button>
            </div>
          </section>
        )}
      </main>
      <Footer language={language} />
      {exportHelp && (
        <Modal
          title={t(
            "Keep and share your findings",
            "Guarda y comparte tus hallazgos",
          )}
          onClose={() => setExportHelp(false)}
        >
          <h2>
            {t("Your report, outside Clovo.", "Tu informe, fuera de Clovo.")}
          </h2>
          <h3>{t("What does export do?", "¿Qué hace la exportación?")}</h3>
          <p>
            {t(
              "Download report saves a .md text document to your device: your brief, readiness score, evidence links, AI perspectives, suggested improvements, and interview questions. Real responses are included if you have loaded them in this session. Refresh responses first for the latest answers.",
              "Descargar informe guarda un documento de texto .md: tu idea, puntuación, fuentes, perspectivas, mejoras y preguntas. Incluye respuestas reales si las cargaste en esta sesión. Actualízalas primero para incluir las más recientes.",
            )}
          </p>
          <p>
            {t(
              "Open it in a text editor or paste it into a document. It includes your original written brief, so review it before sharing. Files, API keys and study-owner keys are never included. Export does not publish anything or run the agents again.",
              "Ábrelo en un editor o pega su contenido en un documento. Incluye tu texto original: revísalo antes de compartirlo. No contiene archivos, claves de API ni claves del propietario. Exportar no publica nada ni ejecuta la IA.",
            )}
          </p>
          <h3>
            {t(
              "How do English and Spanish work?",
              "¿Cómo funcionan inglés y español?",
            )}
          </h3>
          <p>
            {t(
              "The language menu changes the interface immediately, without an AI call. Select a language before starting a review to receive the generated report and participant questions in that language. Existing reports and people’s answers stay in their original language; switching the menu does not translate or rerun them. A new review uses your allowance.",
              "El menú cambia la interfaz inmediatamente, sin llamadas a IA. Elige un idioma antes de analizar para recibir el informe y las preguntas en ese idioma. Los informes guardados y las respuestas conservan su idioma original: el menú no los traduce ni los vuelve a generar. Otro análisis consume tu límite.",
            )}
          </p>
          <button
            className="primary"
            onClick={() => {
              download();
              setExportHelp(false);
            }}
          >
            {t("Download .md report", "Descargar informe .md")}
            <Download size={18} />
          </button>
        </Modal>
      )}
      {walkthrough && (
        <Walkthrough
          language={language}
          onClose={() => setWalkthrough(false)}
          onStart={() => {
            setWalkthrough(false);
            openForm();
          }}
        />
      )}
      {form && (
        <ProjectForm
          language={language}
          draft={draft}
          setDraft={setDraft}
          onClose={() => setForm(false)}
          onAnalyze={analyze}
          filesBusy={filesBusy}
          addFiles={addFiles}
          error={errorText(error, language)}
          questions={questions}
        />
      )}

      {sourceId && review && (
        <EvidenceDrawer
          review={review}
          sourceId={sourceId}
          language={language}
          onClose={() => setSourceId(null)}
          onSelect={setSourceId}
        />
      )}
      {brain && (
        <Modal
          title={t("Inside Clovo", "Dentro de Clovo")}
          onClose={() => setBrain(null)}
          wide
        >
          <AgentBrain
            language={language}
            selected={brain}
            onSelect={setBrain}
            traces={traces}
            statuses={status}
          />
        </Modal>
      )}
      {clear && (
        <Modal
          title={t("Clear local workspace", "Borrar espacio local")}
          onClose={() => setClear(false)}
        >
          <h2>
            {t(
              "Remove this saved review?",
              "¿Eliminar este análisis guardado?",
            )}
          </h2>
          <p>
            {t(
              "This removes the local report and build checklist. Any shared study remains available in this browser through its saved owner key. Delete a shared study from Real feedback first if you want it removed too.",
              "Esto elimina el informe local y su lista de mejoras. Las pruebas compartidas conservan su clave en este navegador. Elimina primero una prueba desde Comentarios reales si también quieres quitarla.",
            )}
          </p>
          <div className="row-actions">
            <button className="secondary" onClick={() => setClear(false)}>
              {t("Cancel", "Cancelar")}
            </button>
            <button
              className="primary"
              onClick={() => {
                try {
                  localStorage.removeItem(STORAGE);
                  if (review)
                    localStorage.removeItem(`clovo-checks-${review.report.id}`);
                } catch {}
                setSaved(null);
                setReview(null);
                setPage("home");
                setClear(false);
              }}
            >
              {t("Clear local report", "Borrar informe local")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function SourceLinks({
  ids,
  sources,
}: {
  ids: string[];
  sources: Review["report"]["market"]["sources"];
}) {
  return (
    <div className="source-links">
      {ids.map((id) => {
        const s = sources.find((s) => s.id === id);
        return s ? (
          <a key={id} href={s.url} target="_blank" rel="noreferrer">
            {s.title}
            <ArrowUpRight size={16} />
          </a>
        ) : null;
      })}
    </div>
  );
}

function ResearchQuotes({
  citations = [],
  sources,
  language,
}: {
  citations?: { sourceId: string; quote: string }[];
  sources: Review["report"]["market"]["sources"];
  language: Language;
}) {
  return (
    <div className="research-quotes">
      {citations.map((c, i) => {
        const source = sources.find((s) => s.id === c.sourceId);
        return source ? (
          <details key={i}>
            <summary>
              {language === "es"
                ? "Ver el extracto de apoyo"
                : "Inspect supporting excerpt"}{" "}
              · {new URL(source.url).hostname}
            </summary>
            <blockquote>{c.quote}</blockquote>
            <p>
              {language === "es"
                ? "Coincide con el texto recuperado. La interpretación aún puede necesitar verificación."
                : "Matched against retrieved source text. The interpretation may still need checking."}
            </p>
          </details>
        ) : null;
      })}
    </div>
  );
}
