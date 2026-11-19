"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { errorText } from "@/lib/messages";
import {
  checkAllowance,
  AllowanceCheckError,
  type AllowanceSnapshot,
} from "@/lib/allowance-status";
import type { Language } from "@/lib/types";
export type { AllowanceSnapshot } from "@/lib/allowance-status";
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
    [paused, setPaused] = useState(false),
    [retrying, setRetrying] = useState(false),
    [failure, setFailure] = useState("");
  const pending = useRef<AbortController | null>(null);
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
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setFailure("");
    setRetrying(false);
    setUsage(null);
    setPaused(false);
    onBlocked(true);
    try {
      const data = await checkAllowance(controller.signal, () =>
        setRetrying(true),
      );
      if (controller.signal.aborted) return;
      setUsage(data.allowance);
      setPaused(!data.ready);
      onBlocked(!data.ready || !data.allowance || Boolean(data.allowance.code));
      onCode(Boolean(data.requiresCode));
    } catch (error) {
      if (controller.signal.aborted) return;
      setUsage(null);
      setFailure(
        error instanceof AllowanceCheckError
          ? error.code
          : "allowance_check_unavailable",
      );
      onBlocked(true);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
    return () => pending.current?.abort();
  }, []);
  return (
    <section
      className={`allowance-card ${usage?.code ? "limited" : ""}`}
      aria-label={t("Review allowance", "Límite de análisis")}
    >
      <div className="allowance-heading">
        <ShieldCheck size={21} aria-hidden="true" />
        <strong>
          {t("Review availability", "Disponibilidad de análisis")}
        </strong>
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={refresh}
          aria-label={t("Refresh allowance", "Actualizar límite")}
        >
          <RefreshCw
            size={17}
            aria-hidden="true"
            className={busy ? "spin" : ""}
          />
          {t("Check again", "Volver a consultar")}
        </button>
      </div>
      {busy && !usage ? (
        <p role="status">
          {retrying
            ? t(
                "The first check didn’t connect. Trying once more…",
                "La primera consulta no se conectó. Intentando una vez más…",
              )
            : t(
                "Checking your available reviews…",
                "Comprobando tus análisis disponibles…",
              )}
        </p>
      ) : failure ? (
        <p role="status">{errorText(failure, language)}</p>
      ) : usage ? (
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
      ) : null}
      {paused && <p role="status">{errorText("review_paused", language)}</p>}
      <p>
        {t(
          "Only completed reports use one of your five reviews. Failed, cancelled and clarification-only attempts do not. Your allowance is tied to this browser, so people sharing your Wi-Fi have separate review counts.",
          "Solo los informes completos consumen uno de tus cinco análisis. Los fallos, cancelaciones y solicitudes de aclaración no cuentan. El límite corresponde a este navegador; quienes comparten tu Wi-Fi tienen contadores separados.",
        )}
      </p>
      <p className="allowance-footnote">
        {t(
          "Clovo runs on free services. To conserve their quotas, the app allows 20 review attempts per month across all visitors. Failed attempts may use those resources, but do not use one of your five completed reviews. Checking availability uses no AI and does not count as an attempt.",
          "Clovo utiliza servicios gratuitos. Para conservar sus cuotas, la aplicación permite 20 intentos de análisis al mes entre todos los visitantes. Los intentos fallidos pueden consumir esos recursos, pero no uno de tus cinco análisis completos. Consultar la disponibilidad no usa IA ni cuenta como intento.",
        )}
      </p>
    </section>
  );
}
