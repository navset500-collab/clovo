"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import type { Language, Study } from "@/lib/types";
import { Header, Footer } from "./Shared";
export default function Participant({ id }: { id: string }) {
  const [study, setStudy] = useState<Study | null>(null),
    [lang, setLang] = useState<Language>("en"),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [use, setUse] = useState(""),
    [frequency, setFrequency] = useState(""),
    [problem, setProblem] = useState(""),
    [feedback, setFeedback] = useState(""),
    [answers, setAnswers] = useState<string[]>([]),
    [consent, setConsent] = useState(false),
    [website, setWebsite] = useState("");
  const t = (a: string, b: string) => (lang === "es" ? b : a);
  useEffect(() => {
    fetch(`/api/studies/${id}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setStudy(j.study);
        setLang(j.study.language);
        setAnswers(j.study.questions.map(() => ""));
        try {
          if (localStorage.getItem(`clovo-sent-${id}`)) setDone(true);
        } catch {}
      })
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/studies/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          use,
          frequency,
          problem,
          feedback,
          answers,
          consent,
          website,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setDone(true);
      try {
        localStorage.setItem(`clovo-sent-${id}`, "1");
      } catch {}
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header language={lang} onLanguage={setLang} />
      <main className="participant" id="main">
        <a className="back-link" href="/">
          ← {t("About Clovo", "Acerca de Clovo")}
        </a>
        {done ? (
          <div className="thank-you">
            <Check size={40} />
            <h1>{t("That’s a real contribution.", "Tu opinión cuenta.")}</h1>
            <p>
              {t(
                "Your feedback has been submitted to the builder. Thanks for helping an idea get better.",
                "Tus comentarios se enviaron al creador. Gracias por ayudar a mejorar una idea.",
              )}
            </p>
          </div>
        ) : study ? (
          <>
            <div className="participant-intro">
              <span className="pill">
                {t(
                  "An invitation to give honest feedback",
                  "Una invitación a dar tu opinión",
                )}
              </span>
              <h1>{study.name}</h1>
              <p className="large-copy">{study.description}</p>
              {study.url && (
                <a
                  className="primary"
                  href={study.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Open the prototype", "Abrir el prototipo")}
                  <ArrowUpRight size={20} />
                </a>
              )}
              <div className="task-card">
                <strong>{t("Try this", "Prueba esto")}</strong>
                <p>{study.task}</p>
              </div>
            </div>
            <form onSubmit={submit} className="participant-form">
              <h2>{t("What do you think?", "¿Qué opinas?")}</h2>
              <p>
                {t(
                  "Honest criticism is helpful. No name, email or account required. Do not include sensitive or identifying information.",
                  "Las críticas sinceras son útiles. No necesitas nombre, correo ni cuenta. No incluyas información sensible o identificable.",
                )}
              </p>
              <label>
                {t("Would you try this product?", "¿Probarías este producto?")}
                <select
                  required
                  value={use}
                  onChange={(e) => setUse(e.target.value)}
                >
                  <option value="">
                    {t("Choose an answer", "Elige una respuesta")}
                  </option>
                  <option value="yes">{t("Yes", "Sí")}</option>
                  <option value="maybe">{t("Maybe", "Quizás")}</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label>
                {t(
                  "How often do you face this problem?",
                  "¿Con qué frecuencia tienes este problema?",
                )}
                <select
                  required
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option value="">
                    {t("Choose an answer", "Elige una respuesta")}
                  </option>
                  {["daily", "weekly", "monthly", "rarely", "never"].map(
                    (v, i) => (
                      <option key={v} value={v}>
                        {t(
                          ["Daily", "Weekly", "Monthly", "Rarely", "Never"][i],
                          [
                            "A diario",
                            "Semanalmente",
                            "Mensualmente",
                            "Rara vez",
                            "Nunca",
                          ][i],
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                {t(
                  "What do you currently do instead?",
                  "¿Qué haces actualmente para resolverlo?",
                )}
                <textarea
                  required
                  minLength={5}
                  maxLength={1200}
                  rows={3}
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                />
              </label>
              {study.questions.map((q, i) => (
                <label key={i}>
                  {q}
                  <textarea
                    maxLength={1000}
                    rows={3}
                    value={answers[i] || ""}
                    onChange={(e) =>
                      setAnswers((a) =>
                        a.map((v, j) => (i === j ? e.target.value : v)),
                      )
                    }
                  />
                </label>
              ))}
              <label>
                {t(
                  "What would you improve, change or remove?",
                  "¿Qué mejorarías, cambiarías o eliminarías?",
                )}
                <textarea
                  required
                  minLength={10}
                  maxLength={2500}
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </label>
              <label className="honeypot" aria-hidden="true">
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
              <label className="checkbox-row">
                <input
                  required
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                {t(
                  "I agree to share these answers with the study creator. They are stored privately and scheduled for deletion after seven days.",
                  "Acepto compartir estas respuestas con el creador. Se guardan de forma privada y se programan para eliminarse después de siete días.",
                )}
              </label>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button
                className="primary"
                disabled={busy || !consent}
                type="submit"
              >
                {busy
                  ? t("Submitting…", "Enviando…")
                  : t("Send honest feedback", "Enviar comentarios")}
              </button>
            </form>
          </>
        ) : error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : (
          <p>{t("Loading the study…", "Cargando la prueba…")}</p>
        )}
      </main>
      <Footer language={lang} />
    </>
  );
}
