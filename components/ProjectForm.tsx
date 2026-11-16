"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Film,
  Upload,
  X,
  MessageSquare,
} from "lucide-react";
import type { Language, ProjectInput } from "@/lib/types";
import {
  wordCount,
  MIN_DESCRIPTION_WORDS,
  MIN_AUDIENCE_WORDS,
} from "@/lib/intake";
import { USAGE_LIMITS } from "@/lib/usage-policy";
import { Modal } from "./Shared";
export default function ProjectForm({
  language,
  draft,
  setDraft,
  onClose,
  onAnalyze,
  filesBusy,
  addFiles,
  error,
  questions = [],
}: {
  language: Language;
  draft: ProjectInput;
  setDraft: React.Dispatch<React.SetStateAction<ProjectInput>>;
  onClose: () => void;
  onAnalyze: (e: React.FormEvent, input: ProjectInput) => void;
  filesBusy: boolean;
  addFiles: (files: FileList | null) => void;
  error: string;
  questions?: string[];
}) {
  const es = language === "es",
    t = (a: string, b: string) => (es ? b : a),
    [step, setStep] = useState(0),
    [answers, setAnswers] = useState<string[]>([]),
    fileInput = useRef<HTMLInputElement>(null),
    words = wordCount(draft.description),
    audienceWords = wordCount(draft.audience),
    ready =
      words >= MIN_DESCRIPTION_WORDS &&
      audienceWords >= MIN_AUDIENCE_WORDS &&
      draft.name.trim().length > 0;
  const [requiresCode, setRequiresCode] = useState(false);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((j) => setRequiresCode(Boolean(j.requiresCode)))
      .catch(() => {});
  }, []);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    if (step === 0) {
      setStep(1);
      document
        .querySelector(".modal-content")
        ?.scrollIntoView({ block: "start" });
      return;
    }
    const added = questions
      .map((q, i) => `${q}\n${answers[i]?.trim() || ""}`)
      .join("\n\n");
    onAnalyze(e, {
      ...draft,
      description: added
        ? `${draft.description}\n\n${t("Additional context", "Contexto adicional")}\n${added}`
        : draft.description,
    });
  }
  return (
    <Modal title={t("Your project brief", "Tu proyecto")} onClose={onClose}>
      <form className="project-form" onSubmit={submit}>
        <div className="form-progress">
          <span className={step === 0 ? "active" : ""}>
            01 · {t("The idea", "La idea")}
          </span>
          <i />
          <span className={step === 1 ? "active" : ""}>
            02 · {t("Context & materials", "Contexto y archivos")}
          </span>
        </div>
        <h2>
          {step === 0
            ? t(
                "Give the team something to work with.",
                "Dale al equipo una base para trabajar.",
              )
            : t(
                "Add the details that matter.",
                "Añade los detalles que importan.",
              )}
        </h2>
        <p>
          {step === 0
            ? t(
                "The more specific your brief, the more useful your review. You don’t need to have every answer.",
                "Cuanto más específico sea tu texto, más útil será el análisis. No necesitas tener todas las respuestas.",
              )
            : t(
                "Bring evidence if you have it, and tell us what decision you’re trying to make.",
                "Añade evidencia si la tienes y cuéntanos qué decisión quieres tomar.",
              )}
        </p>
        {step === 0 ? (
          <>
            {questions.length > 0 && (
              <div className="clarification-box" role="status">
                <MessageSquare size={23} />
                <div>
                  <h3>
                    {t(
                      "Mira needs a little more context.",
                      "Mira necesita un poco más de contexto.",
                    )}
                  </h3>
                  <p>
                    {t(
                      "Your brief is saved below. These answers will help the team avoid guessing.",
                      "Tu texto sigue guardado abajo. Estas respuestas ayudarán al equipo a no adivinar.",
                    )}
                  </p>
                  {questions.map((q, i) => (
                    <label key={q}>
                      {q}
                      <textarea
                        required
                        minLength={10}
                        maxLength={800}
                        rows={2}
                        value={answers[i] || ""}
                        onChange={(e) =>
                          setAnswers((v) => {
                            const next = [...v];
                            next[i] = e.target.value;
                            return next;
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="form-two">
              <label>
                {t("Project name", "Nombre del proyecto")}
                <input
                  autoFocus
                  required
                  maxLength={80}
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder={t("What are you calling it?", "¿Cómo se llama?")}
                />
              </label>
              <label>
                {t("Current stage", "Etapa actual")}
                <select
                  value={draft.stage}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      stage: e.target.value as ProjectInput["stage"],
                    }))
                  }
                >
                  <option value="idea">{t("An idea", "Una idea")}</option>
                  <option value="prototype">
                    {t("An MVP or prototype", "Un MVP o prototipo")}
                  </option>
                  <option value="launched">
                    {t("An existing product", "Un producto existente")}
                  </option>
                </select>
              </label>
            </div>
            <label>
              {t("What are you building?", "¿Qué estás construyendo?")}
              <textarea
                required
                maxLength={14000}
                rows={8}
                aria-describedby="brief-help brief-count"
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                placeholder={t(
                  "Describe the problem, how your product would work, what someone does today instead, and what you have built or tested so far. It is fine to say what you don’t know yet.",
                  "Describe el problema, cómo funcionaría el producto, qué hacen las personas ahora y qué has construido o probado. Puedes decir qué aún no sabes.",
                )}
              />
              <div className="word-count" id="brief-count">
                <span>
                  {words >= 50 ? <Check size={16} /> : null}
                  {words} {t("words", "palabras")}
                </span>
                <span>
                  {words < 50
                    ? `${50 - words} ${t("more to reach 50", "más para llegar a 50")}`
                    : t("Enough detail to begin", "Suficiente para empezar")}
                </span>
              </div>
              <span className="field-help" id="brief-help">
                {t(
                  "At least 50 words. Describe a real situation, your solution, and what you’re unsure about.",
                  "Al menos 50 palabras. Describe una situación real, tu solución y tus dudas.",
                )}
              </span>
            </label>
            <div className="brief-prompts">
              <span>{t("A useful brief covers", "Un buen texto incluye")}</span>
              <div>
                <span>{t("The problem", "El problema")}</span>
                <span>{t("The current workaround", "La solución actual")}</span>
                <span>{t("Your approach", "Tu propuesta")}</span>
                <span>{t("What needs testing", "Lo que falta probar")}</span>
              </div>
            </div>
            <label>
              {t(
                "Who is it for, specifically?",
                "¿Para quién es, en concreto?",
              )}
              <textarea
                required
                maxLength={1000}
                rows={3}
                value={draft.audience}
                aria-describedby="audience-help"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, audience: e.target.value }))
                }
                placeholder={t(
                  "For example: working parents arranging after-school pickups, without nearby family who can help.",
                  "Por ejemplo: madres y padres que trabajan, organizan la recogida escolar y no tienen familiares cerca.",
                )}
              />
              <span className="field-help" id="audience-help">
                {t(
                  "A label like “moms” is a start. Add their situation, the problem they face, and a constraint. Use at least 6 words.",
                  "Una etiqueta como “madres” es un inicio. Añade su situación, problema y una limitación. Usa al menos 6 palabras.",
                )}
                {audienceWords > 0 && audienceWords < 6 && (
                  <strong>
                    {" "}
                    {6 - audienceWords}{" "}
                    {t("more words needed.", "palabras más.")}
                  </strong>
                )}
              </span>
            </label>
          </>
        ) : (
          <>
            <label>
              {t(
                "What decision should this review help you make? (optional)",
                "¿Qué decisión quieres tomar con este análisis? (opcional)",
              )}
              <textarea
                rows={3}
                maxLength={1500}
                value={draft.task}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, task: e.target.value }))
                }
                placeholder={t(
                  "Should I focus on parents or schools first? Is this useful enough to replace their group chat?",
                  "¿Debería enfocarme primero en familias o escuelas? ¿Aporta suficiente valor para sustituir el chat grupal?",
                )}
              />
            </label>
            <label>
              {t(
                "Prototype or product link (optional)",
                "Enlace del prototipo o producto (opcional)",
              )}
              <input
                type="url"
                maxLength={1500}
                placeholder="https://"
                value={draft.url}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, url: e.target.value }))
                }
              />
              <span className="field-help">
                {t(
                  "Human testers can open this link. AI agents review the text and files you supply; they don’t click through your app.",
                  "Los participantes pueden abrir el enlace. Los agentes revisan tus textos y archivos; no navegan tu aplicación.",
                )}
              </span>
            </label>
            <div
              className="upload-box"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!filesBusy) addFiles(e.dataTransfer.files);
              }}
            >
              <Upload size={27} />
              <h3>
                {filesBusy
                  ? t("Preparing your files…", "Preparando archivos…")
                  : t("Show what you’ve made.", "Muestra lo que has creado.")}
              </h3>
              <p>
                {t(
                  "Drop a PDF, screenshots, or a short demo video here.",
                  "Arrastra un PDF, capturas o un video corto aquí.",
                )}
              </p>
              <input
                ref={fileInput}
                type="file"
                className="sr-only"
                aria-label={t("Project files", "Archivos del proyecto")}
                accept="application/pdf,image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                multiple
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="secondary"
                disabled={filesBusy}
                onClick={() => fileInput.current?.click()}
              >
                {t("Choose files", "Elegir archivos")}
              </button>
              <p className="field-help">
                {t(
                  "PDF ≤ 2 MB · image ≤ 15 MB · video ≤ 60 MB / 3 min",
                  "PDF ≤ 2 MB · imagen ≤ 15 MB · video ≤ 60 MB / 3 min",
                )}
              </p>
              <details className="file-details">
                <summary>
                  {t("How files are reviewed", "Cómo se analizan los archivos")}
                </summary>
                <p>
                  {t(
                    "PDFs are sent in full. Videos become six sampled frames, without audio. Images are compressed. Prepared files together must fit within 3.7 MB.",
                    "Los PDF se envían completos. Los videos se convierten en seis fotogramas sin audio. Las imágenes se comprimen. El total preparado debe ser menor a 3,7 MB.",
                  )}
                </p>
              </details>
            </div>
            {draft.attachments.length > 0 && (
              <div className="attachment-list">
                {draft.attachments.map((f, i) => (
                  <div key={f.id}>
                    {f.kind === "pdf" ? (
                      <FileText size={20} />
                    ) : f.kind === "video-frame" ? (
                      <Film size={20} />
                    ) : (
                      <img src={f.data} alt="" />
                    )}
                    <span>{f.name}</span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`${t("Remove", "Quitar")} ${f.name}`}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          attachments: d.attachments.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {requiresCode && (
              <label>
                {t("Access code", "Código de acceso")}
                <input
                  type="password"
                  required
                  maxLength={200}
                  autoComplete="off"
                  value={draft.accessCode || ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, accessCode: e.target.value }))
                  }
                />
              </label>
            )}
            <div className="allowance-note">
              <strong>
                {t(
                  "A small, shared research allowance",
                  "Un límite de investigación compartido",
                )}
              </strong>
              <p>
                {t(
                  `Up to ${USAGE_LIMITS.perNetworkDaily} review starts per network each day. Clovo serves ${USAGE_LIMITS.daily} starts per day and ${USAGE_LIMITS.monthly} per month in total. A clarification or interrupted review still counts. Daily limits reset at midnight UTC.`,
                  `Hasta ${USAGE_LIMITS.perNetworkDaily} inicios por red al día. Clovo permite ${USAGE_LIMITS.daily} al día y ${USAGE_LIMITS.monthly} al mes en total. Una aclaración o interrupción también cuenta. El límite diario se reinicia a medianoche UTC.`,
                )}
              </p>
              <p>
                {t(
                  "Choose English or Español in the header before starting. This sets the report and questionnaire language.",
                  "Elige English o Español en la cabecera antes de empezar. Así se define el idioma del informe y las preguntas.",
                )}
              </p>
            </div>
            <p className="privacy-note">
              {t(
                "Starting a review sends your brief and prepared files to Google Gemini. General topic queries go to Tavily for web research. Your project is shared with other people only if you create a feedback link.",
                "Al iniciar, tu texto y archivos preparados se envían a Google Gemini. Las consultas generales se envían a Tavily. Tu proyecto solo se comparte con otras personas si creas un enlace de comentarios.",
              )}{" "}
              <a
                href={`/privacy?lang=${language}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("Privacy & data", "Privacidad y datos")}
              </a>
            </p>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {step === 1 ? (
            <button
              type="button"
              className="text-button"
              onClick={() => setStep(0)}
            >
              <ArrowLeft size={18} />
              {t("Back to your brief", "Volver a tu texto")}
            </button>
          ) : (
            <span>{t("No account needed.", "No necesitas una cuenta.")}</span>
          )}
          <button
            className="primary"
            type="submit"
            disabled={!ready || filesBusy}
          >
            {step === 0
              ? t("Continue", "Continuar")
              : t("Start my review", "Iniciar mi análisis")}
            <ArrowRight size={20} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
