"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Radio, ChevronDown } from "lucide-react";
import { AGENT_GUIDES } from "@/lib/agent-guides";
import { AGENTS, AgentDrawing } from "./AgentLab";
import AgentFlow from "./AgentFlow";
import WorkNotes, { WorkTabs } from "./WorkNotes";
import { PANEL_SIZE, PANEL_LABELS } from "@/lib/panel";
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
  panelCount = PANEL_SIZE,
}: {
  language: Language;
  statuses: Partial<Record<AgentId, AgentStatus>>;
  traces: Partial<Record<AgentId, AgentTrace>>;
  events: RunEvent[];
  onOpen: (id: AgentId) => void;
  personas?: Persona[];
  replay?: boolean;
  panelCount?: number;
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
  const completedCount = AGENTS.filter((a) => statuses[a.id] === "done").length;
  const latestFinding = [...events]
    .reverse()
    .find((e) => e.status === "done" && e.persona === undefined);
  const stageTitles: Record<AgentId, [string, string]> = {
    mira: ["First, understand the idea.", "Primero, entender la idea."],
    sora: [
      "Find the evidence. Explore the audience.",
      "Buscar evidencia. Explorar el público.",
    ],
    juno: [
      "Find the evidence. Explore the audience.",
      "Buscar evidencia. Explorar el público.",
    ],
    rook: [
      "Put the assumptions under pressure.",
      "Poner a prueba las suposiciones.",
    ],
    leo: [
      "Turn findings into a better next version.",
      "Convertir hallazgos en una mejor versión.",
    ],
    vera: [
      "Make a plan to ask real people.",
      "Preparar una prueba con personas reales.",
    ],
  };
  return (
    <div className="agent-workspace">
      <section
        className={`run-story ${complete ? "finished" : ""}`}
        aria-label={t("Review progress", "Progreso del análisis")}
      >
        <div className="run-story-heading">
          <div>
            <span className="detail-label">
              {replay
                ? t("Recorded journey", "Recorrido grabado")
                : t(
                    "From idea to your next move",
                    "De la idea al siguiente paso",
                  )}
            </span>
            <h2>
              {complete
                ? t(
                    "Six perspectives. Ready for you.",
                    "Seis perspectivas. Listas para ti.",
                  )
                : active[0]
                  ? stageTitles[active[0].id][es ? 1 : 0]
                  : t(
                      "Connecting your brief to the team.",
                      "Conectando tu texto con el equipo.",
                    )}
            </h2>
          </div>
          <span className="run-count">
            <strong>{completedCount}</strong> / 6{" "}
            <span>{t("finished", "completados")}</span>
          </span>
        </div>
        <div
          className="milestone-track"
          aria-label={t(
            `${completedCount} of 6 agents complete`,
            `${completedCount} de 6 agentes completados`,
          )}
        >
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              style={{ "--agent": agent.color } as CSSProperties}
              className={statuses[agent.id] || "waiting"}
              onClick={() => {
                setSelected(agent.id);
                setFollow(false);
              }}
              aria-pressed={selected === agent.id}
            >
              <span className="milestone-bar" />
              <span>{agent.name}</span>
              {statuses[agent.id] === "done" && <Check size={15} />}
            </button>
          ))}
        </div>
        <p className="run-story-note">
          {complete
            ? t(
                replay
                  ? "Inspect any completed result below, or replay the handoffs at your own pace."
                  : "Open your review above, or inspect any result below. You can replay this process later without using AI.",
                replay
                  ? "Examina un resultado abajo o reproduce las entregas a tu ritmo."
                  : "Abre tu análisis arriba o examina un resultado abajo. Puedes reproducir este proceso después sin usar IA.",
              )
            : t(
                "Progress advances when an agent actually returns a result. Research and the simulated panel run together.",
                "El progreso avanza cuando un agente devuelve un resultado. La investigación y el panel simulado trabajan en paralelo.",
              )}
        </p>
      </section>
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
        panelCount={panelCount}
      />
      {latestFinding && (
        <div
          className="latest-handoff"
          key={`${latestFinding.agent}-${latestFinding.at}`}
        >
          <span>
            {t("Latest handoff", "Última entrega")} ·{" "}
            {AGENTS.find((a) => a.id === latestFinding.agent)?.name}
          </span>
          <p>{latestFinding.message}</p>
          <button
            className="text-button"
            onClick={() => onOpen(latestFinding.agent)}
          >
            {t("Read the finding", "Leer el hallazgo")}
            <ArrowRight size={18} />
          </button>
        </div>
      )}
      <WorkTabs
        selected={selected}
        onSelect={(id) => {
          setSelected(id);
          setFollow(false);
        }}
        statuses={statuses}
        events={events}
        language={language}
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
                    : statuses[selected] === "error"
                      ? t("Interrupted", "Interrumpido")
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
          <WorkNotes
            events={events}
            selected={selected}
            language={language}
            working={statuses[selected] === "running"}
            replay={replay}
          />

          <details className="live-responsibilities">
            <summary>
              {t("What this agent checks", "Qué comprueba este agente")}
            </summary>
            <ol>
              {AGENT_GUIDES[selected].steps[es ? 1 : 0].map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </details>
          {selected === "juno" && (
            <div className="live-personas">
              {Array.from({ length: panelCount }, (_, i) => i).map((i) => {
                const event = events.filter((e) => e.persona === i).at(-1),
                  p = personas[i],
                  profile =
                    event?.profile ||
                    events.find((e) => e.persona === i && e.profile)?.profile;
                return (
                  <div key={i}>
                    <strong>
                      {p?.name ||
                        profile?.name ||
                        `${t("Perspective", "Perspectiva")} ${i + 1}`}
                    </strong>
                    <span>
                      {event?.status === "done"
                        ? t("Returned", "Completado")
                        : event?.status === "running"
                          ? t("Evaluating…", "Evaluando…")
                          : event?.status === "error"
                            ? t("Unavailable", "No disponible")
                            : t("Waiting", "En espera")}
                    </span>
                    {profile && (
                      <p className="live-profile">
                        {PANEL_LABELS[profile.lens][es ? 1 : 0]} ·{" "}
                        {profile.ageRange}
                        <br />
                        {profile.context}
                      </p>
                    )}
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
                  : statuses[selected] === "error"
                    ? t(
                        "This step did not finish.",
                        "Este paso no se completó.",
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
                  : statuses[selected] === "error"
                    ? t(
                        "No result was invented. Check the review notice for the reason and your available next step.",
                        "No se inventó un resultado. Consulta el aviso del análisis para conocer el motivo y el siguiente paso disponible.",
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
                      {e.kind === "activity"
                        ? e.title
                        : e.status === "running"
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
