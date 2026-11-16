"use client";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Check, Quote, FileText } from "lucide-react";
import type { Language } from "@/lib/types";
import { Modal } from "./Shared";

const content = {
  en: {
    labels: ["The idea", "The feedback", "The next step"],
    title: [
      "Start with a question.",
      "Find the assumption.",
      "Make the next move clear.",
    ],
    body: [
      "“I’m building Clovo to help students improve their ideas. I haven’t tested whether they trust AI feedback enough to act on it.”",
      "A useful review should show where its advice comes from. Otherwise, a confident answer can feel like another opinion.",
      "Let someone inspect a finding and its original source. Then ask them to explain what they would change—and why.",
    ],
    note: [
      "An example using Clovo itself.",
      "A concern to test, not a measured result.",
      "A small test before another big feature.",
    ],
  },
  es: {
    labels: ["La idea", "Los comentarios", "El siguiente paso"],
    title: [
      "Empieza con una pregunta.",
      "Encuentra la suposición.",
      "Aclara el siguiente paso.",
    ],
    body: [
      "“Estoy creando Clovo para ayudar a estudiantes a mejorar sus ideas. Aún no he probado si confían en la IA lo suficiente para actuar.”",
      "Un análisis útil debe mostrar de dónde vienen sus consejos. De lo contrario, una respuesta segura puede parecer otra opinión.",
      "Deja que alguien examine un hallazgo y su fuente original. Después, pídele que explique qué cambiaría y por qué.",
    ],
    note: [
      "Un ejemplo con el propio Clovo.",
      "Una preocupación por probar, no un resultado medido.",
      "Una prueba pequeña antes de otra gran función.",
    ],
  },
};
export function ProductPreview({ language }: { language: Language }) {
  const [step, setStep] = useState(0),
    c = content[language],
    es = language === "es";
  return (
    <div className="product-preview">
      <div className="preview-caption">
        <span className="preview-mark">
          <i />
          <i />
          <i />
        </span>
        <span>
          {es
            ? "Una idea, vista con más claridad."
            : "One idea, seen more clearly."}
        </span>
      </div>
      <div
        className="preview-tabs"
        role="tablist"
        aria-label={es ? "Vista previa del proceso" : "Preview the process"}
      >
        {c.labels.map((label, i) => (
          <button
            key={label}
            role="tab"
            id={`preview-tab-${i}`}
            aria-selected={i === step}
            aria-controls="preview-panel"
            tabIndex={i === step ? 0 : -1}
            onClick={() => setStep(i)}
            onKeyDown={(e) => {
              if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const n =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? 2
                      : (step + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                setStep(n);
                document.getElementById(`preview-tab-${n}`)?.focus();
              }
            }}
          >
            <span>0{i + 1}</span>
            {label}
          </button>
        ))}
      </div>
      <div
        className="preview-sheet"
        id="preview-panel"
        role="tabpanel"
        aria-labelledby={`preview-tab-${step}`}
      >
        <div className="sheet-meta">
          <span>Clovo</span>
          <span>{es ? "Ejemplo guiado" : "Guided example"}</span>
        </div>
        <div key={step} className="preview-scene">
          <div className="sheet-icon">
            {step === 0 ? (
              <FileText size={25} />
            ) : step === 1 ? (
              <Quote size={26} />
            ) : (
              <Check size={27} />
            )}
          </div>
          <h3>{c.title[step]}</h3>
          <p>{c.body[step]}</p>
          <div className={`preview-annotation step-${step}`}>
            {step === 1 && <span className="source-tag">B1</span>}
            {c.note[step]}
          </div>
        </div>
      </div>
      <div className="preview-handoff">
        <div className="preview-agent-dots" aria-hidden="true">
          {[
            "#e9c75c",
            "#88b7ff",
            "#b9a1ee",
            "#f6877a",
            "#8cd8a0",
            "#75cbd0",
          ].map((color) => (
            <i key={color} style={{ background: color }} />
          ))}
        </div>
        <span>
          {es
            ? "Seis perspectivas. Tu decisión."
            : "Six perspectives. Your decision."}
        </span>
      </div>
    </div>
  );
}
export default function Walkthrough({
  language,
  onClose,
  onStart,
}: {
  language: Language;
  onClose: () => void;
  onStart: () => void;
}) {
  const [step, setStep] = useState(0),
    c = content[language],
    es = language === "es";
  const titles = es
    ? [
        "Explica lo que estás construyendo.",
        "Escucha perspectivas distintas.",
        "Pregunta de dónde viene el consejo.",
        "Decide qué probar después.",
      ]
    : [
        "Explain what you’re building.",
        "Hear different perspectives.",
        "Ask where the advice came from.",
        "Decide what to test next.",
      ];
  return (
    <Modal
      title={es ? "Un recorrido por Clovo" : "A walkthrough of Clovo"}
      onClose={onClose}
      wide
    >
      <div className="walkthrough">
        <aside>
          <span className="pill">
            {es
              ? "Ejemplo escrito · sin llamadas de IA"
              : "Written example · no AI calls"}
          </span>
          <h2>
            {es ? "De una idea a una decisión." : "From an idea to a decision."}
          </h2>
          <p>
            {es
              ? "Usamos el propio Clovo para mostrarte el proceso. No son entrevistas ni pruebas reales."
              : "We’re using Clovo itself to show you the process. This is an illustration, not interviews or a live review."}
          </p>
          <ol className="walkthrough-steps">
            {titles.map((title, i) => (
              <li key={title}>
                <button
                  aria-current={step === i ? "step" : undefined}
                  className={step === i ? "active" : ""}
                  onClick={() => setStep(i)}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {title}
                </button>
              </li>
            ))}
          </ol>
        </aside>
        <article className="walkthrough-page">
          <div key={step} className="walkthrough-scene">
            <span className="detail-label">
              {es ? "Paso" : "Step"} {step + 1} / 4
            </span>
            <h2>{titles[step]}</h2>
            {step === 0 && (
              <>
                <p>
                  {es
                    ? "Una descripción breve y un público concreto bastan para empezar. Los archivos aportan contexto cuando los tienes."
                    : "A short description and a specific audience are enough to begin. Files add context when you have them."}
                </p>
                <div className="walkthrough-source">
                  <span>
                    {es
                      ? "Tu descripción original"
                      : "Your original description"}
                  </span>
                  <blockquote>{c.body[0]}</blockquote>
                  <p>
                    {es
                      ? "Público: estudiantes con su primer proyecto."
                      : "Audience: students building their first project."}
                  </p>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <p>
                  {es
                    ? "Sora investiga la evidencia pública mientras Juno explora tres perspectivas simuladas. Rook luego cuestiona sus conclusiones."
                    : "Sora investigates public evidence while Juno explores three simulated perspectives. Rook then challenges their conclusions."}
                </p>
                <div className="walkthrough-personas">
                  {(es
                    ? [
                        ["Nina", "¿Me ayuda a decidir qué cambiar?"],
                        [
                          "Omar",
                          "¿Qué aporta frente a preguntarle a un amigo?",
                        ],
                        ["Tess", "¿Puedo entenderlo sin experiencia técnica?"],
                      ]
                    : [
                        ["Nina", "Does this help me decide what to change?"],
                        ["Omar", "What does it add beyond asking a friend?"],
                        [
                          "Tess",
                          "Can I understand it without technical experience?",
                        ],
                      ]
                  ).map(([name, quote]) => (
                    <div key={name}>
                      <strong>{name}</strong>
                      <p>“{quote}”</p>
                      <span>
                        {es ? "Perspectiva simulada" : "Simulated perspective"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="walkthrough-note">
                  {es
                    ? "Las simulaciones ayudan a plantear preguntas. No demuestran demanda."
                    : "Simulations help you ask better questions. They don’t establish demand."}
                </p>
              </>
            )}
            {step === 2 && (
              <>
                <p>
                  {es
                    ? "Una preocupación puede ser útil sin estar comprobada. Clovo te muestra la diferencia."
                    : "A concern can be useful without being proven. Clovo shows you the difference."}
                </p>
                <div className="walkthrough-finding">
                  <span className="basis-badge hypothesis">
                    {es ? "Suposición por probar" : "Assumption to test"}
                  </span>
                  <h3>
                    {es
                      ? "La confianza puede determinar si alguien actúa."
                      : "Trust may determine whether someone acts."}
                  </h3>
                  <p>
                    {es
                      ? "El texto original dice que aún no se ha probado. Mostrar la fuente puede ayudar; eso necesita una prueba con personas."
                      : "The original brief says this hasn’t been tested. Showing the source might help; that needs a test with people."}
                  </p>
                  <div className="walkthrough-source">
                    <span>B1 · {es ? "Texto original" : "Original text"}</span>
                    <blockquote>
                      {es
                        ? "“Aún no he probado si confían en la IA lo suficiente para actuar.”"
                        : "“I haven’t tested whether they trust AI feedback enough to act on it.”"}
                    </blockquote>
                  </div>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <p>
                  {es
                    ? "Leo propone un cambio concreto. Vera prepara preguntas neutrales que puedes compartir con personas reales."
                    : "Leo suggests a concrete change. Vera prepares neutral questions you can share with real people."}
                </p>
                <div className="walkthrough-plan">
                  <span className="plan-number">01</span>
                  <div>
                    <h3>
                      {es
                        ? "Haz que cada consejo se pueda comprobar."
                        : "Make each recommendation inspectable."}
                    </h3>
                    <p>
                      {es
                        ? "Añade un enlace desde el hallazgo hasta su fuente. Muestra claramente cuando algo es una hipótesis."
                        : "Link the finding to its source. Clearly label anything that is still a hypothesis."}
                    </p>
                    <div className="test-prompt">
                      <strong>{es ? "Compruébalo: " : "Check it: "}</strong>
                      {es
                        ? "Pide a un estudiante que encuentre la fuente y explique qué probaría después."
                        : "Ask a student to find the source and explain what they would test next."}
                    </div>
                  </div>
                </div>
                <p className="walkthrough-note">
                  {es
                    ? "Tú invitas a los participantes. Sus respuestas se guardan separadas de la IA."
                    : "You invite the participants. Their responses stay separate from the AI panel."}
                </p>
              </>
            )}
          </div>
          <div className="walkthrough-controls">
            <button
              className="text-button"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={18} />
              {es ? "Atrás" : "Back"}
            </button>
            {step < 3 ? (
              <button className="primary" onClick={() => setStep((s) => s + 1)}>
                {es ? "Siguiente" : "Next"}
                <ArrowRight size={18} />
              </button>
            ) : (
              <button className="primary" onClick={onStart}>
                {es ? "Probar mi propia idea" : "Test my own idea"}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </article>
      </div>
    </Modal>
  );
}
