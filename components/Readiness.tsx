"use client";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import type { Language, Review } from "@/lib/types";
import type { CSSProperties } from "react";
const labels = {
  problem: ["Problem clarity", "Claridad del problema"],
  audience: ["Audience focus", "Enfoque del público"],
  value: ["Proposed value", "Valor propuesto"],
  testability: ["Testability", "Facilidad de prueba"],
};
export default function Readiness({
  review,
  language,
  onSource,
}: {
  review: Review;
  language: Language;
  onSource: (id: string) => void;
}) {
  const score = review.report.readiness,
    es = language === "es";
  if (!score) return null;
  return (
    <section className="readiness-card">
      <div className="readiness-top">
        <div
          className="score-ring"
          style={{ "--score": `${score.total}%` } as CSSProperties}
        >
          <div>
            <strong>{score.total}</strong>
            <span>/ 100</span>
          </div>
        </div>
        <div>
          <span className="detail-label">
            {es ? "Preparación para probar" : "Readiness to test"}
          </span>
          <h3>
            {score.total >= 75
              ? es
                ? "Una base clara para poner a prueba."
                : "A clear starting point to test."
              : score.total >= 50
                ? es
                  ? "Tu idea está tomando forma."
                  : "Your idea is taking shape."
                : es
                  ? "Aclara la base antes de avanzar."
                  : "Sharpen the foundation first."}
          </h3>
          <p>
            {es
              ? "Una evaluación de tu planteamiento, basada en cuatro criterios. No predice éxito ni mide demanda."
              : "An assessment of your brief against four criteria. It does not predict success or measure demand."}
          </p>
        </div>
      </div>
      <details className="score-details">
        <summary>
          <span>{es ? "Ver cómo se calculó" : "See how this was scored"}</span>
          <ChevronDown size={19} />
        </summary>
        <p>
          {es
            ? "Cada criterio recibe de 0 a 4: ausente, vago, parcial, claro o concreto y comprobable. Cada punto aporta 6,25 al total. Sin una cita de tu texto que coincida, el criterio no puede superar 1. Los juicios los realiza la IA; el cálculo y las comprobaciones se hacen en código."
            : "Each criterion is rated 0–4: missing, vague, partial, clear, or concrete and testable. Each point contributes 6.25; the total is rounded to a whole number. Without a matching quote from your text, a criterion is capped at 1. AI makes the judgments; code calculates the total and checks the quotes."}
        </p>
        <div className="score-dimensions">
          {score.dimensions.map((d) => (
            <article key={d.id}>
              <div>
                <h4>{labels[d.id][es ? 1 : 0]}</h4>
                <strong>
                  {d.points} <span>/ 25</span>
                </strong>
              </div>
              <div
                className="dimension-meter"
                role="meter"
                aria-label={labels[d.id][es ? 1 : 0]}
                aria-valuenow={d.points}
                aria-valuemin={0}
                aria-valuemax={25}
              >
                <i style={{ width: `${d.points * 4}%` }} />
              </div>
              <p>{d.reason}</p>
              {d.citations
                .filter(
                  (c, i, all) =>
                    all.findIndex((x) => x.sourceId === c.sourceId) === i,
                )
                .map((c, i) => (
                  <button
                    key={i}
                    className="text-button"
                    onClick={() => onSource(c.sourceId)}
                  >
                    {c.sourceId} · {es ? "Ver la fuente" : "Inspect source"}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
