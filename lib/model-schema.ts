import { z } from "zod";
// Nested array bounds can exceed Gemini's constrained-decoding state budget.
// Keep structure/enums in the provider schema and cardinality guidance in prose;
// the ORIGINAL Zod schema still validates every returned result on our server.
export function compactModelSchema(schema: z.ZodType) {
  const raw = z.toJSONSchema(schema, { unrepresentable: "any" });
  function visit(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(source)) {
      if (["minItems", "maxItems", "minLength", "maxLength", "minimum", "maximum"].includes(key)) continue;
      result[key] = visit(child);
    }
    if (source.type === "array") {
      const min = source.minItems, max = source.maxItems;
      const guidance = min !== undefined && min === max ? `Return exactly ${min} items.`
        : `${min === undefined ? "" : `Return at least ${min} items. `}${max === undefined ? "" : `Return no more than ${max} items.`}`;
      if (guidance) result.description = [source.description, guidance].filter(Boolean).join(" ");
    }
    return result;
  }
  return visit(raw) as ReturnType<typeof z.toJSONSchema>;
}
