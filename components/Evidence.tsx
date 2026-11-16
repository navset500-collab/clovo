"use client";
import type { Concern, EvidenceSource, Language, Review } from "@/lib/types";
import { ArrowUpRight, FileText, Quote } from "lucide-react";
import { Modal } from "./Shared";
export function EvidenceBadges({
  concern,
  language,
  onOpen,
}: {
  concern: Concern;
  language: Language;
  onOpen: (id: string) => void;
}) {
  const es = language === "es";
  return (
    <div className="evidence-badges">
      <span className={`basis-badge ${concern.basis}`}>
        {concern.basis === "brief-supported"
          ? es
            ? "Basado en tu texto"
            : "Supported by your brief"
          : concern.basis === "file-interpretation"
            ? es
              ? "Interpretación del archivo"
              : "File interpretation"
            : es
              ? "Hipótesis por comprobar"
              : "Hypothesis to test"}
      </span>
      {concern.citations?.map((c, i) => (
        <button key={i} onClick={() => onOpen(c.sourceId)}>
          <Quote size={15} />
          {c.sourceId} ·{" "}
          {c.verification === "text-match"
            ? es
              ? "Cita comprobada"
              : "Quote matched"
            : c.location || (es ? "Ver archivo" : "See file")}
          <ArrowUpRight size={14} />
        </button>
      ))}
    </div>
  );
}
export function EvidenceDrawer({
  review,
  sourceId,
  language,
  onClose,
  onSelect,
}: {
  review: Review;
  sourceId: string;
  language: Language;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const es = language === "es",
    t = (a: string, b: string) => (es ? b : a),
    sources = review.report.evidenceSources || [],
    source = sources.find((s) => s.id === sourceId),
    citations = [
      ...review.report.critique.flatMap((c) => c.citations || []),
      ...(review.report.readiness?.dimensions.flatMap((d) => d.citations) ||
        []),
    ].filter(
      (c, i, all) =>
        c.sourceId === sourceId &&
        all.findIndex(
          (x) => x.sourceId === c.sourceId && x.quote === c.quote,
        ) === i,
    ),
    attachment = review.input.attachments.find(
      (a) => a.id === source?.attachmentId,
    );
  return (
    <Modal
      title={t("Follow the evidence", "Sigue la evidencia")}
      onClose={onClose}
      wide
    >
      <div className="source-layout">
        <aside>
          <h3>{t("Your original sources", "Tus fuentes originales")}</h3>
          {sources.map((s) => (
            <button
              className={s.id === sourceId ? "selected" : ""}
              key={s.id}
              onClick={() => onSelect(s.id)}
            >
              <span>{s.id}</span>
              {s.label}
            </button>
          ))}
        </aside>
        <article>
          <div className="source-heading">
            <span className="source-id">{source?.id}</span>
            <h2>{source?.label}</h2>
          </div>
          <p>
            {source?.kind === "attachment"
              ? t(
                  "The AI interpreted this uploaded material. File observations have not been independently verified; check them against the original.",
                  "La IA interpretó este archivo. Las observaciones no se verificaron de forma independiente; compáralas con el original.",
                )
              : t(
                  "This is the original text you supplied. Quote matches are checked in code before appearing as supporting evidence. Your claims still need real-world validation.",
                  "Este es el texto original que proporcionaste. Las citas se comprueban mediante código. Tus afirmaciones aún necesitan validación en el mundo real.",
                )}
          </p>
          <div className="original-source">{source?.text}</div>
          {attachment?.data && attachment.kind !== "pdf" && (
            <img
              className="source-image"
              src={attachment.data}
              alt={attachment.name}
            />
          )}{" "}
          {attachment?.data && attachment.kind === "pdf" && (
            <a
              className="secondary"
              href={attachment.data}
              download={attachment.name}
            >
              <FileText size={18} />
              {t("Download original PDF", "Descargar PDF original")}
            </a>
          )}
          {citations.length > 0 && (
            <>
              <h3>{t("Used in this review", "Usado en este análisis")}</h3>
              {citations.map((c, i) => (
                <blockquote className="source-quote" key={i}>
                  {c.quote}
                  <footer>
                    {c.location} ·{" "}
                    {c.verification === "text-match"
                      ? t("Exact text match", "Coincidencia de texto exacta")
                      : t("AI file interpretation", "Interpretación de IA")}
                  </footer>
                </blockquote>
              ))}
            </>
          )}
        </article>
      </div>
    </Modal>
  );
}
export function EvidenceSummary({
  review,
  language,
  onOpen,
}: {
  review: Review;
  language: Language;
  onOpen: (id: string) => void;
}) {
  const es = language === "es",
    sources = review.report.evidenceSources || [],
    matched = review.report.critique.filter(
      (c) => c.basis === "brief-supported",
    ).length,
    hypotheses = review.report.critique.filter(
      (c) => c.basis === "hypothesis",
    ).length;
  return (
    <div className="evidence-summary">
      <span>
        <strong>{sources.length}</strong>{" "}
        {es ? "fuentes aportadas" : "supplied sources"}
      </span>
      <span>
        <strong>{matched}</strong>{" "}
        {es
          ? "hallazgos con citas comprobadas"
          : "findings with matched quotes"}
      </span>
      <span>
        <strong>{hypotheses}</strong>{" "}
        {es
          ? "hipótesis sin evidencia directa"
          : "hypotheses without direct evidence"}
      </span>
      {sources[0] && (
        <button className="text-button" onClick={() => onOpen(sources[0].id)}>
          {es ? "Ver evidencia" : "Inspect evidence"}
          <ArrowUpRight size={17} />
        </button>
      )}
    </div>
  );
}
