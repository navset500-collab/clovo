"use client";
import { errorText } from "@/lib/messages";
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
      if (!r.ok) throw new Error(j.code || j.error);
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
      if (!r.ok) throw new Error(j.code || j.error);
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
      if (!r.ok) throw new Error(j.code || j.error);
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
            {t(
              "Turn the plan into real feedback.",
              "Convierte el plan en comentarios reales.",
            )}
          </h2>
          <p>
            {t(
              "Create a questionnaire on Clovo, send the link yourself, and read people’s answers here.",
              "Crea un formulario en Clovo, comparte tú el enlace y lee aquí las respuestas.",
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
            {t("Check for responses", "Consultar respuestas")}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="error">
          {errorText(error, language)}
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
                "Your own feedback page. On Clovo.",
                "Tu propia página de comentarios. En Clovo.",
              )}
            </h3>
            <p>
              {t(
                "The link will look like clovo-studio.vercel.app/test/… Anyone with it can read your shared description and answer Vera’s questions. Your uploaded files and AI report stay out of the page.",
                "El enlace será como clovo-studio.vercel.app/test/… Quien lo tenga podrá leer tu descripción y responder las preguntas de Vera. Tus archivos y tu informe de IA no se incluyen.",
              )}
            </p>
            <button className="primary" onClick={() => setPublish(true)}>
              {t("Preview & create your page", "Revisar y crear tu página")}
              <ArrowUpRight size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="share-card">
          <h3>
            {t(
              "Your page is ready. Now send the link.",
              "Tu página está lista. Ahora envía el enlace.",
            )}
          </h3>
          <p>
            {t(
              "Clovo has not sent this to anyone. Copy it into a text, email, or group chat for the people you want to invite.",
              "Clovo no ha enviado esto a nadie. Copia el enlace en un mensaje, correo o chat para las personas que quieras invitar.",
            )}
          </p>
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
                ? t("Copied — ready to send", "Copiado — listo para enviar")
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
      <div className="feedback-steps">
        <article>
          <span>01</span>
          <h3>{t("Create your page", "Crea tu página")}</h3>
          <p>
            {t(
              "Review the description and questions, then create a questionnaire hosted right here on Clovo. This does not publish your whole AI report.",
              "Revisa la descripción y las preguntas y crea un formulario alojado aquí, en Clovo. No se publica todo tu informe de IA.",
            )}
          </p>
        </article>
        <article>
          <span>02</span>
          <h3>{t("Send your feedback link", "Comparte tu enlace")}</h3>
          <p>
            {t(
              "Copy the link into a message to people who face this problem. Clovo does not post it to social media, send invitations, or recruit testers.",
              "Copia el enlace en un mensaje para personas que tengan este problema. Clovo no lo publica en redes sociales, envía invitaciones ni recluta participantes.",
            )}
          </p>
        </article>
        <article>
          <span>03</span>
          <h3>{t("Come back for answers", "Vuelve por las respuestas")}</h3>
          <p>
            {t(
              "They open the link and answer without an account. Return to this report in the same browser and choose Check for responses. Nothing appears until someone submits the form.",
              "Abren el enlace y responden sin cuenta. Vuelve a este informe en el mismo navegador y pulsa Consultar respuestas. No aparecerá nada hasta que alguien envíe el formulario.",
            )}
          </p>
        </article>
      </div>
      {access && responses.length === 0 && (
        <div className="response-empty">
          <h3>
            {t(
              "Waiting for your first response.",
              "Esperando tu primera respuesta.",
            )}
          </h3>
          <p>
            {t(
              "Send the link above, let someone complete the form, then choose Check for responses. These are real submissions, separate from Juno’s AI perspectives.",
              "Envía el enlace, espera a que alguien complete el formulario y pulsa Consultar respuestas. Son envíos reales, separados de las perspectivas de IA de Juno.",
            )}
          </p>
        </div>
      )}
      {access && (
        <>
          <div className="response-metrics">
            <div>
              <strong>{responses.length}</strong>
              <span>{t("submitted responses", "respuestas recibidas")}</span>
            </div>
            <div>
              <strong>{responses.filter((r) => r.use === "yes").length}</strong>
              <span>
                {t("said they would try it", "dicen que lo probarían")}
              </span>
            </div>
            <div>
              <strong>
                {
                  responses.filter((r) =>
                    ["daily", "weekly"].includes(r.frequency),
                  ).length
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
        </>
      )}
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
        {review.report.experiment.hypothesis && (
          <div className="first-step">
            <strong>
              {t("The hypothesis to test", "La hipótesis que probar")}
            </strong>
            <p>{review.report.experiment.hypothesis}</p>
          </div>
        )}
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
        {review.report.experiment.rethinkSignal && (
          <p className="counter-evidence">
            <strong>
              {t("Reconsider the idea if: ", "Reconsidera la idea si: ")}
            </strong>
            {review.report.experiment.rethinkSignal}
          </p>
        )}
      </div>
      {publish && (
        <Modal
          title={t(
            "Preview your Clovo feedback page",
            "Revisa tu página de comentarios",
          )}
          onClose={() => setPublish(false)}
        >
          <p className="publishing-destination">
            {t(
              "Destination: a shareable page on Clovo. Nothing is sent or posted to another service.",
              "Destino: una página para compartir en Clovo. No se envía ni publica en otro servicio.",
            )}
          </p>
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
            {t("Task participants will see", "Tarea para los participantes")}
          </h3>
          <p>{review.report.experiment.task}</p>
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
              {errorText(error, language)}
            </p>
          )}
          <button
            className="primary"
            disabled={!consent || description.trim().length < 25 || busy}
            onClick={create}
          >
            {busy
              ? t("Creating…", "Creando…")
              : t("Create page & get link", "Crear página y obtener enlace")}
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
