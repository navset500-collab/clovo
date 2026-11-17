import { modelName } from "@/lib/model";
import { readAllowance } from "@/lib/usage";
import { guard } from "@/lib/access";

export async function GET(request: Request) {
  const denied = guard(request, "status", 90);
  if (denied) return Response.json({ error: denied }, { status: 429 });
  let allowance = null;
  try {
    allowance = await readAllowance(request);
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
    { headers: { "Cache-Control": "no-store" } },
  );
}
