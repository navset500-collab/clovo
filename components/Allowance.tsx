"use client";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { errorText } from "@/lib/messages";
import type { allowanceSnapshot } from "@/lib/usage-policy";
import type { Language } from "@/lib/types";
export type AllowanceSnapshot = ReturnType<typeof allowanceSnapshot>;
export default function Allowance({
  language,
  onCode,
  onBlocked,
}: {
  language: Language;
  onCode: (required: boolean) => void;
  onBlocked: (blocked: boolean) => void;
}) {
  const [usage, setUsage] = useState<AllowanceSnapshot | null>(null);
  const [busy, setBusy] = useState(true);
  const [paused, setPaused] = useState(false);
  const es = language === "es",
    t = (a: string, b: string) => (es ? b : a);
  async function refresh() {
    setBusy(true);
    onBlocked(true);
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setUsage(data.allowance);
      setPaused(!data.ready);
      onBlocked(!data.ready || Boolean(data.allowance?.code));
      onCode(Boolean(data.requiresCode));
    } catch {
      setUsage(null);
      onBlocked(false);
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
        <strong>{t("Before you start", "Antes de empezar")}</strong>
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
      {paused && <p role="status">{errorText("review_paused", language)}</p>}
      {busy && !usage ? (
        <p>
          {t(
            "Checking the available review allowance…",
            "Comprobando los análisis disponibles…",
          )}
        </p>
      ) : !usage ? (
        <p>
          {t(
            "The live allowance could not be loaded. Clovo will check it again before any AI work starts.",
            "No se pudo cargar el límite actual. Clovo lo comprobará antes de iniciar la IA.",
          )}
        </p>
      ) : (
        <>
          {usage.code ? (
            <p role="status">{errorText(usage.code, language)}</p>
          ) : (
            <div className="allowance-stats">
              <div>
                <strong>
                  {Math.min(
                    usage.networkRemaining,
                    usage.dailyRemaining,
                    usage.monthlyRemaining,
                  )}
                </strong>
                <span>
                  {t(
                    "starts available on this Wi-Fi",
                    "inicios disponibles en esta red",
                  )}
                </span>
              </div>
              <div>
                <strong>{usage.reviewsRemaining}</strong>
                <span>
                  {t(
                    "completed reviews remaining today",
                    "análisis completos restantes hoy",
                  )}
                </span>
              </div>
            </div>
          )}
          <p>
            {t("Next reset: ", "Próximo reinicio: ")}
            {new Date(usage.resetAt).toLocaleString(es ? "es" : "en", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            })}
            .
          </p>
        </>
      )}
      <p>
        {t(
          "A failed or clarification-only run is not a completed review. Each network has up to 3 starts for 2 completed reviews a day. Everyone shares Clovo’s budget of 5 starts a day and 20 a month. Shared Wi-Fi shares this limit.",
          "Un análisis fallido o que solo pide aclaraciones no cuenta como completo. Cada red tiene hasta 3 inicios para 2 análisis completos al día. Todo Clovo comparte 5 inicios al día y 20 al mes. Un Wi-Fi compartido tiene el mismo límite.",
        )}
      </p>
      <p className="allowance-footnote">
        {t(
          "Availability can change while other people use Clovo. A blocked request makes no AI calls.",
          "La disponibilidad puede cambiar mientras otras personas usan Clovo. Una solicitud bloqueada no llama a la IA.",
        )}
      </p>
    </section>
  );
}
