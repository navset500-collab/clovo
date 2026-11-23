"use client";
import { useEffect, useState } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";
import LiveRun from "./LiveRun";
import type { AgentId, AgentStatus, Language, Report } from "@/lib/types";
export default function AgentReplay({
  report,
  language,
  onOpen,
}: {
  report: Report;
  language: Language;
  onOpen: (id: AgentId) => void;
}) {
  const events = report.runEvents || [],
    [position, setPosition] = useState(events.length),
    [playing, setPlaying] = useState(false),
    [pace, setPace] = useState<"quick" | "guided">("guided");
  const es = language === "es",
    visible = events.slice(0, position),
    replaying = position < events.length;
  useEffect(() => {
    if (!playing) return;
    if (position >= events.length) {
      setPlaying(false);
      return;
    }
    const delay = pace === "guided" ? 180000 / Math.max(1, events.length) : 900;
    const timer = setTimeout(() => setPosition((p) => p + 1), delay);
    return () => clearTimeout(timer);
  }, [playing, position, events.length, pace]);
  const statuses: Partial<Record<AgentId, AgentStatus>> = {};
  visible
    .filter((e) => e.persona === undefined && e.kind !== "activity")
    .forEach((e) => {
      statuses[e.agent] = e.status;
    });
  const traces = Object.fromEntries(
    Object.entries(report.traces).filter(
      ([id]) => statuses[id as AgentId] === "done",
    ),
  );
  return (
    <>
      <div className="replay-controls">
        <div>
          <strong>
            {es ? "Vuelve a ver cada paso" : "Watch each handoff at your pace"}
          </strong>
          <p>
            {es
              ? "Reproduce los eventos guardados. No vuelve a ejecutar la IA ni consume tu límite."
              : "Replay the recorded events. It does not rerun the AI or use your allowance."}
          </p>
        </div>
        <div className="row-actions">
          <label className="replay-pace">
            {es ? "Velocidad de lectura" : "Reading pace"}
            <select value={pace} onChange={e => setPace(e.target.value as "quick" | "guided")}>
              <option value="guided">{es ? "Recorrido de 3 minutos" : "3-minute guided replay"}</option>
              <option value="quick">{es ? "Recorrido rápido" : "Quick replay"}</option>
            </select>
          </label>
          <button
            className="secondary"
            disabled={!events.length}
            onClick={() => {
              if (position >= events.length) setPosition(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}{" "}
            {playing ? (es ? "Pausar" : "Pause") : es ? "Reproducir" : "Replay"}
          </button>
          <button
            className="secondary"
            disabled={!replaying}
            onClick={() => {
              setPlaying(false);
              setPosition((p) => Math.min(events.length, p + 1));
            }}
          >
            <SkipForward size={17} />
            {es ? "Siguiente evento" : "Next event"}
          </button>
          {replaying && (
            <button
              className="text-button"
              onClick={() => {
                setPlaying(false);
                setPosition(events.length);
              }}
            >
              <RotateCcw size={16} />
              {es ? "Ver todo" : "Show all"}
            </button>
          )}
        </div>
      </div>
      <div className="replay-progress" aria-label={es ? "Progreso de la reproducción" : "Replay progress"}>
        <span>{es ? "Eventos grabados" : "Recorded events"}: {position} / {events.length}</span>
        <progress max={Math.max(1, events.length)} value={position} />
        <span>{es ? "El ritmo de lectura no representa el tiempo de cálculo." : "Reading pace is separate from the original analysis time."}</span>
      </div>
      <LiveRun
        language={language}
        statuses={statuses}
        traces={traces}
        events={visible}
        personas={
          Array.from(
            { length: report.panelSize || report.personas.length },
            (_, i) =>
              report.personas.find(
                (p, index) =>
                  (p.panelIndex ?? index) === i &&
                  visible.some((e) => e.persona === i && e.status === "done"),
              ),
          ) as Report["personas"]
        }
        onOpen={onOpen}
        replay={true}
        panelCount={report.panelSize || report.personas.length}
      />
    </>
  );
}
