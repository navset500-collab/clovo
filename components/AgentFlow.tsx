"use client";
import type { CSSProperties } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import type { AgentId, AgentStatus, Language, RunEvent } from "@/lib/types";
import { AGENTS, AgentDrawing } from "./AgentLab";
export default function AgentFlow({
  language,
  selected,
  onSelect,
  statuses = {},
  events = [],
}: {
  language: Language;
  selected?: AgentId;
  onSelect: (id: AgentId) => void;
  statuses?: Partial<Record<AgentId, AgentStatus>>;
  events?: RunEvent[];
}) {
  const es = language === "es";
  function node(index: number) {
    const a = AGENTS[index],
      s = statuses[a.id] || "waiting";
    return (
      <button
        key={a.id}
        className={`pipeline-node ${s} ${selected === a.id ? "selected" : ""}`}
        style={{ "--agent": a.color } as CSSProperties}
        aria-pressed={selected === a.id}
        onClick={() => onSelect(a.id)}
      >
        <div className="pipeline-node-top">
          <span>
            {s === "done" ? (
              <Check size={16} />
            ) : s === "running" ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              String(index + 1).padStart(2, "0")
            )}
          </span>
          <span>
            {s === "done"
              ? es
                ? "Completado"
                : "Complete"
              : s === "running"
                ? es
                  ? "Trabajando"
                  : "Working"
                : s === "error"
                  ? es
                    ? "Interrumpido"
                    : "Interrupted"
                  : es
                    ? "Por empezar"
                    : "Not started"}
          </span>
        </div>
        <AgentDrawing id={a.id} />
        <strong>{a.name}</strong>
        <span className="pipeline-role">{a.role[es ? 1 : 0]}</span>
        {a.id === "juno" && (
          <div
            className="pipeline-personas"
            aria-label={
              es ? "Tres perfiles simulados" : "Three simulated profiles"
            }
          >
            {[0, 1, 2].map((i) => {
              const e = events.filter((e) => e.persona === i).at(-1);
              return <i key={i} className={e?.status || ""} />;
            })}
          </div>
        )}
      </button>
    );
  }
  function connector(
    active: boolean,
    branch?: "split" | "merge",
    moving = false,
  ) {
    if (branch)
      return (
        <div
          className={`pipeline-connector branch ${active ? "active" : ""} ${moving ? "transmitting" : ""}`}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 40 300"
            preserveAspectRatio="none"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            {branch === "split" ? (
              <>
                <path d="M0 150H12V75H39M12 150V225H39" />
                <path d="m33 71 6 4-6 4m0 142 6 4-6 4" />
              </>
            ) : (
              <>
                <path d="M0 75H25V150H39M0 225H25V150" />
                <path d="m33 146 6 4-6 4" />
              </>
            )}
          </svg>
          <ArrowRight className="mobile-connector" size={16} />
        </div>
      );
    return (
      <div
        className={`pipeline-connector ${active ? "active" : ""} ${moving ? "transmitting" : ""}`}
        aria-hidden="true"
      >
        <span />
        <ArrowRight size={16} />
      </div>
    );
  }
  return (
    <div
      className="pipeline"
      aria-label={es ? "Flujo de trabajo de los agentes" : "Agent workflow"}
    >
      <div className="pipeline-stage">{node(0)}</div>
      {connector(
        statuses.mira === "done",
        "split",
        statuses.sora === "running" || statuses.juno === "running",
      )}
      <div className="pipeline-stage parallel-stage">
        <span className="parallel-label">
          {es ? "En paralelo" : "In parallel"}
        </span>
        {node(1)}
        {node(2)}
      </div>
      {connector(
        statuses.sora === "done" && statuses.juno === "done",
        "merge",
        statuses.rook === "running",
      )}
      <div className="pipeline-stage">{node(3)}</div>
      {connector(
        statuses.rook === "done",
        undefined,
        statuses.leo === "running",
      )}
      <div className="pipeline-stage">{node(4)}</div>
      {connector(
        statuses.leo === "done",
        undefined,
        statuses.vera === "running",
      )}
      <div className="pipeline-stage">{node(5)}</div>
    </div>
  );
}
