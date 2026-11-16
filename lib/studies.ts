import { get, put, list, del } from "@vercel/blob";
import type { Study, HumanResponse } from "./types";
export type StoredStudy = Study & { ownerHash: string };
export async function readJson<T>(path: string): Promise<T | null> {
  const result = await get(path, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).json();
}
export const studyPath = (id: string) => `studies/${id}/study.json`;
export const writeJson = (path: string, value: unknown) =>
  put(path, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
    ttlDays: 7,
  });
export async function responsesFor(id: string) {
  const { blobs } = await list({
    prefix: `studies/${id}/responses/`,
    limit: 200,
  });
  return (
    await Promise.all(blobs.map((b) => readJson<HumanResponse>(b.pathname)))
  )
    .filter((r): r is HumanResponse => !!r)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function deleteStudy(id: string) {
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: `studies/${id}/`, limit: 1000, cursor });
    if (page.blobs.length) await del(page.blobs.map((b) => b.url));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}
