"use client";
import type { CSSProperties } from "react";
import AgentFlow from "./AgentFlow";
import { AGENT_GUIDES } from "@/lib/agent-guides";
import type { AgentId, AgentStatus, AgentTrace, Language } from "@/lib/types";
export const AGENTS: {
  id: AgentId;
  name: string;
  color: string;
  role: [string, string];
  job: [string, string];
}[] = [
  {
    id: "mira",
    name: "Mira",
    color: "#e9c75c",
    role: ["understands the idea", "entiende la idea"],
    job: [
      "Finds the problem, the promise, and what still needs proof.",
      "Encuentra el problema, la propuesta y lo que falta demostrar.",
    ],
  },
  {
    id: "sora",
    name: "Sora",
    color: "#88b7ff",
    role: ["looks for demand", "investiga la demanda"],
    job: [
      "Looks for public evidence and alternatives. Calls out missing evidence.",
      "Busca evidencia pública y alternativas. Señala lo que falta comprobar.",
    ],
  },
  {
    id: "juno",
    name: "Juno",
    color: "#b9a1ee",
    role: ["brings five perspectives", "aporta cinco perspectivas"],
    job: [
      "Runs five independent AI personas, tailored to your audience.",
      "Ejecuta cinco perfiles de IA independientes, adaptados a tu público.",
    ],
  },
  {
    id: "rook",
    name: "Rook",
    color: "#f6877a",
    role: ["challenges the claims", "cuestiona las afirmaciones"],
    job: [
      "Separates useful observations from assumptions and optimistic guesses.",
      "Distingue las observaciones útiles de las suposiciones optimistas.",
    ],
  },
  {
    id: "leo",
    name: "Leo",
    color: "#8cd8a0",
    role: ["makes the next version", "mejora la próxima versión"],
    job: [
      "Turns the strongest findings into specific changes you can build.",
      "Convierte los hallazgos en cambios concretos que puedes implementar.",
    ],
  },
  {
    id: "vera",
    name: "Vera",
    color: "#75cbd0",
    role: ["takes it to real people", "lo lleva a personas reales"],
    job: [
      "Designs a neutral study for people you invite through a feedback link.",
      "Diseña una prueba neutral para las personas que invites con un enlace.",
    ],
  },
];
export function AgentDrawing({ id }: { id: AgentId }) {
  return (
    <svg
      className="agent-drawing"
      viewBox="0 0 120 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {id === "mira" && (
        <>
          <path d="M23 48V16h46l13 13v19H23Z" />
          <path d="M69 16v14h13M34 28h23M34 36h31M34 43h19" opacity=".55" />
          <circle cx="83" cy="38" r="13" />
          <path d="m92 48 13 11" strokeWidth="4" />
        </>
      )}
      {id === "sora" && (
        <>
          <path d="M15 52h93M22 52V36h13v16M48 52V26h13v26M74 52V13h13v39" />
          <path d="m19 25 27-10 24 4L97 5" strokeDasharray="3 4" />
          <circle cx="97" cy="5" r="4" fill="currentColor" stroke="none" />
        </>
      )}
      {id === "juno" && (
        <>
          <path d="M60 9v14M25 23h70M25 23v10M60 23v10M95 23v10" opacity=".7" />
          <circle cx="25" cy="44" r="10" />
          <circle cx="60" cy="44" r="10" />
          <circle cx="95" cy="44" r="10" />
          <circle cx="60" cy="8" r="5" fill="currentColor" />
          <path d="M19 44h12M54 44h12M89 44h12" />
        </>
      )}
      {id === "rook" && (
        <>
          <path d="M20 13h81v38H20z" opacity=".5" />
          <path d="m33 24 15 15m0-15L33 39M66 31l7 7 16-18" strokeWidth="3" />
          <path d="M28 58h67" strokeDasharray="3 4" />
        </>
      )}
      {id === "leo" && (
        <>
          <path d="M15 52h27V38h27V23h28V8" strokeWidth="3" />
          <path d="m89 8 8-1 1 9" />
          <path d="M23 22h23M23 28h12" opacity=".6" />
          <circle cx="42" cy="38" r="4" fill="currentColor" />
          <circle cx="69" cy="23" r="4" fill="currentColor" />
        </>
      )}
      {id === "vera" && (
        <>
          <path d="M15 12h40v28H31L19 51V40h-4V12Z" />
          <path d="M66 28h36v25H87L77 61v-8H66z" />
          <path d="M25 23h21M25 30h13M74 37h20M74 44h12" opacity=".6" />
        </>
      )}
    </svg>
  );
}
export function AgentRail({
  language,
  selected,
  onSelect,
  statuses = {},
  compact = false,
}: {
  language: Language;
  selected?: AgentId;
  onSelect: (id: AgentId) => void;
  statuses?: Partial<Record<AgentId, AgentStatus>>;
  compact?: boolean;
}) {
  const es = language === "es";
  return (
    <div className={`agent-rail ${compact ? "compact" : ""}`}>
      {AGENTS.map((a) => (
        <button
          key={a.id}
          className={`agent-tile ${selected === a.id ? "selected" : ""} ${statuses[a.id] || ""}`}
          style={{ "--agent": a.color } as CSSProperties}
          onClick={() => onSelect(a.id)}
          aria-label={`${a.name}: ${a.role[es ? 1 : 0]}`}
          aria-expanded={selected === a.id}
        >
          <AgentDrawing id={a.id} />
          <strong>{a.name}</strong>
          <span>{a.role[es ? 1 : 0]}</span>
          <small>
            {statuses[a.id] === "running"
              ? es
                ? "Trabajando…"
                : "Working…"
              : statuses[a.id] === "done"
                ? es
                  ? "Ver resultados ↗"
                  : "See output ↗"
                : statuses[a.id] === "error"
                  ? es
                    ? "Interrumpido"
                    : "Interrupted"
                  : es
                    ? "Explorar ↗"
                    : "Explore ↗"}
          </small>
        </button>
      ))}
    </div>
  );
}
export function AgentBrain({
  language,
  selected,
  onSelect,
  traces = {},
  statuses = {},
}: {
  language: Language;
  selected: AgentId;
  onSelect: (id: AgentId) => void;
  traces?: Partial<Record<AgentId, AgentTrace>>;
  statuses?: Partial<Record<AgentId, AgentStatus>>;
}) {
  const es = language === "es",
    l = es ? 1 : 0,
    a = AGENTS.find((a) => a.id === selected)!,
    trace = traces[selected],
    guide = AGENT_GUIDES[selected];
  return (
    <div className="brain-workspace">
      <div className="brain-intro">
        <div>
          <span className="detail-label">
            {es ? "Dentro del proceso" : "Inside the process"}
          </span>
          <h2>
            {es
              ? "Un equipo. Seis formas de ver tu idea."
              : "One team. Six ways to see your idea."}
          </h2>
          <p>
            {es
              ? "Cada agente tiene una tarea concreta. La investigación y las perspectivas se ejecutan en paralelo; después, el equipo revisa la evidencia y prepara tu siguiente paso."
              : "Each agent has a specific job. Research and perspectives run in parallel; then the team checks the evidence and prepares your next step."}
          </p>
        </div>
        <div className="brain-input-note">
          <span>{es ? "Todo empieza aquí" : "It all starts here"}</span>
          <strong>
            {es
              ? "Tus palabras. Tus materiales."
              : "Your words. Your materials."}
          </strong>
          <p>
            {es
              ? "Texto, PDF, imágenes y fotogramas."
              : "Text, PDFs, images and video frames."}
          </p>
        </div>
      </div>
      <AgentFlow
        language={language}
        selected={selected}
        onSelect={onSelect}
        statuses={statuses}
      />
      <div
        className="brain-detail"
        style={{ "--agent": a.color } as CSSProperties}
      >
        <article className="agent-guide">
          <span className="detail-label">
            {es ? "Agente seleccionado" : "Selected agent"}
          </span>
          <div className="guide-title">
            <h3>{a.name}</h3>
            <AgentDrawing id={a.id} />
          </div>
          <p className="guide-job">{a.job[l]}</p>
          <ol>
            {guide.steps[l].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="guide-limit">
            <strong>{es ? "Su límite" : "Its boundary"}</strong>
            <p>{guide.limit[l]}</p>
          </div>
        </article>
        <article className="agent-handoff">
          <div className="handoff-direction">{guide.handoff[l]}</div>
          <div className="handoff-input">
            <span className="detail-label">
              {es ? "Lo que recibe" : "What it receives"}
            </span>
            <p>{trace?.input || guide.input[l]}</p>
          </div>
          <div className="output-paper">
            <div className="detail-label">
              {trace
                ? es
                  ? "Resultado de tu análisis"
                  : "Output from your review"
                : es
                  ? "Lo que entregará"
                  : "What it will deliver"}
            </div>
            <h4>{trace?.output || guide.output[l]}</h4>
            {trace?.details.map((d, i) => (
              <div className="trace-entry" key={i}>
                <strong>{d.title}</strong>
                <p>{d.detail}</p>
              </div>
            ))}
            {!trace && (
              <p className="guide-empty">
                {es
                  ? "Cuando analices tu idea, los resultados reales de este agente aparecerán aquí."
                  : "When you review your idea, this agent’s actual results will appear here."}
              </p>
            )}
            {trace && (
              <span className="timing">
                {(trace.durationMs / 1000).toFixed(1)} s ·{" "}
                {es ? "Entrega completada" : "Completed handoff"}
              </span>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
