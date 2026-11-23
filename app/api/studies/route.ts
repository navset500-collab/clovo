import { reserve, usageResponse } from "@/lib/usage";
import { studySchema } from "@/lib/validation";
import { newKey, hashKey, guard, limitedJson } from "@/lib/access";
import { writeJson, studyPath } from "@/lib/studies";
export async function POST(request: Request) {
  const denied = guard(request, "study-create", 8);
  if (denied) return Response.json({ error: denied }, { status: denied === "Invalid request origin." ? 403 : 429 });
  try {
    const parsed = studySchema.safeParse(await limitedJson(request, 15000));
    if (!parsed.success)
      return Response.json(
        { error: "Check the study description and questions." },
        { status: 400 },
      );
    try {
      await reserve(request, "study-create");
    } catch (e) {
      return usageResponse(e);
    }
    const id = newKey(),
      ownerKey = newKey(),
      createdAt = new Date().toISOString(),
      expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    await writeJson(studyPath(id), {
      ...parsed.data,
      id,
      createdAt,
      expiresAt,
      ownerHash: hashKey(ownerKey),
    });
    return Response.json(
      { id, ownerKey, name: parsed.data.name, expiresAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Could not create the feedback link. Please try again." },
      { status: 503 },
    );
  }
}
