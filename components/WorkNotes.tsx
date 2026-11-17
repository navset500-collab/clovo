"use client";
import { ArrowUpRight, FileSearch, Check } from "lucide-react";
import type { AgentId, AgentStatus, Language, RunEvent } from "@/lib/types";
import { AGENTS } from "./AgentLab";
export function WorkTabs({
  selected,
  onSelect,
  statuses,
  events,
  language,
}: {
  selected: AgentId;
  onSelect: (id: AgentId) => void;
  statuses: Partial<Record<AgentId, AgentStatus>>;
  events: RunEvent[];
  language: Language;
}) {
  const labels = [
    ["Brief", "Proyecto"],
    ["Research", "Fuentes"],
    ["Panel", "Panel"],
    ["Risks", "Riesgos"],
    ["Build", "Mejoras"],
    ["Test", "Prueba"],
  ];
  return (
    <div
      className="work-tabs"
      aria-label={language === "es" ? "Mesas de trabajo" : "Agent workspaces"}
    >
      {AGENTS.map((a, i) => (
        <button
          key={a.id}
          className={`${selected === a.id ? "selected" : ""} ${statuses[a.id] || "waiting"}`}
          style={{ "--agent": a.color } as React.CSSProperties}
          onClick={() => onSelect(a.id)}
          aria-pressed={selected === a.id}
        >
          <span>
            {statuses[a.id] === "done" ? <Check size={15} /> : <i />}
            {a.name}
          </span>
          <strong>{labels[i][language === "es" ? 1 : 0]}</strong>
          <span className="work-tab-count">
            {events.filter((e) => e.agent === a.id && e.kind === "activity")
              .length || "—"}
          </span>
        </button>
      ))}
    </div>
  );
}
export default function WorkNotes({
  events,
  selected,
  language,
  working,
  replay,
}: {
  events: RunEvent[];
  selected: AgentId;
  language: Language;
  working: boolean;
  replay: boolean;
}) {
  const notes = events
    .filter((e) => e.agent === selected && e.kind === "activity")
    .slice(-4);
  if (!notes.length) return null;
  return (
    <section className={`work-notes ${working ? "working" : ""}`}>
      <div className="notes-toolbar">
        <FileSearch size={18} />
        <strong>{language === "es" ? "Notas de trabajo" : "Work notes"}</strong>
        <span>
          {replay
            ? language === "es"
              ? "Grabadas"
              : "Recorded"
            : language === "es"
              ? "Actualizaciones reales"
              : "Actual review updates"}
        </span>
      </div>
      <div className="notes-stack">
        {notes.map((note, i) => (
          <article
            key={`${note.at}-${note.title}-${note.message}`}
            className="work-note"
          >
            <div>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <strong>{note.title}</strong>
              <time>{(note.at / 1000).toFixed(1)}s</time>
            </div>
            {note.url ? (
              <a href={note.url} target="_blank" rel="noreferrer">
                <span>{note.message}</span>
                <ArrowUpRight size={18} />
              </a>
            ) : (
              <p className="note-reveal">{note.message}</p>
            )}
            {note.url && (
              <span className="note-host">{new URL(note.url).hostname}</span>
            )}
          </article>
        ))}
      </div>
      {working && (
        <div className="notes-running">
          <i />
          <span>
            {language === "es"
              ? "Esperando la próxima actualización del agente"
              : "Listening for the agent’s next update"}
          </span>
          <span className="work-cursor" aria-hidden="true">
            ▍
          </span>
        </div>
      )}
    </section>
  );
}
