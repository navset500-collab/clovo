import { ModelError } from "./model-error.ts";
import type { PanelProfile, Persona } from "./types.ts";
export const PANEL_SIZE = 5;
export const PANEL_LENSES = [
  "core-value",
  "switching-habits",
  "access",
  "trust",
  "low-need",
] as const;
export const PANEL_LABELS = {
  "core-value": ["Core value", "Valor principal"],
  "switching-habits": ["Existing habits", "Hábitos actuales"],
  access: ["Access & constraints", "Acceso y limitaciones"],
  trust: ["Trust & control", "Confianza y control"],
  "low-need": ["Reasons not to use it", "Motivos para no usarlo"],
} as const;
export function checkPanelCoverage(profiles: PanelProfile[]) {
  if (
    profiles.length !== PANEL_SIZE ||
    new Set(profiles.map((p) => p.lens)).size !== PANEL_SIZE ||
    new Set(profiles.map((p) => p.name.trim().toLowerCase())).size !==
      PANEL_SIZE
  )
    throw new ModelError("panel_invalid");
  return [...profiles].sort(
    (a, b) => PANEL_LENSES.indexOf(a.lens) - PANEL_LENSES.indexOf(b.lens),
  );
}
// Keep partial, useful work. A failed model call is never replaced by a made-up
// response. Any retry is subject to the shared model budget. Lane indices remain stable.
export async function collectPanel(
  profiles: PanelProfile[],
  evaluate: (p: PanelProfile, i: number) => Promise<Persona>,
  onFailure: (i: number) => void,
  signal: AbortSignal,
) {
  const results = await Promise.allSettled(profiles.map(evaluate));
  if (signal.aborted) throw new Error("Analysis stopped.");
  const personas: Persona[] = [],
    unavailable: number[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") personas.push({ ...r.value, panelIndex: i });
    else {
      unavailable.push(i);
      onFailure(i);
    }
  });
  return { personas, unavailable };
}
