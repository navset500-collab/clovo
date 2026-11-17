// Keep error identifiers in state, then translate at render time. Changing the
// language must also translate errors that were received before the switch.
const messages: Record<string, [string, string]> = {
  requests_network_daily: [
    "This Wi-Fi/network has reached its daily limit for this action. Please return after midnight UTC.",
    "Esta red o Wi-Fi ha alcanzado el límite diario para esta acción. Vuelve después de medianoche UTC.",
  ],
  requests_global_daily: [
    "Clovo has reached its shared daily limit for this action. Please return after midnight UTC.",
    "Clovo ha alcanzado el límite diario compartido para esta acción. Vuelve después de medianoche UTC.",
  ],
  requests_global_monthly: [
    "Clovo has reached its shared monthly limit for this action. Requests resume next month (UTC).",
    "Clovo ha alcanzado el límite mensual compartido para esta acción. Las solicitudes se reanudan el próximo mes (UTC).",
  ],
  network_daily: [
    "This Wi-Fi/network has used its review starts for today. An interrupted review can still use AI resources. Your draft is safe; try again after the daily reset.",
    "Esta red o Wi-Fi ha usado sus inicios de análisis de hoy. Un análisis interrumpido también puede consumir recursos de IA. Tu borrador está a salvo; vuelve después del reinicio diario.",
  ],
  network_completed: [
    "This Wi-Fi/network has received two completed reviews today. Come back after the daily reset. You can still read and export saved reports.",
    "Esta red o Wi-Fi ya recibió dos análisis completos hoy. Vuelve después del reinicio diario. Puedes seguir leyendo y exportando los informes guardados.",
  ],
  global_daily: [
    "Clovo’s shared daily AI budget is used up. This applies to everyone, even if you have not received a report. Your draft is safe. New reviews resume after the daily reset.",
    "Se agotó el presupuesto diario de IA compartido de Clovo. Se aplica a todas las personas, aunque no hayas recibido un informe. Tu borrador está a salvo. Los análisis se reanudan después del reinicio diario.",
  ],
  global_monthly: [
    "Clovo’s shared monthly AI budget is used up. New reviews resume next month (UTC). Saved reports, downloads and the walkthrough still work.",
    "Se agotó el presupuesto mensual de IA compartido de Clovo. Los análisis se reanudan el próximo mes (UTC). Los informes guardados, las descargas y el recorrido siguen disponibles.",
  ],
  team_busy: [
    "A review is already running on this network, or both review slots are busy. Wait for it to finish, then try again. This blocked request did not use a review start.",
    "Ya hay un análisis en curso en esta red, o los dos espacios están ocupados. Espera a que termine e inténtalo de nuevo. Esta solicitud bloqueada no consumió un inicio.",
  ],
  quota_unavailable: [
    "Clovo cannot safely check its usage allowance right now. No new AI work has started. Please try again later.",
    "Clovo no puede comprobar sus límites de uso de forma segura ahora. No se inició trabajo de IA. Inténtalo más tarde.",
  ],
  quota_busy: [
    "The allowance is being updated. Please try again in a moment. No new AI work has started.",
    "Se está actualizando el límite. Inténtalo en un momento. No se inició trabajo de IA.",
  ],
  study_limit: [
    "This feedback study has reached its response limit.",
    "Esta prueba ha alcanzado su límite de respuestas.",
  ],
  review_failed: [
    "The review stopped before a complete report was ready. Your brief is saved in this session. This is not a completed review; a retry is possible if review starts remain.",
    "El análisis se detuvo antes de completar el informe. Tu texto sigue en esta sesión. No cuenta como análisis completo; puedes reintentar si quedan inicios disponibles.",
  ],
  provider_quota: [
    "The AI provider’s own quota is currently exhausted. Your brief is still here. Try later; Clovo’s allowance and the provider’s quota are separate.",
    "Se agotó la cuota del proveedor de IA. Tu texto sigue aquí. Inténtalo más tarde; el límite de Clovo y la cuota del proveedor son independientes.",
  ],
  review_cancelled: [
    "Review stopped. Your brief is still here. This does not count as a completed review, but its start still uses the shared AI budget.",
    "Análisis detenido. Tu texto sigue aquí. No cuenta como análisis completo, pero su inicio sí consume parte del presupuesto de IA compartido.",
  ],
  review_paused: [
    "New reviews are paused. Your saved reports and the walkthrough still work.",
    "Los nuevos análisis están pausados. Tus informes guardados y el recorrido siguen disponibles.",
  ],
  invalid_input: [
    "Check your brief: add a project name, at least 50 words about the idea, and a specific audience. Use fewer files if the upload exceeds 4 MB.",
    "Revisa tu texto: añade un nombre, al menos 50 palabras sobre la idea y un público específico. Usa menos archivos si superas los 4 MB.",
  ],
  input_too_large: [
    "These materials exceed the safe reading limit. Use a shorter PDF, fewer images, or a focused text brief.",
    "Los archivos superan el límite de lectura. Usa un PDF más corto, menos imágenes o un texto más concreto.",
  ],
  invalid_access: [
    "The access code is incorrect.",
    "El código de acceso es incorrecto.",
  ],
  request_limit: [
    "Too many requests in a short time. Please wait before trying again.",
    "Demasiadas solicitudes en poco tiempo. Espera antes de volver a intentarlo.",
  ],
  invalid_origin: [
    "Please open Clovo directly and try again.",
    "Abre Clovo directamente e inténtalo de nuevo.",
  ],
};
const legacy: Record<string, string> = {
  "This network has reached its daily allowance. Please return after midnight UTC. Shared Wi-Fi uses the same allowance.":
    "network_daily",
  "Clovo has reached its daily allowance. New requests resume at midnight UTC. Your draft is still available.":
    "global_daily",
  "Clovo has reached its monthly allowance. New requests resume next month (UTC). Saved reports, export and the walkthrough still work.":
    "global_monthly",
  "The demo request limit has been reached. Please try later.": "request_limit",
  "Please try again later.": "request_limit",
  "Invalid request origin.": "invalid_origin",
  "Invalid access code.": "invalid_access",
  "This study has reached its response limit.": "study_limit",
  "This feedback study has reached its response limit.": "study_limit",
  "The AI provider has reached its quota. Please retry later.":
    "provider_quota",
  "These materials exceed the safe reading limit. Use a shorter PDF, fewer images, or a focused text brief.":
    "input_too_large",
  "Failed to fetch": "review_failed",
  "Load failed": "review_failed",
};
const studyMessages: [string, string][] = [
  ["Invalid study.", "La prueba no es válida."],
  [
    "This study was not found or has expired.",
    "No se encontró la prueba o ya caducó.",
  ],
  [
    "Invalid owner key.",
    "Este navegador no tiene una clave de propietario válida.",
  ],
  [
    "This feedback link has expired.",
    "Este enlace de comentarios ha caducado.",
  ],
  ["This feedback link is closed.", "Este enlace de comentarios está cerrado."],
  ["Unable to load this study.", "No se pudo cargar la prueba."],
  [
    "Please complete the feedback and consent checkbox.",
    "Completa los comentarios y marca la casilla de consentimiento.",
  ],
  [
    "Your response was not saved. Please try again.",
    "Tu respuesta no se guardó. Inténtalo de nuevo.",
  ],
  [
    "Deletion failed. Please retry.",
    "No se pudo eliminar. Inténtalo de nuevo.",
  ],
  [
    "Check the study description and questions.",
    "Revisa la descripción y las preguntas de la prueba.",
  ],
  [
    "Could not create the feedback link. Please try again.",
    "No se pudo crear el enlace. Inténtalo de nuevo.",
  ],
];
export function errorCode(value: string) {
  return legacy[value] || value;
}
export function errorText(value: string, language: "en" | "es") {
  const pair =
    messages[errorCode(value)] || studyMessages.find((p) => p.includes(value));
  return pair ? pair[language === "es" ? 1 : 0] : value;
}
export function reviewErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code = errorCode(message);
  return code !== message ? code : "review_failed";
}
