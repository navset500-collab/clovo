"use client";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { errorText } from "@/lib/messages";
import type { readAllowance } from "@/lib/usage";
import type { Language } from "@/lib/types";
export type AllowanceSnapshot = Awaited<ReturnType<typeof readAllowance>>;
export default function Allowance({
  language,
  onCode,
  onBlocked,
}: {
  language: Language;
  onCode: (required: boolean) => void;
  onBlocked: (blocked: boolean) => void;
}) {
  const [usage, setUsage] = useState<AllowanceSnapshot | null>(null),
    [busy, setBusy] = useState(true),
    [paused, setPaused] = useState(false);
  const es = language === "es",
    t = (a: string, b: string) => (es ? b : a);
  const date = (value: string) =>
    new Date(value).toLocaleString(es ? "es" : "en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  async function refresh() {
    setBusy(true);
    onBlocked(true);
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setUsage(data.allowance);
      setPaused(!data.ready);
      onBlocked(!data.ready || !data.allowance || Boolean(data.allowance.code));
      onCode(Boolean(data.requiresCode));
    } catch {
      setUsage(null);
      onBlocked(true);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <section
      className={`allowance-card ${usage?.code ? "limited" : ""}`}
      aria-label={t("Review allowance", "Límite de análisis")}
    >
      <div className="allowance-heading">
        <ShieldCheck size={21} />
        <strong>{t("Your five reviews", "Tus cinco análisis")}</strong>
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={refresh}
          aria-label={t("Refresh allowance", "Actualizar límite")}
        >
          <RefreshCw size={17} className={busy ? "spin" : ""} />
          {t("Check", "Consultar")}
        </button>
      </div>
      {busy && !usage ? (
        <p>{t("Checking your allowance…", "Comprobando tu límite…")}</p>
      ) : !usage ? (
        <p role="status">
          {t(
            "We couldn’t check your allowance. Press Check before starting; no AI work has started.",
            "No pudimos comprobar tu límite. Pulsa Consultar antes de empezar; no se ha iniciado la IA.",
          )}
        </p>
      ) : (
        <>
          <div className="allowance-stats">
            <div>
              <strong>{usage.reviewsRemaining}</strong>
              <span>
                {t(
                  "of 5 completed reviews remaining",
                  "de 5 análisis completos disponibles",
                )}
              </span>
            </div>
            <div>
              <strong>5h</strong>
              <span>{t("per review window", "por periodo de análisis")}</span>
            </div>
          </div>
          <p>
            {usage.personalResetAt
              ? `${t("Your next 5 reviews: ", "Tus próximos 5 análisis: ")}${date(usage.personalResetAt)}.`
              : t(
                  "Your five-hour window starts when you begin a review.",
                  "Tu periodo de cinco horas empieza al iniciar un análisis.",
                )}
          </p>
          {usage.personalCode && (
            <p role="status">{errorText(usage.personalCode, language)}</p>
          )}
          {usage.serviceCode && (
            <div className="service-availability" role="status">
              <strong>
                {t(
                  "Service availability — separate from your five reviews",
                  "Disponibilidad del servicio — independiente de tus cinco análisis",
                )}
              </strong>
              <p>{errorText(usage.serviceCode, language)}</p>
              {usage.serviceResetAt && (
                <p>
                  {t("Check again after: ", "Vuelve a consultar después de: ")}
                  {date(usage.serviceResetAt)}.
                </p>
              )}
            </div>
          )}
        </>
      )}
      {paused && <p role="status">{errorText("review_paused", language)}</p>}
      <p>
        {t(
          "Only completed reports use one of your five reviews. Failed, cancelled and clarification-only attempts do not. Your allowance is tied to this browser, so people sharing your Wi-Fi have separate review counts.",
          "Solo los informes completos consumen uno de tus cinco análisis. Los fallos, cancelaciones y solicitudes de aclaración no cuentan. El límite corresponde a este navegador; quienes comparten tu Wi-Fi tienen contadores separados.",
        )}
      </p>
      <p className="allowance-footnote">
        {t(
          "Clovo also has a shared spending ceiling of 20 review attempts per month. Failed attempts can still cost money, so they use that separate service budget. A service pause is not a claim that you used five reviews.",
          "Clovo también tiene un presupuesto compartido de 20 intentos al mes. Los intentos fallidos pueden costar dinero y consumen ese presupuesto independiente. Una pausa del servicio no significa que hayas usado cinco análisis.",
        )}
      </p>
    </section>
  );
}
