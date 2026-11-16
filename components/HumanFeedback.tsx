"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Copy, RefreshCw, Trash2 } from "lucide-react";
import type { Review, Language, StudyAccess, HumanResponse } from "@/lib/types";
import { Modal } from "./Shared";
export default function HumanFeedback({
  review,
  language,
  onResponses,
}: {
  review: Review;
  language: Language;
  onResponses: (r: HumanResponse[]) => void;
}) {
  const es = language === "es",
    t = (a: string, b: string) => (es ? b : a);
  const [access, setAccess] = useState<StudyAccess | null>(null),
    [responses, setResponses] = useState<HumanResponse[]>([]),
    [publish, setPublish] = useState(false),
    [description, setDescription] = useState(
      review.input.description.slice(0, 5000),
    ),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false),
    [remove, setRemove] = useState(false);
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem("clovo-studies-v1") || "{}");
      setAccess(all[review.report.id] || null);
    } catch {}
  }, [review.report.id]);
  function remember(a: StudyAccess | null) {
    setAccess(a);
    try {
      const all = JSON.parse(localStorage.getItem("clovo-studies-v1") || "{}");
      if (a) all[review.report.id] = a;
      else delete all[review.report.id];
      localStorage.setItem("clovo-studies-v1", JSON.stringify(all));
    } catch {
      setError(
        t(
          "Your browser could not save the owner key. Keep this tab open.",
          "El navegador no pudo guardar tu clave. Mantén esta pestaña abierta.",
        ),
      );
    }
  }
  async function refresh(a = access) {
    if (!a) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/studies/${a.id}`, {
        headers: { Authorization: `Bearer ${a.ownerKey}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setResponses(j.responses);
      onResponses(j.responses);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (access) void refresh(access);
  }, [access?.id]); // Only load when selecting a study; refresh is user-controlled.
  async function create() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: review.input.name,
          description,
          url: review.input.url,
          task: review.report.experiment.task,
          questions: review.report.experiment.questions,
          language: review.report.language,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      remember(j);
      setPublish(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteAll() {
    if (!access) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/studies/${access.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${access.ownerKey}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      remember(null);
      setResponses([]);
      onResponses([]);
      setRemove(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const link =
    access && typeof window !== "undefined"
      ? `${window.location.origin}/test/${access.id}`
      : "";
  return (
    <div className="human-section">
      <div className="section-heading">
        <div>
          <h2>
            {t("Now, ask actual people.", "Ahora, pregunta a personas reales.")}
          </h2>
          <p>
            {t(
              "AI helps you prepare. People tell you what matters to them.",
              "La IA te ayuda a prepararte. Las personas te dicen qué les importa.",
            )}
          </p>
        </div>
        {access && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => refresh()}
          >
            <RefreshCw size={18} />
            {t("Refresh responses", "Actualizar respuestas")}
          </button>
        )}
      </div>
      <div className="feedback-steps">
        <article>
          <span>01</span>
          <h3>{t("Choose people to invite", "Elige a quién invitar")}</h3>
          <p>
            {t(
              "Start with a few people who face the problem you described. You find and invite them; Clovo does not supply a human testing panel.",
              "Empieza con algunas personas que tengan el problema descrito. Tú las encuentras e invitas; Clovo no proporciona un panel humano.",
            )}
          </p>
        </article>
        <article>
          <span>02</span>
          <h3>{t("Send your feedback link", "Comparte tu enlace")}</h3>
          <p>
            {t(
              "Preview the description, task and questions below. Create a link and send it yourself. People open your prototype link, if you included one, then answer the form.",
              "Revisa la descripción, tarea y preguntas. Crea el enlace y compártelo. Si incluyes un prototipo, las personas lo abren y después responden el formulario.",
            )}
          </p>
        </article>
        <article>
          <span>03</span>
          <h3>{t("Read what actually happened", "Lee lo que ocurrió")}</h3>
          <p>
            {t(
              "Refresh responses here to see their answers. Compare their experience with the AI’s predictions. This collects written feedback; it does not record their screen or automatically verify their identity.",
              "Actualiza aquí las respuestas y compara su experiencia con las predicciones de IA. Se recoge texto; no se graba la pantalla ni se verifica automáticamente la identidad.",
            )}
          </p>
        </article>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!access ? (
        <div className="invite-card">
          <div className="human-mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <h3>
              {t(
                "Your first real conversation starts here.",
                "Tu primera conversación real empieza aquí.",
              )}
            </h3>
            <p>
              {t(
                "Create a feedback link and share it with your audience. They can try your prototype and respond without an account. You invite the testers; Clovo does not recruit a panel.",
                "Crea un enlace y compártelo con tu público. Pueden probar tu prototipo y responder sin una cuenta. Tú invitas a los participantes; Clovo no recluta un panel.",
              )}
            </p>
            <button className="primary" onClick={() => setPublish(true)}>
              {t("Create feedback link", "Crear enlace de comentarios")}
              <ArrowUpRight size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="share-card">
          <h3>
            {t(
              "Invite people who might really use this.",
              "Invita a personas que realmente podrían usarlo.",
            )}
          </h3>
          <div className="copy-row">
            <input
              aria-label={t("Feedback link", "Enlace de comentarios")}
              readOnly
              value={link}
            />
            <button
              className="primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  setError(
                    t(
                      "Select and copy the link above.",
                      "Selecciona y copia el enlace.",
                    ),
                  );
                }
              }}
            >
              <Copy size={18} />
              {copied
                ? t("Copied", "Copiado")
                : t("Copy link", "Copiar enlace")}
            </button>
          </div>
          <p>
            {t("Link expires", "El enlace caduca")}{" "}
            {new Date(access.expiresAt).toLocaleDateString(es ? "es" : "en")}.{" "}
            {t(
              "Only the study description, prototype link and questions are shared. Attachments and AI reports stay out of this link.",
              "Solo se comparten la descripción, el enlace del prototipo y las preguntas. Los archivos y el informe de IA no se incluyen.",
            )}
          </p>
          <div className="row-actions">
            <a
              className="text-button"
              href={link}
              target="_blank"
              rel="noreferrer"
            >
              {t("Preview participant view", "Ver como participante")}
              <ArrowUpRight size={18} />
            </a>
            <button
              className="text-button danger"
              onClick={() => setRemove(true)}
            >
              <Trash2 size={17} />
              {t("Delete study & responses", "Eliminar prueba y respuestas")}
            </button>
          </div>
        </div>
      )}
      <div className="response-metrics">
        <div>
          <strong>{responses.length}</strong>
          <span>{t("submitted responses", "respuestas recibidas")}</span>
        </div>
        <div>
          <strong>{responses.filter((r) => r.use === "yes").length}</strong>
          <span>{t("said they would try it", "dicen que lo probarían")}</span>
        </div>
        <div>
          <strong>
            {
              responses.filter((r) => ["daily", "weekly"].includes(r.frequency))
                .length
            }
          </strong>
          <span>
            {t(
              "face the problem weekly or more",
              "tienen el problema semanalmente",
            )}
          </span>
        </div>
      </div>
      <p className="evidence-note">
        {t(
          "These counts come only from submitted forms. Responses are anonymous and self-selected; identities are not verified. Stated interest is not proof of future use.",
          "Estos datos provienen solo de formularios enviados. Las respuestas son anónimas y voluntarias; las identidades no están verificadas. El interés declarado no demuestra uso futuro.",
        )}
      </p>
      {responses.map((r, i) => (
        <article className="response-card" key={r.id}>
          <div className="card-top">
            <h3>
              {t("Participant", "Participante")} {i + 1}
            </h3>
            <span>
              {new Date(r.createdAt).toLocaleDateString(es ? "es" : "en")}
            </span>
          </div>
          <p>{r.feedback}</p>
          <div className="detail-label">
            {t("Current approach", "Solución actual")}
          </div>
          <p>{r.problem}</p>
          {r.answers.map((a, j) => (
            <div className="answer" key={j}>
              <strong>{review.report.experiment.questions[j]}</strong>
              <p>{a || t("No answer provided.", "Sin respuesta.")}</p>
            </div>
          ))}
        </article>
      ))}
      <div className="study-plan">
        <h3>
          {t(
            "A better test starts with a neutral question.",
            "Una buena prueba empieza con una pregunta neutral.",
          )}
        </h3>
        <p>
          {t(
            "Vera wrote this test plan from your brief and the concerns the other agents found. The task is something to ask a participant to try. The questions help you learn about their current habits, confusion and reasons to switch. These are suggested questions—not answers or proof of demand.",
            "Vera preparó esta prueba a partir de tu idea y los problemas detectados. La tarea es algo que pides al participante que intente. Las preguntas exploran hábitos, dudas y motivos para cambiar. Son preguntas sugeridas, no respuestas ni pruebas de demanda.",
          )}
        </p>
        <h4>{t("Who to invite", "A quién invitar")}</h4>
        <p>{review.report.experiment.recruit}</p>
        <p>
          <strong>{t("Give them this task: ", "Propón esta tarea: ")}</strong>
          {review.report.experiment.task}
        </p>
        <h4>{t("What to ask afterward", "Qué preguntar después")}</h4>
        <ol>
          {review.report.experiment.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <p>
          <strong>{t("Observe: ", "Observa: ")}</strong>
          {review.report.experiment.successSignal}
        </p>
      </div>
      {publish && (
        <Modal
          title={t("Preview your public study", "Revisa tu prueba pública")}
          onClose={() => setPublish(false)}
        >
          <h2>{review.input.name}</h2>
          <p>
            {t(
              "Anyone with the link can read this description and respond. Edit out private information before publishing.",
              "Cualquier persona con el enlace podrá leer esta descripción y responder. Elimina información privada antes de publicar.",
            )}
          </p>
          <label>
            {t("Description to share", "Descripción para compartir")}
            <textarea
              rows={7}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {review.input.url && (
            <p>
              {t("Prototype link: ", "Enlace del prototipo: ")}
              {review.input.url}
            </p>
          )}
          <h3>
            {t(
              "Questions participants will see",
              "Preguntas para los participantes",
            )}
          </h3>
          <ol>
            {review.report.experiment.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            {t(
              "I want to share this description, prototype link, task and questions with anyone who has the link.",
              "Quiero compartir esta descripción, enlace, tarea y preguntas con quienes tengan el enlace.",
            )}
          </label>
          <p>
            {t(
              "Private storage. No login. Study and responses are scheduled for deletion after seven days from their creation. Keep this browser’s data to retain your owner controls.",
              "Almacenamiento privado. Sin inicio de sesión. La prueba y cada respuesta se programan para eliminarse siete días después de crearse. Conserva los datos de este navegador para mantener el acceso de propietario.",
            )}
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary"
            disabled={!consent || description.trim().length < 25 || busy}
            onClick={create}
          >
            {busy
              ? t("Creating…", "Creando…")
              : t("Publish feedback link", "Publicar enlace")}
          </button>
        </Modal>
      )}
      {remove && (
        <Modal
          title={t("Delete this study?", "¿Eliminar esta prueba?")}
          onClose={() => setRemove(false)}
        >
          <h2>
            {t(
              "Close the link and remove its responses.",
              "Cierra el enlace y elimina sus respuestas.",
            )}
          </h2>
          <p>
            {t(
              "This permanently deletes the shared study and its feedback. Your local AI report remains available.",
              "Esto elimina permanentemente la prueba y sus comentarios. Tu informe local de IA seguirá disponible.",
            )}
          </p>
          <div className="row-actions">
            <button className="secondary" onClick={() => setRemove(false)}>
              {t("Cancel", "Cancelar")}
            </button>
            <button className="primary" disabled={busy} onClick={deleteAll}>
              {t("Delete study & responses", "Eliminar prueba y respuestas")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
