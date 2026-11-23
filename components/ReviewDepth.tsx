"use client";
import type { Concern, Language, Report } from "@/lib/types";
export function ConcernPriority({
  concern,
  language,
}: {
  concern: Concern;
  language: Language;
}) {
  if (!concern.priority) return null;
  const labels = {
    critical: ["Test first", "Probar primero"],
    important: ["Important", "Importante"],
    minor: ["Refinement", "Ajuste"],
  };
  const categories = {
    demand: ["Demand", "Demanda"],
    adoption: ["Adoption", "Adopción"],
    experience: ["Experience", "Experiencia"],
    feasibility: ["Feasibility", "Viabilidad"],
    trust: ["Trust", "Confianza"],
    economics: ["Economics", "Costes y valor"],
  };
  return (
    <span className={`concern-priority ${concern.priority}`}>
      {labels[concern.priority][language === "es" ? 1 : 0]}
      {concern.category &&
        ` · ${categories[concern.category][language === "es" ? 1 : 0]}`}
    </span>
  );
}
export function DecisionFrame({
  report,
  language,
}: {
  report: Report;
  language: Language;
}) {
  const frame = report.brief.decisionFrame,
    es = language === "es";
  if (!frame) return null;
  return (
    <section className="decision-frame">
      <div>
        <span className="detail-label">
          {es
            ? "La suposición que más importa"
            : "The assumption that matters most"}
        </span>
        <h3>{frame.keyAssumption}</h3>
        <p>
          {es
            ? "Si esto no se sostiene, conviene cambiar la idea antes de añadir funciones."
            : "If this doesn’t hold, the idea may need to change before you add more features."}
        </p>
      </div>
      <div className="decision-facts">
        {[
          [
            es
              ? "Lo que la persona intenta lograr"
              : "What the person is trying to do",
            frame.job,
          ],
          [
            es ? "Lo que usa hoy" : "What they use today",
            frame.currentAlternative,
          ],
          [
            es ? "El momento de valor" : "The first moment of value",
            frame.successMoment,
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <strong>{label}</strong>
            <p>{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
export function ResearchAudit({
  report,
  language,
}: {
  report: Report;
  language: Language;
}) {
  const audit = report.market.audit,
    es = language === "es";
  if (!audit) return null;
  return (
    <section className="research-audit">
      <h3>
        {es ? "Qué respaldó este análisis" : "What supported this review"}
      </h3>
      <div className="audit-counts">
        {[
          [
            audit.retrievedSources,
            es ? "fuentes recuperadas" : "sources retrieved",
          ],
          [audit.citedSources, es ? "fuentes citadas" : "sources cited"],
          [audit.sourceDomains, es ? "sitios citados" : "sites cited"],
          [
            audit.discardedFindings,
            es
              ? "hallazgos sin respaldo descartados"
              : "unsupported findings removed",
          ],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p>
        {es
          ? "Las citas coinciden con extractos recuperados. Esto no demuestra que una fuente sea correcta, independiente o que exista demanda. La búsqueda es limitada; consulta también lo que falta comprobar."
          : "Citations match retrieved excerpts. This does not establish that a source is correct, independent, or proof of demand. This is a bounded search; review the open questions too."}
      </p>
    </section>
  );
}
export function AlternativeDirections({
  report,
  language,
}: {
  report: Report;
  language: Language;
}) {
  if (!report.directions?.length) return null;
  const es = language === "es";
  return (
    <section className="alternative-directions">
      <h2>
        {es
          ? "¿Y si la mejor versión fuera más sencilla?"
          : "What if the better version were simpler?"}
      </h2>
      <p>
        {es
          ? "Direcciones propuestas a partir de los riesgos. Pruébalas antes de comprometerte a un cambio."
          : "Alternative directions based on the risks. Test these proposals before committing to a pivot."}
      </p>
      <div className="two-columns">
        {report.directions.map((d) => (
          <article className="direction-card" key={d.title}>
            <span className="detail-label">
              {es ? "Dirección propuesta" : "Proposed direction"}
            </span>
            <h3>{d.title}</h3>
            <p>{d.approach}</p>
            <div className="action-inset"><strong>{es ? "La prueba más pequeña" : "Smallest test"}</strong><p>{d.test}</p></div>
            <details className="card-disclosure">
            <summary>{es ? "Público, razonamiento y sacrificios" : "Audience, reasoning & tradeoffs"}</summary>
            <dl>
              {[
                [es ? "Para quién" : "For whom", d.audience],
                [es ? "Por qué podría funcionar" : "Why it might help", d.why],
                [es ? "Lo que sacrificas" : "The tradeoff", d.tradeoff],
              ].map(([label, text]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
            <div className="direction-trail">
              <strong>{es ? "Responde a:" : "Responds to:"}</strong>
              {d.findingIds.map((id) => (
                <span key={id}>
                  {id} · {report.critique.find((c) => c.id === id)?.title}
                </span>
              ))}
            </div>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
