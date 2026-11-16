"use client";
import { useEffect, useRef } from "react";
import { X, ArrowUpRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { Language } from "@/lib/types";
export function Logo() {
  return (
    <span className="wordmark">
      <svg
        viewBox="0 0 48 48"
        width="42"
        height="42"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M29 6H16C9.4 6 4 11.4 4 18v7c0 5.8 4.2 10.6 9.7 11.8L20 42v-8"
          stroke="currentColor"
          strokeWidth="2.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity=".6"
        />
        <path
          d="M31 13h-7c-6.1 0-11 4.9-11 11v2c0 6.1 4.9 11 11 11h7l9 6v-11c2.5-2 4-5 4-8 0-6.1-4.9-11-11-11h-2Z"
          fill="currentColor"
        />
        <path
          d="M32 21h-8m8 7h-8"
          stroke="#102018"
          strokeWidth="2.7"
          strokeLinecap="round"
        />
      </svg>
      {BRAND.toLowerCase()}
    </span>
  );
}
export function Header({
  language,
  onLanguage,
  onHome,
  onBrain,
}: {
  language: Language;
  onLanguage: (l: Language) => void;
  onHome?: () => void;
  onBrain?: () => void;
}) {
  return (
    <>
      <a className="skip-link" href="#main">
        {language === "es" ? "Ir al contenido" : "Skip to content"}
      </a>
      <header className="site-header">
        {onHome ? (
          <button
            className="brand-button"
            onClick={onHome}
            aria-label="Clovo home"
          >
            <Logo />
          </button>
        ) : (
          <a href="/">
            <Logo />
          </a>
        )}
        <nav>
          {onBrain && (
            <button className="text-button nav-brain" onClick={onBrain}>
              {language === "es" ? "Conoce a los agentes" : "Meet the agents"}{" "}
              <ArrowUpRight size={18} />
            </button>
          )}
          <label className="language">
            <span className="sr-only">Language / Idioma</span>
            <select
              aria-label="Language / Idioma"
              title="Changes the interface and the language of your next review / Cambia la interfaz y el idioma del próximo análisis"
              value={language}
              onChange={(e) => onLanguage(e.target.value as Language)}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
        </nav>
      </header>
    </>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-header">
        <span>{title}</span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close / Cerrar"
        >
          <X size={23} />
        </button>
      </div>
      <div className="modal-content">{children}</div>
    </dialog>
  );
}
export function Footer({ language }: { language: Language }) {
  return (
    <footer>
      <Logo />
      <span>
        {language === "es"
          ? "Ideas cotidianas. Mejores posibilidades."
          : "Everyday ideas. Better possibilities."}
      </span>
      <a href={`/privacy?lang=${language}`}>
        {language === "es" ? "Privacidad y datos" : "Privacy & data"}
      </a>
    </footer>
  );
}
