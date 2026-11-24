import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
export const newKey = () => randomBytes(24).toString("hex");
export const hashKey = (key: string) =>
  createHash("sha256").update(key).digest("hex");
export function owns(key: string, hash: string) {
  const a = Buffer.from(hashKey(key)),
    b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const validId = (id: string) => /^[a-f0-9]{48}$/.test(id);
const hits = new Map<string, { count: number; until: number }>();
// Best-effort local burst brake only. The managed Vercel WAF enforces the
// distributed API limit; completed reviews use the atomic durable ledger.
export function guard(request: Request, bucket: string, max = 20, now = Date.now()) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return "Invalid request origin.";
  if (origin) {
    try {
      if (
        new URL(origin).host !==
        (request.headers.get("host") || new URL(request.url).host)
      )
        return "Invalid request origin.";
    } catch {
      return "Invalid request origin.";
    }
  }
  for (const [k, v] of hits) if (v.until <= now) hits.delete(k);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const k = `${bucket}:${ip}`;
  const hit = hits.get(k) || { count: 0, until: now + 60000 };
  if (hit.count >= max)
    return "Too many requests. Wait one minute before trying again.";
  if (hits.size > 10000) return "Please try again later.";
  hits.set(k, { ...hit, count: hit.count + 1 });
  return null;
}
export async function limitedJson(request: Request, max = 4000000) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new Error("Use application/json.");
  if (Number(request.headers.get("content-length")) > max)
    throw new Error("Upload is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > max) {
        await reader.cancel();
        throw new Error("Upload is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function sameSecret(a: string, b: string) {
  return timingSafeEqual(Buffer.from(hashKey(a)), Buffer.from(hashKey(b)));
}
