import { modelName } from "@/lib/model";
import { readAllowance } from "@/lib/usage";
import { visitorIdentity } from "@/lib/visitor-quota";
import { guard } from "@/lib/access";

export async function GET(request: Request) {
  const denied = guard(request, "status", 90);
  if (denied) return Response.json({ error: denied }, { status: 429 });
  const visitor = process.env.BLOB_READ_WRITE_TOKEN
    ? visitorIdentity(request, process.env.BLOB_READ_WRITE_TOKEN)
    : null;
  let allowance = null;
  try {
    if (visitor) allowance = await readAllowance(request, visitor.key);
  } catch {
    /* Fail closed on POST. */
  }
  return Response.json(
    {
      ready:
        Boolean(
          process.env.GEMINI_API_KEY && process.env.BLOB_READ_WRITE_TOKEN,
        ) && process.env.ANALYSIS_ENABLED !== "false",
      model: modelName(),
      requiresCode: Boolean(process.env.ANALYSIS_ACCESS_CODE),
      allowance,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        ...(visitor?.cookie ? { "Set-Cookie": visitor.cookie } : {}),
      },
    },
  );
}
