// Fictional personas must stay within an explicitly parent-specific audience.
// This does not infer any real person's identity from their name.
export function parentAudience(audience: string): "mothers" | "fathers" | null {
  const mother = /\b(moms?|mothers?|madres?|mamás?)\b/i.test(audience),
    father = /\b(dads?|fathers?|padres?|papás?)\b/i.test(audience);
  return mother && !father ? "mothers" : father && !mother ? "fathers" : null;
}
export function contradictsAudience(audience: string, text: string) {
  const group = parentAudience(audience);
  return group === "mothers"
    ? /\b(father|dad|padre|papá)\b/i.test(text)
    : group === "fathers"
      ? /\b(mother|mom|madre|mamá)\b/i.test(text)
      : false;
}
export function alignFictionalProfiles<
  T extends { name: string; role: string; situation: string; focus: string },
>(profiles: T[], audience: string): T[] {
  const group = parentAudience(audience),
    names =
      group === "mothers"
        ? ["Nina", "Maya", "Lucía", "Sofia", "Elena"]
        : group === "fathers"
          ? ["Daniel", "Omar", "Leo", "Mateo", "Elias"]
          : null;
  return profiles.map((p, i) => ({
    ...p,
    name: contradictsAudience(audience, p.role + " " + p.situation)
      ? names?.[i] || p.name
      : p.name,
    role: contradictsAudience(audience, p.role)
      ? audience.slice(0, 150)
      : p.role,
    situation: contradictsAudience(audience, p.situation)
      ? `A fictional member of this exact audience: ${audience}. Explore this constraint: ${p.focus}`
      : p.situation,
  }));
}
