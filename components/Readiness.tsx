"use client";
import { ArrowUpRight, Check, Minus, ChevronDown } from "lucide-react";
import { CHECK_LABELS } from "@/lib/scoring";
import type { Language, Review } from "@/lib/types";
import type { CSSProperties } from "react";
const labels = {
  problem: ["Problem", "Problema"],
  audience: ["Audience", "Público"],
  value: ["Value", "Valor"],
  testability: ["Test plan", "Plan de prueba"],
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
  const tone =
    score.total < 25 ? "risk" : score.total < 75 ? "uncertain" : "action";
  const verdict =
    score.total < 25
      ? ["Not ready to test yet", "Aún no está lista para probar"]
      : score.total < 50
        ? ["Major gaps to resolve", "Faltan detalles esenciales"]
        : score.total < 75
          ? ["A workable brief with gaps", "Una base con puntos pendientes"]
          : [
              "A well-specified testable brief",
              "Una propuesta concreta y comprobable",
            ];
  return (
    <section
      className={`score-board tone-${tone}`}
      aria-label={es ? "Puntuación y criterios" : "Score and criteria"}
    >
      <div className="score-verdict">
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
          <span className="report-eyebrow">
            {es ? "Preparación para probar" : "Readiness to test"}
          </span>
          <h2>{verdict[es ? 1 : 0]}</h2>
          <p>
            {es
              ? "La calidad del planteamiento, no una predicción de éxito ni una prueba de demanda."
              : "How well the brief is specified—not a prediction of success or proof of demand."}
          </p>
          <span className="status-tag">
            {score.version === 2
              ? es
                ? `${score.dimensions.reduce((n, d) => n + d.rating, 0)} de 16 criterios respaldados`
                : `${score.dimensions.reduce((n, d) => n + d.rating, 0)} of 16 criteria supported`
              : es
                ? "Rúbrica anterior · informe guardado"
                : "Earlier rubric · saved report"}
          </span>
        </div>
      </div>
      <div className="score-breakdown">
        {score.dimensions.map((d) => (
          <details key={d.id} className="score-factor">
            <summary>
              <span>{labels[d.id][es ? 1 : 0]}</span>
              <strong>
                {d.points}
                <small> / 25</small>
              </strong>
              <ChevronDown size={17} />
              <span className="factor-track">
                <i style={{ width: `${d.points * 4}%` }} />
              </span>
            </summary>
            <p>{d.reason}</p>
            {d.checks && (
              <ul className="criteria-list">
                {d.checks.map((c) => (
                  <li className={c.met ? "met" : "missing"} key={c.id}>
                    {c.met ? <Check size={17} /> : <Minus size={17} />}
                    <span>
                      {CHECK_LABELS[c.id]?.[es ? 1 : 0] || c.id}
                      <small>
                        {c.met
                          ? es
                            ? "Respaldado por tu texto"
                            : "Supported in your brief"
                          : es
                            ? "No establecido"
                            : "Not established"}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {d.nextStep && (
              <div className="action-inset">
                <strong>
                  {es
                    ? "Para mejorar este criterio"
                    : "To strengthen this area"}
                </strong>
                <p>{d.nextStep}</p>
              </div>
            )}
            {[...new Set(d.citations.map((c) => c.sourceId))].map((id) => (
              <button
                key={id}
                className="text-button"
                onClick={() => onSource(id)}
              >
                {es ? "Ver evidencia" : "Inspect evidence"} · {id}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </details>
        ))}
      </div>
      <details className="rubric-note">
        <summary>
          {es
            ? "Cómo se calcula · sin puntuación mínima"
            : "How scoring works · no minimum score"}
        </summary>
        <p>
          {score.version === 2
            ? es
              ? "Cada uno de los 16 criterios necesita una afirmación explícita y una cita coincidente de tu texto. Cada criterio aporta 6,25 puntos; no hay puntos por entusiasmo ni respuestas simuladas. La IA juzga si el texto cumple el criterio; el código verifica las citas, elimina duplicados y suma. Una cita coincidente no demuestra que la afirmación sea verdadera."
              : "Each of 16 criteria needs an explicit detail and a matching quote from your brief. Each earns 6.25 points; enthusiasm and simulated reactions earn none. AI judges whether the detail meets the criterion; code verifies quotes, rejects duplicates and calculates the total. A quote match does not prove the claim is true."
            : es
              ? "Este informe conserva su puntuación original de la rúbrica anterior. Un análisis nuevo utiliza los 16 criterios estrictos."
              : "This saved report retains its original score under the earlier rubric. New reviews use the stricter 16-criterion rubric."}
        </p>
      </details>
    </section>
  );
}
