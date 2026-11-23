"use client";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Lightbulb,
  AlertTriangle,
  Search,
  FlaskConical,
  Users,
  Target,
} from "lucide-react";
import type { Review, Language, Concern, Report } from "@/lib/types";
import Readiness from "./Readiness";
import { EvidenceBadges } from "./Evidence";
import {
  ConcernPriority,
  AlternativeDirections,
  ResearchAudit,
} from "./ReviewDepth";
import { PANEL_LABELS } from "@/lib/panel";
type Props = {
  review: Review;
  language: Language;
  onSource: (id: string) => void;
  onTab: (id: string) => void;
};
function Heading({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="view-heading">
      <span className="report-eyebrow">{step}</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
export function ReportLegend({ language }: { language: Language }) {
  const es = language === "es";
  return (
    <div className="report-legend" aria-label={es ? "Leyenda" : "Color key"}>
      {[
        ["evidence", "Source evidence", "Fuentes"],
        ["risk", "Risk to test", "Riesgo"],
        ["uncertain", "Unverified", "Sin verificar"],
        ["simulation", "AI simulation", "Simulación"],
        ["action", "Next action", "Acción"],
      ].map(([tone, en, sp]) => (
        <span className={`tone-${tone}`} key={tone}>
          <i />
          {es ? sp : en}
        </span>
      ))}
    </div>
  );
}
function RiskCard({
  c,
  language,
  onSource,
  index,
}: {
  c: Concern;
  language: Language;
  onSource: (id: string) => void;
  index: number;
}) {
  const es = language === "es";
  return (
    <article
      className={`insight-card tone-${c.priority === "critical" ? "risk" : "uncertain"}`}
    >
      <div className="insight-top">
        <span className="insight-index">
          {String(index + 1).padStart(2, "0")}
        </span>
        <ConcernPriority concern={c} language={language} />
      </div>
      <h3>{c.title}</h3>
      <div className="insight-field">
        <strong>{es ? "Qué podría fallar" : "What could fail"}</strong>
        <p>{c.risk}</p>
      </div>
      <div className="action-inset">
        <FlaskConical size={20} />
        <div>
          <strong>
            {es ? "La prueba más pequeña" : "Smallest useful test"}
          </strong>
          <p>{c.test}</p>
        </div>
      </div>
      <details className="card-disclosure">
        <summary>
          {es
            ? "Evidencia y otra interpretación"
            : "Evidence & another interpretation"}
          <ChevronDown size={17} />
        </summary>
        <EvidenceBadges concern={c} language={language} onOpen={onSource} />
        <p>{c.evidence}</p>
        {c.counterEvidence && (
          <div className="insight-field">
            <strong>
              {es
                ? "Qué debilitaría esta crítica"
                : "What would weaken this criticism"}
            </strong>
            <p>{c.counterEvidence}</p>
          </div>
        )}
      </details>
    </article>
  );
}
export function ReportOverview({ review, language, onSource, onTab }: Props) {
  const r = review.report,
    es = language === "es",
    first = r.improvements[0];
  return (
    <>
      <div className="review-snapshot">
        <div className="snapshot-concept">
          <span className="report-eyebrow">
            {es ? "01 · El punto de partida" : "01 · Your starting point"}
          </span>
          <h2>{r.brief.product}</h2>
          <details className="card-disclosure">
            <summary>
              {es ? "Ver el resumen completo" : "Read the full summary"}
              <ChevronDown size={17} />
            </summary>
            <p>{r.summary}</p>
            <p>{r.brief.problem}</p>
          </details>
        </div>
        <button
          className="evidence-status tone-evidence"
          onClick={() => onTab("demand")}
        >
          <Search size={23} />
          <strong>
            {r.market.audit?.citedSources ?? r.market.sources.length}
          </strong>
          <span>{es ? "fuentes citadas" : "sources cited"}</span>
          <b>
            {r.market.sources.length
              ? es
                ? "Revisa qué respaldan"
                : "Check what they support"
              : es
                ? "Demanda sin verificar"
                : "Demand remains unverified"}
          </b>
          <ArrowUpRight size={19} />
        </button>
      </div>
      <div className="overview-decision">
        <Readiness review={review} language={language} onSource={onSource} />
        <aside className="next-move tone-action">
          <span className="report-eyebrow">
            <Target size={18} />
            {es ? "Tu primera acción" : "Your first move"}
          </span>
          <h2>
            {first?.title ||
              (es ? "Define una prueba pequeña" : "Define one small test")}
          </h2>
          <p>{first?.firstStep || first?.change || r.experiment.task}</p>
          <div className="next-move-check">
            <strong>
              {es ? "Busca este resultado" : "Look for this outcome"}
            </strong>
            <p>{first?.check || r.experiment.successSignal}</p>
          </div>
          <button className="primary" onClick={() => onTab("build")}>
            {es ? "Abrir mi plan de acción" : "Open my action plan"}
            <ArrowRight size={19} />
          </button>
        </aside>
      </div>
      <div className="review-balance">
        <article className="insight-card tone-action">
          <span className="report-eyebrow">
            <Lightbulb size={19} />
            {es ? "Lo que conviene conservar" : "Worth keeping"}
          </span>
          <h3>{es ? "Fortalezas propuestas" : "Potential strengths"}</h3>
          <ul className="insight-list">
            {r.brief.strengths.map((s, i) => (
              <li key={i}>
                <Check size={18} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="insight-card tone-uncertain">
          <span className="report-eyebrow">
            <AlertTriangle size={19} />
            {es ? "No lo des por hecho" : "Do not assume this"}
          </span>
          <h3>{es ? "La suposición principal" : "The pivotal assumption"}</h3>
          <p>
            {r.brief.decisionFrame?.keyAssumption || r.brief.assumptions[0]}
          </p>
          <details className="card-disclosure">
            <summary>
              {es ? "Ver todas las suposiciones" : "See all assumptions"}
              <ChevronDown size={17} />
            </summary>
            <ul>
              {r.brief.assumptions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </details>
        </article>
      </div>
      <Heading
        step={es ? "02 · Antes de construir más" : "02 · Before building more"}
        title={
          es
            ? "Los riesgos que merecen una prueba."
            : "The risks worth testing."
        }
        body={
          es
            ? "Son críticas que comprobar, no veredictos. Cada una incluye una acción y su respaldo."
            : "These are concerns to investigate, not verdicts. Each comes with a test and an evidence trail."
        }
      />
      <div className="risk-grid">
        {r.critique.map((c, i) => (
          <RiskCard
            key={c.id}
            c={c}
            index={i}
            language={language}
            onSource={onSource}
          />
        ))}
      </div>
      <details className="review-method-details">
        <summary>
          {es ? "Qué se revisó y qué no" : "What was reviewed—and what wasn’t"}
          <ChevronDown size={18} />
        </summary>
        <ul>
          {r.brief.evidence.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
        <p>
          {es
            ? "Los enlaces son contexto. Los agentes no navegaron por tu aplicación ni observaron personas usando el producto."
            : "Links provide context. The agents did not click through your application or observe people using the product."}
        </p>
      </details>
    </>
  );
}
function Citations({
  item,
  r,
  language,
}: {
  item: {
    citations?: { sourceId: string; quote: string }[];
    sourceIds: string[];
  };
  r: Report;
  language: Language;
}) {
  const es = language === "es";
  return (
    <details className="card-disclosure">
      <summary>
        {es ? "Inspeccionar las fuentes" : "Inspect source support"}
        <ChevronDown size={17} />
      </summary>
      {item.citations?.map((c, i) => (
        <blockquote key={i}>
          {c.quote}
          <cite>{c.sourceId}</cite>
        </blockquote>
      ))}
      {item.sourceIds.map((id) => {
        const s = r.market.sources.find((s) => s.id === id);
        return s ? (
          <a
            className="source-link"
            key={id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
          >
            {s.title}
            <ArrowUpRight size={16} />
          </a>
        ) : null;
      })}
    </details>
  );
}
export function ReportResearch({ review, language, onTab }: Props) {
  const r = review.report,
    es = language === "es";
  return (
    <>
      <Heading
        step={es ? "02 · Comprueba el respaldo" : "02 · Check the support"}
        title={
          es ? "Lo que sabemos. Lo que falta." : "What we know. What we don’t."
        }
        body={
          es
            ? "Una fuente sobre un competidor no demuestra demanda de tu idea."
            : "Evidence about a competitor does not establish demand for your idea."
        }
      />
      <div
        className={`research-verdict tone-${r.market.sources.length ? "evidence" : "uncertain"}`}
      >
        <Search size={25} />
        <div>
          <strong>
            {r.market.sources.length
              ? es
                ? "Se recuperaron fuentes públicas"
                : "Public sources were retrieved"
              : es
                ? "No hay evidencia web disponible en este análisis"
                : "No live web evidence in this review"}
          </strong>
          <p>
            {r.market.sources.length
              ? r.market.summary
              : es
                ? "No podemos confirmar demanda ni competencia con este análisis. Las sugerencias siguen siendo hipótesis."
                : "This review cannot confirm demand or competition. Its suggestions remain hypotheses."}
          </p>
          <details className="card-disclosure">
            <summary>
              {es ? "Contexto de la investigación" : "Research context"}
            </summary>
            <p>{r.market.summary}</p>
            <p>{r.market.searchNotice}</p>
          </details>
        </div>
      </div>
      <ResearchAudit report={r} language={language} />
      <div className="risk-grid">
        {r.market.signals.map((s, i) => (
          <article className="insight-card tone-evidence" key={i}>
            <span className="status-tag">
              {s.evidenceType === "research"
                ? es
                  ? "Investigación publicada"
                  : "Published research"
                : s.evidenceType === "provider-claim"
                  ? es
                    ? "Afirmación del proveedor"
                    : "Vendor claim"
                  : es
                    ? "Experiencia relatada"
                    : "Reported experience"}
            </span>
            <h3>{s.title}</h3>
            <p>{s.detail}</p>
            <div className="action-inset">
              <div>
                <strong>
                  {es
                    ? "Qué significa para tu idea"
                    : "What this means for your idea"}
                </strong>
                <p>{s.relevance}</p>
              </div>
            </div>
            <Citations item={s} r={r} language={language} />
          </article>
        ))}
      </div>
      {!!r.market.alternatives.length && (
        <>
          <Heading
            step={es ? "Alternativas actuales" : "Existing alternatives"}
            title={
              es
                ? "La competencia por la atención."
                : "What you’re competing with."
            }
            body={
              es
                ? "Compara el trabajo que resuelven, no solo las funciones."
                : "Compare the job they solve, not just their feature lists."
            }
          />
          <div className="competitor-grid">
            {r.market.alternatives.map((a, i) => (
              <article className="insight-card tone-evidence" key={i}>
                <h3>{a.name}</h3>
                <p>{a.difference}</p>
                <dl className="compact-facts">
                  <div>
                    <dt>{es ? "Para quién" : "For whom"}</dt>
                    <dd>{a.targetUser}</dd>
                  </div>
                  <div>
                    <dt>
                      {es
                        ? "Por qué cuesta cambiar · hipótesis"
                        : "Why switching is hard · hypothesis"}
                    </dt>
                    <dd>{a.switchingCost}</dd>
                  </div>
                  <div>
                    <dt>
                      {es
                        ? "Posible oportunidad · inferencia"
                        : "Possible opening · inference"}
                    </dt>
                    <dd>{a.opportunity}</dd>
                  </div>
                </dl>
                <Citations item={a} r={r} language={language} />
              </article>
            ))}
          </div>
        </>
      )}
      <article className="insight-card tone-uncertain">
        <h3>
          {es ? "Qué necesitas averiguar ahora" : "What to find out next"}
        </h3>
        <ol className="numbered-actions">
          {r.market.unknowns.map((u, i) => (
            <li key={i}>{u}</li>
          ))}
        </ol>
        <button className="primary" onClick={() => onTab("humans")}>
          {es
            ? "Preparar una prueba con personas"
            : "Set up a test with people"}
          <ArrowRight size={18} />
        </button>
      </article>
      {!!r.market.sources.length && (
        <details className="review-method-details">
          <summary>
            {es
              ? "Biblioteca de fuentes y consultas"
              : "Source library & search queries"}
          </summary>
          {r.market.queries?.map((q) => (
            <p key={q}>{q}</p>
          ))}
          {r.market.sources.map((s) => (
            <p key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title} ↗
              </a>
            </p>
          ))}
        </details>
      )}
    </>
  );
}
export function ReportPanel({ review, language, onTab }: Props) {
  const r = review.report,
    es = language === "es";
  return (
    <>
      <Heading
        step={
          es ? "03 · Explora las objeciones" : "03 · Explore the objections"
        }
        title={
          es
            ? `${r.personas.length} perspectivas. Ningún voto real.`
            : `${r.personas.length} perspectives. No real votes.`
        }
        body={
          es
            ? "Perfiles ficticios generados juntos. Úsalos para descubrir preguntas, no para medir demanda."
            : "Fictional perspectives generated together. Use them to find better questions, not to measure demand."
        }
      />
      <div className="simulation-banner tone-simulation">
        <Users size={22} />
        {es
          ? `${r.personas.length} perspectivas disponibles · No han usado tu producto`
          : `${r.personas.length} perspectives available · They have not used your product`}
      </div>
      <div className="perspective-cards">
        {r.personas.map((p, i) => (
          <article className="insight-card tone-simulation" key={i}>
            <div className="persona-heading">
              <span className="profile-initial">{p.name.slice(0, 1)}</span>
              <div>
                <h3>{p.name}</h3>
                <p>{p.role}</p>
              </div>
            </div>
            {p.lens && (
              <span className="status-tag">
                {PANEL_LABELS[p.lens][es ? 1 : 0]}
              </span>
            )}
            <blockquote>{p.reaction}</blockquote>
            <div className="objection-inset">
              <strong>
                {es ? "Por qué podría no usarlo" : "Why they might pass"}
              </strong>
              <p>{p.nonUseReason || p.friction}</p>
            </div>
            <div className="action-inset">
              <div>
                <strong>
                  {es ? "Un cambio que probar" : "One change to test"}
                </strong>
                <p>{p.suggestedChange || p.condition}</p>
              </div>
            </div>
            <details className="card-disclosure">
              <summary>
                {es
                  ? "Contexto y reacción completa"
                  : "Context & full reaction"}
                <ChevronDown size={17} />
              </summary>
              <dl className="compact-facts">
                {[
                  [
                    es ? "Contexto ficticio" : "Fictional context",
                    `${p.ageRange || ""} · ${p.situation}`,
                  ],
                  [es ? "Lo que ayuda" : "What helps", p.useful],
                  [es ? "La fricción" : "Friction", p.friction],
                  [
                    es ? "Alternativa actual" : "Current alternative",
                    p.alternative,
                  ],
                  [
                    es ? "Condición para probar" : "Condition for trying",
                    p.condition,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </article>
        ))}
      </div>
      <button className="primary" onClick={() => onTab("humans")}>
        {es ? "Ahora pregunta a personas reales" : "Now ask real people"}
        <ArrowRight size={18} />
      </button>
    </>
  );
}
export function ReportBuild({
  review,
  language,
  onSource,
  onTab,
  checks,
  onCheck,
}: { checks: string[]; onCheck: (title: string) => void } & Props) {
  const r = review.report,
    es = language === "es";
  return (
    <>
      <Heading
        step={
          es ? "04 · Haz un cambio concreto" : "04 · Make one concrete change"
        }
        title={
          es
            ? "Menos funciones. Un mejor siguiente paso."
            : "Less guesswork. A better next step."
        }
        body={
          es
            ? "Empieza por la primera acción. Cada cambio responde a un riesgo concreto."
            : "Start with the first action. Each change addresses a specific concern."
        }
      />
      <div className="plan-progress">
        <strong>
          {
            checks.filter((c) => r.improvements.some((i) => i.title === c))
              .length
          }{" "}
          / {r.improvements.length}
        </strong>
        <span>{es ? "acciones completadas" : "actions completed"}</span>
        <div
          role="progressbar"
          aria-label={es ? "Plan completado" : "Plan completion"}
          aria-valuenow={checks.length}
          aria-valuemin={0}
          aria-valuemax={r.improvements.length}
        >
          <i
            style={{
              width: `${r.improvements.length ? (checks.length / r.improvements.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
      <div className="action-plan">
        {r.improvements.map((item, n) => (
          <article
            className={`action-step tone-action ${checks.includes(item.title) ? "is-complete" : ""}`}
            key={item.title}
          >
            <div className="action-step-heading">
              <span className="insight-index">
                {String(n + 1).padStart(2, "0")}
              </span>
              <div>
                <span className="report-eyebrow">
                  {n === 0
                    ? es
                      ? "Empieza aquí"
                      : "Start here"
                    : es
                      ? "Después"
                      : "Then"}
                </span>
                <h3>{item.title}</h3>
              </div>
              <span className="status-tag">{item.effort}</span>
            </div>
            <div className="action-step-grid">
              <div>
                <strong>{es ? "Primera acción" : "First action"}</strong>
                <p>{item.firstStep || item.change}</p>
              </div>
              <div>
                <strong>{es ? "Cómo comprobarlo" : "How to check it"}</strong>
                <p>{item.check}</p>
              </div>
            </div>
            <details className="card-disclosure">
              <summary>
                {es
                  ? "Cambio completo, motivo y riesgos"
                  : "Full change, reasoning & tradeoffs"}
                <ChevronDown size={17} />
              </summary>
              <p>{item.change}</p>
              <p>{item.why}</p>
              <div className="objection-inset">
                <strong>{es ? "Lo que sacrificas" : "The tradeoff"}</strong>
                <p>{item.tradeoff}</p>
              </div>
              {item.findingIds.map((id) => {
                const c = r.critique.find((c) => c.id === id);
                return c ? (
                  <div className="finding-link" key={id}>
                    <strong>{c.title}</strong>
                    <EvidenceBadges
                      concern={c}
                      language={language}
                      onOpen={onSource}
                    />
                  </div>
                ) : null;
              })}
            </details>
            <label className="action-checkbox">
              <input
                type="checkbox"
                checked={checks.includes(item.title)}
                onChange={() => onCheck(item.title)}
              />
              {es ? "He completado esta acción" : "I’ve completed this action"}
            </label>
          </article>
        ))}
      </div>
      <AlternativeDirections report={r} language={language} />
      <div className="report-next-section">
        <h3>
          {es
            ? "El siguiente paso necesita personas reales."
            : "The next step needs real people."}
        </h3>
        <button className="primary" onClick={() => onTab("humans")}>
          {es ? "Preparar mi prueba" : "Prepare my test"}
          <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
