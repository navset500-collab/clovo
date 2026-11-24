"use client";
import { useEffect, useState } from "react";
import { Header, Footer, Modal } from "./Shared";
import type { Language, StudyAccess } from "@/lib/types";
export default function Privacy() {
  const [language, setLanguage] = useState<Language>("en"),
    [studies, setStudies] = useState<[string, StudyAccess][]>([]),
    [deleting, setDeleting] = useState<[string, StudyAccess] | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const t = (a: string, b: string) => (language === "es" ? b : a);
  useEffect(() => {
    const lang = new URLSearchParams(location.search).get("lang");
    if (lang === "es") setLanguage("es");
    try {
      setStudies(
        Object.entries(
          JSON.parse(localStorage.getItem("clovo-studies-v1") || "{}"),
        ),
      );
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/studies/${deleting[1].id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${deleting[1].ownerKey}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const next = studies.filter((s) => s[0] !== deleting[0]);
      setStudies(next);
      localStorage.setItem(
        "clovo-studies-v1",
        JSON.stringify(Object.fromEntries(next)),
      );
      setDeleting(null);
      setMessage(
        t("Study and responses deleted.", "Prueba y respuestas eliminadas."),
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header language={language} onLanguage={setLanguage} />
      <main className="privacy-page" id="main">
        <a className="back-link" href="/">
          ← {t("Back to Clovo", "Volver a Clovo")}
        </a>
        <h1>{t("Your ideas. Your choices.", "Tus ideas. Tus decisiones.")}</h1>
        <p className="large-copy">
          {t("Privacy & data policy", "Política de privacidad y datos")}
        </p>
        <p>
          {t(
            "Last updated November 23, 2026. Clovo is an independent product prototype. No account is required.",
            "Actualizada el 18 de noviembre de 2026. Clovo es un prototipo de producto independiente. No se requiere una cuenta.",
          )}
        </p>
        <section>
          <h2>{t("Usage protection", "Protección de uso")}</h2>
          <p>
            {t(
              "Review starts, feedback submissions and study reads have shared server-side limits. A daily rotating, keyed hash of your network address is stored with counters and short-lived review leases in private storage; raw IP addresses are not stored in this usage ledger. Records expire after 40 days from their last update. Shared networks share anti-abuse and concurrency safeguards, but personal review counts are separate. An essential signed, HttpOnly cookie identifies this browser for up to 30 days without a login. Its hashed identifier, rolling 24-hour completion timestamps and count are held privately; those records expire two days after their last update. Clearing cookies or switching browsers creates a new anonymous identity, so this is not verified per-person identity. The shared spending ceiling still applies. Vercel may separately retain operational logs under its own policy.",
              "Los análisis, respuestas y lecturas tienen límites compartidos en el servidor. Guardamos contadores y un hash con clave de tu dirección de red que cambia a diario; no guardamos la IP original en ese registro. Los registros caducan 40 días después de su última actualización. Las redes compartidas comparten controles de abuso y concurrencia, pero no los contadores personales. Una cookie esencial, firmada y HttpOnly identifica este navegador hasta 30 días sin una cuenta. Su identificador cifrado con hash, marcas de finalización de las últimas 24 horas y contador se guardan en privado; estos registros caducan dos días después de su última actualización. Borrar cookies o cambiar de navegador crea otra identidad anónima; no se verifica la identidad personal. El presupuesto compartido sigue vigente. Vercel puede conservar registros operativos según su política.",
            )}
          </p>
        </section>
        <section>
          <h2>
            {t(
              "What happens when you run a review",
              "Qué ocurre al iniciar un análisis",
            )}
          </h2>
          <p>
            {t(
              "Your project description, audience, questions and prepared attachments are sent through our server to Google Gemini. PDFs are sent in full. Images are resized in your browser. Videos stay in your browser; six sampled frames are sent, without audio. The prototype URL is included as context but is not opened or interactively tested by the agents.",
              "La descripción, el público, las preguntas y los archivos preparados se envían a Google Gemini a través de nuestro servidor. Los PDF se envían completos. Las imágenes se reducen en tu navegador. Los videos permanecen en tu navegador; se envían seis fotogramas sin audio. La URL se incluye como contexto, pero los agentes no la abren ni prueban interactivamente.",
            )}
          </p>
          <p>
            {t(
              "Mira prepares topic queries from your problem and audience. These queries are sent to Tavily for public web research; we instruct the model to omit your project name and private details, and remove names matching the project, email addresses and URLs from queries in code. The full brief and attachments are not sent to Tavily. Avoid putting sensitive information in any input. AI analysis is not human research and cannot establish demand.",
              "Mira prepara consultas generales del problema y el público para Tavily. Se indica al modelo que omita el nombre del proyecto y datos privados; el código elimina el nombre, correos y URL de las consultas. El texto completo y los archivos no se envían a Tavily. Evita introducir datos sensibles. La IA no sustituye la investigación con personas ni demuestra demanda.",
            )}
          </p>
          <p>
            {t(
              "Google’s handling and retention depend on its API terms and the account tier. We do not promise that provider data is never retained or used to improve services. Do not submit confidential material, credentials, identifying information or sensitive personal data.",
              "El tratamiento y la retención de Google dependen de sus condiciones y del nivel de la cuenta. No prometemos que el proveedor nunca conserve datos ni los use para mejorar servicios. No envíes información confidencial, credenciales, datos identificables ni información personal sensible.",
            )}{" "}
            <a
              href="https://ai.google.dev/gemini-api/terms"
              target="_blank"
              rel="noreferrer"
            >
              {t(
                "Google Gemini API terms",
                "Condiciones de la API de Google Gemini",
              )}
            </a>
            .
          </p>
        </section>
        <p>
          {t(
            "Tavily processes search queries under its own privacy policy. Search access is rate-limited and may be unavailable.",
            "Tavily procesa las consultas según su política de privacidad. La búsqueda tiene límites y puede no estar disponible.",
          )}{" "}
          <a
            href="https://www.tavily.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            {t("Tavily privacy policy", "Política de privacidad de Tavily")}
          </a>
          .
        </p>
        <section>
          <h2>
            {t(
              "What stays on this device",
              "Qué se guarda en este dispositivo",
            )}
          </h2>
          <p>
            {t(
              "The latest project text and AI report, language preference, build checklist and study owner keys are saved in local browser storage. Attachments are not saved in that storage. We do not save review uploads or AI reports to our cloud database. Server memory holds the request while it is processed. After an interrupted review, a signed recovery checkpoint containing completed agent outputs may be kept in this open tab for up to 30 minutes. It is not uploaded to our database or saved across a page refresh. Resuming sends it back with the same brief for signature verification. Clearing your browser data removes these local copies and may remove your ability to manage a study.",
              "El texto del último proyecto, el informe de IA, el idioma, la lista de mejoras y las claves de propietario se guardan en el almacenamiento local. Los archivos adjuntos no se guardan allí. No almacenamos los archivos de análisis ni los informes de IA en nuestra base de datos en la nube. La memoria del servidor mantiene la solicitud durante su procesamiento. Tras una interrupción, esta pestaña puede conservar hasta 30 minutos un punto de recuperación firmado con los resultados completados. No se sube a nuestra base de datos ni se conserva al recargar. Al continuar, se envía con el mismo texto para verificar la firma. Borrar los datos del navegador elimina estas copias y puede impedirte administrar una prueba.",
            )}
          </p>
        </section>
        <section>
          <h2>
            {t(
              "When you invite real people",
              "Cuando invitas a personas reales",
            )}
          </h2>
          <p>
            {t(
              "Creating a feedback link publishes only the description you approve, project name, optional prototype URL, task and study questions to anyone with the link. It does not publish your attachments or AI report. The study and responses are held in a private Vercel Blob store; our server serves the invitation to people with its random link. Only someone holding your private owner key can view the collected responses or delete the study. Keep that key private.",
              "Crear un enlace publica únicamente la descripción aprobada, el nombre, la URL opcional, la tarea y las preguntas para quienes tengan el enlace. No publica los archivos ni el informe de IA. La prueba y las respuestas se guardan en Vercel Blob privado; el servidor muestra la invitación a quienes tengan su enlace aleatorio. Solo quien posea tu clave privada puede ver las respuestas o eliminar la prueba. Mantén la clave privada.",
            )}
          </p>
          <p>
            {t(
              "Participants provide no name or email. Responses are anonymous, self-selected and not identity-verified. Their answers are shown to the study creator; they are not sent to Gemini. Stated intention is not measured future demand. The app discourages repeat responses in the same browser, but cannot guarantee one response per person.",
              "Los participantes no proporcionan nombre ni correo. Las respuestas son anónimas, voluntarias y sin verificación de identidad. Sus respuestas se muestran al creador y no se envían a Gemini. La intención declarada no mide la demanda futura. La aplicación desalienta respuestas repetidas en el mismo navegador, pero no garantiza una por persona.",
            )}
          </p>
          <p>
            {t(
              "A study closes after seven days. Each study record and each response is configured for automatic deletion seven days after it is created; provider deletion timing may vary. The creator can delete the study and all responses sooner using the controls below. Downloaded copies made by a creator are outside our control.",
              "Una prueba se cierra después de siete días. Cada registro y respuesta se configura para eliminarse automáticamente siete días después de su creación; el momento exacto puede variar según el proveedor. El creador puede eliminar la prueba y sus respuestas antes con los controles de abajo. Las copias descargadas quedan fuera de nuestro control.",
            )}
          </p>
        </section>
        <section>
          <h2>
            {t(
              "Hosting, security and limits",
              "Alojamiento, seguridad y límites",
            )}
          </h2>
          <p>
            {t(
              "Vercel hosts the app and private study storage. Infrastructure providers may process IP addresses, request metadata and operational logs. Vercel’s firewall limits API request bursts by IP before they reach the app. Clovo also uses short-lived in-memory counters as a local safeguard; completed-review allowances use separate private, persistent counters. We do not add advertising trackers or marketing analytics. API keys and storage credentials stay on the server. Study links are unlisted, not passwords: anyone who receives a link can read the invitation.",
              "Vercel aloja la aplicación y el almacenamiento privado. Los proveedores pueden procesar direcciones IP, metadatos y registros operativos. El cortafuegos de Vercel limita las ráfagas de solicitudes por IP antes de que lleguen a la aplicación. Clovo también usa contadores temporales en memoria como protección local; los límites de análisis completos utilizan contadores privados y persistentes separados. No añadimos rastreadores publicitarios ni analítica de marketing. Las claves de API y almacenamiento permanecen en el servidor. Los enlaces no son contraseñas: cualquier persona que los reciba puede leer la invitación.",
            )}
          </p>
          <p>
            {t(
              "This prototype is intended for non-sensitive product ideas. It is not a production research platform or a service for regulated personal data. No system can promise absolute security.",
              "Este prototipo está destinado a ideas de productos sin datos sensibles. No es una plataforma de investigación de producción ni un servicio para datos personales regulados. Ningún sistema puede prometer seguridad absoluta.",
            )}{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noreferrer"
            >
              {t("Vercel privacy policy", "Política de privacidad de Vercel")}
            </a>
            .
          </p>
        </section>
        <section>
          <h2>
            {t(
              "Manage your shared studies",
              "Administra tus pruebas compartidas",
            )}
          </h2>
          <p>
            {t(
              "These owner controls are available only on the browser where you created the links. Delete shared studies before clearing browser storage.",
              "Estos controles están disponibles solo en el navegador donde creaste los enlaces. Elimina las pruebas antes de borrar el almacenamiento local.",
            )}
          </p>
          {message && <p role="status">{message}</p>}
          {studies.length === 0 ? (
            <p>
              {t(
                "No saved study keys on this browser.",
                "No hay claves de pruebas guardadas en este navegador.",
              )}
            </p>
          ) : (
            studies.map(([key, s]) => (
              <div className="study-manage-row" key={key}>
                <h3>{s.name}</h3>
                <p>
                  {t("Closes", "Cierra")}{" "}
                  {new Date(s.expiresAt).toLocaleDateString(language)}
                </p>
                <div className="row-actions">
                  <a href={`/test/${s.id}`} target="_blank" rel="noreferrer">
                    {t("View invitation", "Ver invitación")}
                  </a>
                  <button
                    className="secondary"
                    onClick={() => setDeleting([key, s])}
                  >
                    {t(
                      "Delete study & responses",
                      "Eliminar prueba y respuestas",
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
      <Footer language={language} />
      {deleting && (
        <Modal
          title={t(
            "Permanently delete this study?",
            "¿Eliminar esta prueba permanentemente?",
          )}
          onClose={() => setDeleting(null)}
        >
          <h2>{deleting[1].name}</h2>
          <p>
            {t(
              "This closes the link and deletes its stored responses. This cannot be undone.",
              "Esto cierra el enlace y elimina sus respuestas. No se puede deshacer.",
            )}
          </p>
          <button className="primary" disabled={busy} onClick={remove}>
            {t("Delete study & responses", "Eliminar prueba y respuestas")}
          </button>
        </Modal>
      )}
    </>
  );
}
