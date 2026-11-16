"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Radio, ChevronDown } from "lucide-react";
import { AGENT_GUIDES } from "@/lib/agent-guides";
import { AGENTS, AgentDrawing } from "./AgentLab";
import AgentFlow from "./AgentFlow";
import type {
  AgentId,
  AgentStatus,
  AgentTrace,
  Language,
  RunEvent,
  Persona,
} from "@/lib/types";
import type { CSSProperties } from "react";
export default function LiveRun({
  language,
  statuses,
  traces,
  events,
  onOpen,
  personas = [],
  replay = false,
}: {
  language: Language;
  statuses: Partial<Record<AgentId, AgentStatus>>;
  traces: Partial<Record<AgentId, AgentTrace>>;
  events: RunEvent[];
  onOpen: (id: AgentId) => void;
  personas?: Persona[];
  replay?: boolean;
}) {
  const es = language === "es",
    t = (a: string, b: string) => (es ? b : a),
    [selected, setSelected] = useState<AgentId>("mira"),
    [follow, setFollow] = useState(true),
    feed = useRef<HTMLDivElement>(null),
    stick = useRef(true),
    complete = AGENTS.every((a) => statuses[a.id] === "done");
  useEffect(() => {
    if (!follow) return;
    const latest = events
      .filter((e) => !Number.isInteger(e.persona) && e.status === "running")
      .at(-1);
    if (latest) setSelected(latest.agent);
  }, [events.length, follow]);
  useEffect(() => {
    if (stick.current && feed.current)
      feed.current.scrollTop = feed.current.scrollHeight;
  }, [events.length]);
  const a = AGENTS.find((a) => a.id === selected)!,
    trace = traces[selected],
    active = AGENTS.filter((a) => statuses[a.id] === "running");
  return (
    <div className="agent-workspace">
      <div className="workspace-toolbar">
        <div>
          {complete ? <Check size={18} /> : <Radio size={18} />}
          <span>
            {replay
              ? t(
                  "Recorded replay · no AI calls",
                  "Reproducción guardada · sin llamadas a IA",
                )
              : complete
                ? t(
                    "All six handoffs complete",
                    "Las seis entregas están completas",
                  )
                : active.length
                  ? `${active.map((a) => a.name).join(" + ")} ${t("working", "trabajando")}`
                  : t("Connecting to your team", "Conectando con tu equipo")}
          </span>
        </div>
        <span>
          {t(
            "Select any agent to inspect its work.",
            "Selecciona un agente para ver su trabajo.",
          )}
        </span>
      </div>
      <AgentFlow
        language={language}
        selected={selected}
        onSelect={(id) => {
          setSelected(id);
          setFollow(false);
        }}
        statuses={statuses}
        events={events}
      />
      <div className="live-workbench">
        <div
          className="live-center"
          style={{ "--agent": a.color } as CSSProperties}
        >
          <div className="live-agent-heading">
            <AgentDrawing id={a.id} />
            <div>
              <span>
                {statuses[selected] === "done"
                  ? t("Completed handoff", "Entrega completada")
                  : statuses[selected] === "running"
                    ? t("Working now", "Trabajando ahora")
                    : t("Upcoming step", "Siguiente paso")}
              </span>
              <h2>{a.name}</h2>
            </div>
            {!complete && (
              <button
                className={`follow-button ${follow ? "following" : ""}`}
                aria-pressed={follow}
                onClick={() => setFollow((v) => !v)}
              >
                <Radio size={16} />
                {follow
                  ? t(
                      replay ? "Following replay" : "Following live",
                      replay ? "Siguiendo reproducción" : "Siguiendo en vivo",
                    )
                  : t(
                      replay ? "Follow replay" : "Follow live",
                      replay ? "Seguir reproducción" : "Seguir en vivo",
                    )}
              </button>
            )}
          </div>
          <p className="live-job">{a.job[es ? 1 : 0]}</p>
          <div className="live-responsibilities">
            <span className="detail-label">
              {t("What this step covers", "Qué incluye este paso")}
            </span>
            <ol>
              {AGENT_GUIDES[selected].steps[es ? 1 : 0].map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          {selected === "juno" && (
            <div className="live-personas">
              {[0, 1, 2].map((i) => {
                const event = events.filter((e) => e.persona === i).at(-1),
                  p = personas[i];
                return (
                  <div key={i}>
                    <strong>
                      {p?.name || `${t("Perspective", "Perspectiva")} ${i + 1}`}
                    </strong>
                    <span>
                      {event?.status === "done"
                        ? t("Returned", "Completado")
                        : event?.status === "running"
                          ? t("Evaluating…", "Evaluando…")
                          : t("Waiting", "En espera")}
                    </span>
                    {p && <p>{p.reaction}</p>}
                    {event?.status === "running" && (
                      <span className="typing-indicator" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {trace ? (
            <div className="live-output">
              <span className="detail-label">
                {t("What it found", "Lo que encontró")}
              </span>
              <p>{trace.output}</p>
              {trace.details.slice(0, 2).map((d, i) => (
                <div key={i}>
                  <strong>{d.title}</strong>
                  <p>{d.detail}</p>
                </div>
              ))}
              <button className="text-button" onClick={() => onOpen(selected)}>
                {t("Inspect the full handoff", "Ver la entrega completa")}
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div className="live-await">
              <span
                className={`signal-line ${statuses[selected] === "running" ? "is-working" : ""}`}
              />
              <h3>
                {statuses[selected] === "running"
                  ? t(
                      "Reading, checking, connecting.",
                      "Leyendo, comprobando, conectando.",
                    )
                  : t(
                      "A handoff is on its way.",
                      "La siguiente entrega está en camino.",
                    )}
              </h3>
              <p>
                {statuses[selected] === "running"
                  ? t(
                      "The completed result will appear here. You can explore the other agents while this one works.",
                      "El resultado aparecerá aquí. Puedes explorar los otros agentes mientras este trabaja.",
                    )
                  : t(
                      "This step starts when the earlier agents finish. Select a completed step to see what has already been found.",
                      "Este paso empieza cuando terminan los agentes anteriores. Abre un paso completado para ver sus hallazgos.",
                    )}
              </p>
            </div>
          )}
        </div>
        <aside className="live-feed">
          <div className="feed-heading">
            <span className={complete ? "completed-label" : "live-dot"}>
              {complete
                ? t("Activity record", "Registro de actividad")
                : replay
                  ? t("Recorded activity", "Actividad grabada")
                  : t("Live activity", "Actividad en vivo")}
            </span>
            <span>
              {t(
                "Actual starts & completed results",
                "Inicios y resultados reales",
              )}
            </span>
          </div>
          <div
            ref={feed}
            onScroll={() => {
              const el = feed.current;
              if (el)
                stick.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 45;
            }}
            className="feed-scroll"
            role="log"
            aria-live={complete || replay ? "off" : "polite"}
            aria-label={t("Agent activity log", "Registro de actividad")}
          >
            {events.length === 0 ? (
              <p>
                {t(
                  "Your project is being sent to Mira.",
                  "Tu proyecto se está enviando a Mira.",
                )}
              </p>
            ) : (
              events.map((e, i) => (
                <div className={`feed-event ${e.status}`} key={i}>
                  <time>{(e.at / 1000).toFixed(1)}s</time>
                  <div>
                    <strong>
                      {e.persona === undefined
                        ? AGENTS.find((a) => a.id === e.agent)?.name
                        : personas[e.persona]?.name ||
                          `${t("Perspective", "Perspectiva")} ${e.persona + 1}`}
                    </strong>
                    <span>
                      {e.status === "running"
                        ? t("started", "inició")
                        : e.status === "done"
                          ? t("finished", "terminó")
                          : t("interrupted", "interrumpido")}
                    </span>
                    <p>{e.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            className="feed-jump"
            onClick={() => {
              stick.current = true;
              feed.current?.scrollTo({
                top: feed.current.scrollHeight,
                behavior: "smooth",
              });
            }}
          >
            {t("Latest activity", "Actividad más reciente")}
            <ChevronDown size={16} />
          </button>
        </aside>
      </div>
    </div>
  );
}
