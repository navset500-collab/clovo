// Keep error identifiers in state, then translate at render time. Changing the
// language must also translate errors that were received before the switch.
const messages: Record<string, [string, string]> = {
  allowance_check_unavailable: [
    "Clovo couldn’t reach the review counter. This does not mean you used five reviews. Keep your brief here and select Check again in a moment. No AI has started and no review was used.",
    "Clovo no pudo consultar el contador de análisis. Esto no significa que hayas usado cinco análisis. Conserva tu texto aquí y pulsa Volver a consultar en un momento. No se inició la IA ni se consumió un análisis.",
  ],
  allowance_check_limited: [
    "Too many availability checks were made on this connection. Please try again later. No AI has started; this is not your five-review limit.",
    "Se hicieron demasiadas consultas de disponibilidad desde esta conexión. Vuelve a intentarlo más tarde. No se inició la IA; este no es tu límite de cinco análisis.",
  ],
  completion_save_failed: [
    "Clovo prepared the analysis but could not confirm its completed-review record. Keep your text in this tab and check availability before retrying. This is a storage problem, not feedback on your idea.",
    "Clovo preparó el análisis pero no pudo confirmar su registro. Conserva el texto en esta pestaña y consulta la disponibilidad antes de reintentar. Es un problema de almacenamiento, no una evaluación de tu idea.",
  ],
  visitor_completed: [
    "You have completed all 5 reviews in this browser’s five-hour window. Your next 5 become available at the reset time below.",
    "Has completado los 5 análisis de este navegador en el periodo de cinco horas. Los próximos 5 estarán disponibles a la hora indicada.",
  ],
  visitor_busy: [
    "A review is already running in this browser. Wait for it to finish before starting another. This blocked request did not use a review.",
    "Ya hay un análisis en curso en este navegador. Espera a que termine. Esta solicitud bloqueada no consumió un análisis.",
  ],
  service_provider_unavailable: [
    "The AI service recently failed, so Clovo has paused new attempts for two minutes. Your personal completed-review allowance is unchanged. Try after the time below.",
    "El servicio de IA falló recientemente, por lo que Clovo pausó los intentos durante dos minutos. Tu límite personal de análisis completos no ha cambiado. Vuelve después de la hora indicada.",
  ],
  review_timeout: [
    "The analysis took too long and was stopped. Your text is still in this tab. No completed review was counted. Try again later or focus the materials on one main question.",
    "El análisis tardó demasiado y se detuvo. Tu texto sigue en esta pestaña. No se contó como completo. Vuelve más tarde o centra los materiales en una pregunta principal.",
  ],
  review_connection: [
    "Clovo could not maintain the connection to the analysis service. Keep this tab open to retain your text, check your connection, and check availability before retrying.",
    "Clovo no pudo mantener la conexión con el servicio de análisis. Conserva esta pestaña para mantener tu texto, revisa la conexión y consulta la disponibilidad antes de reintentar.",
  ],
  stream_interrupted: [
    "The connection ended before Clovo received a report. Your text is still in this tab. Check availability before trying again; this message does not mean you used five completed reviews.",
    "La conexión terminó antes de recibir un informe. Tu texto sigue en esta pestaña. Consulta la disponibilidad antes de reintentar; este aviso no significa que hayas completado cinco análisis.",
  ],
  panel_invalid: [
    "The simulated panel could not produce five distinct profiles that passed validation. No complete report was recorded. Your text is still here.",
    "El panel simulado no produjo cinco perfiles distintos que pasaran la validación. No se registró un informe completo. Tu texto sigue aquí.",
  ],
  model_budget: [
    "This review reached its fixed AI attempt budget. Remaining work has stopped.",
    "El análisis alcanzó su presupuesto fijo de intentos de IA. El trabajo restante se detuvo.",
  ],
  provider_unavailable: [
    "The AI service failed to return a usable response. This is a service problem, not feedback on your idea. Your text is still in this tab; no completed review was counted. Wait a few minutes, then check availability.",
    "El servicio de IA no devolvió una respuesta utilizable. Es un problema del servicio, no una evaluación de tu idea. Tu texto sigue en esta pestaña; no se contó un análisis completo. Espera unos minutos y consulta la disponibilidad.",
  ],
  provider_rejected: [
    "The AI provider rejected the review request. This needs a configuration check; retrying the same brief is unlikely to help right now.",
    "El proveedor de IA rechazó la solicitud. Hay que revisar la configuración; repetir el mismo texto probablemente no ayude ahora.",
  ],
  input_check_unavailable: [
    "The provider’s input-size safety check failed. This run stopped before generating a review. Try again later if starts remain.",
    "Falló la comprobación de tamaño del proveedor. El proceso se detuvo antes de generar un análisis. Inténtalo más tarde si quedan inicios.",
  ],
  model_incomplete: [
    "The AI returned an incomplete response. Your brief is still here. No completed review was recorded; you can retry if starts remain.",
    "La IA devolvió una respuesta incompleta. Tu texto sigue aquí. No se registró un análisis completo; puedes reintentar si quedan inicios.",
  ],
  model_format: [
    "The AI response did not pass Clovo’s structure checks. Your brief is still here. No completed review was recorded; you can retry if starts remain.",
    "La respuesta de IA no pasó las comprobaciones de estructura. Tu texto sigue aquí. No se registró un análisis completo; puedes reintentar si quedan inicios.",
  ],
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
    "Clovo encountered an unexpected error and could not finish the report. The exact cause is not available in this message. Your text is still in this tab. Check availability before retrying.",
    "Clovo encontró un error inesperado y no pudo terminar el informe. Este aviso no incluye la causa exacta. Tu texto sigue en esta pestaña. Consulta la disponibilidad antes de reintentar.",
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
  "Failed to fetch": "review_connection",
  "Load failed": "review_connection",
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
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    messages[error.code]
  )
    return error.code;
  if (error instanceof Error && error.name === "TimeoutError")
    return "review_timeout";
  if (error instanceof Error && error.name === "AbortError")
    return "review_cancelled";
  if (error instanceof TypeError && /fetch|network|load/i.test(error.message))
    return "review_connection";
  const message = error instanceof Error ? error.message : "";
  if (messages[message]) return message;
  const code = errorCode(message);
  return code !== message ? code : "review_failed";
}

export function errorHeading(value: string, language: "en" | "es") {
  const code = errorCode(value),
    es = language === "es";
  if (code === "visitor_completed")
    return es
      ? "Has completado tus cinco análisis."
      : "You’ve completed your five reviews.";
  if (code.startsWith("global_"))
    return es
      ? "Clovo alcanzó su presupuesto compartido."
      : "Clovo’s shared budget is used up.";
  if (
    [
      "provider_unavailable",
      "service_provider_unavailable",
      "provider_quota",
    ].includes(code)
  )
    return es
      ? "El servicio de IA no está disponible."
      : "The AI service is unavailable.";
  if (code === "review_timeout")
    return es ? "El análisis tardó demasiado." : "The analysis took too long.";
  if (["stream_interrupted", "review_connection"].includes(code))
    return es
      ? "Se interrumpió la conexión."
      : "The review connection was interrupted.";
  if (code === "review_cancelled")
    return es ? "Análisis detenido." : "Review stopped.";
  return es
    ? "Clovo no pudo terminar el informe."
    : "Clovo couldn’t finish the report.";
}
