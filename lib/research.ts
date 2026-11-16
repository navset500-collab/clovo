import type { Source } from "./types.ts";
export function normalizeExcerpt(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}
export function matchResearchCitations(
  citations: { sourceId: string; quote: string }[],
  sources: Source[],
) {
  return citations.filter((c) => {
    const source = sources.find((s) => s.id === c.sourceId);
    const quote = normalizeExcerpt(c.quote);
    return (
      quote.length >= 12 &&
      !!source?.excerpt &&
      normalizeExcerpt(source.excerpt).includes(quote)
    );
  });
}
export function safeResearchQuery(query: string, projectName = "") {
  let q = query
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "");
  if (projectName.trim())
    q = q
      .split(
        new RegExp(projectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
      )
      .join("");
  return q.replace(/\s+/g, " ").trim().slice(0, 250);
}
export function sourceFromResult(item: unknown, index: number): Source | null {
  if (!item || typeof item !== "object") return null;
  const r = item as Record<string, unknown>;
  if (
    typeof r.url !== "string" ||
    typeof r.content !== "string" ||
    r.content.trim().length < 30
  )
    return null;
  try {
    const url = new URL(r.url);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return {
      id: `s${index + 1}`,
      title: typeof r.title === "string" ? r.title.slice(0, 250) : url.hostname,
      url: url.href,
      excerpt: r.content.slice(0, 3500),
      retrievedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
