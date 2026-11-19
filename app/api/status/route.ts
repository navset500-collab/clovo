import { modelName } from "@/lib/model";
import { readAllowance } from "@/lib/usage";
import { visitorIdentity } from "@/lib/visitor-quota";
import { guard } from "@/lib/access";
import { errorCode } from "@/lib/messages";

export async function GET(request: Request) {
  const denied = guard(request, "status", 90);
  if (denied)
    return Response.json(
      { code: errorCode(denied) },
      {
        status: denied === "Invalid request origin." ? 403 : 429,
        headers: { "Cache-Control": "no-store", "Retry-After": "60" },
      },
    );
  const ready =
    Boolean(process.env.GEMINI_API_KEY && process.env.BLOB_READ_WRITE_TOKEN) &&
    process.env.ANALYSIS_ENABLED !== "false";
  const visitor = process.env.BLOB_READ_WRITE_TOKEN
    ? visitorIdentity(request, process.env.BLOB_READ_WRITE_TOKEN)
    : null;
  let allowance = null;
  let unavailable = false;
  try {
    if (ready && visitor) allowance = await readAllowance(request, visitor.key);
  } catch (error) {
    unavailable = true;
    // Keep credentials, visitor IDs, project content and provider error bodies
    // out of logs. A failed status read is not a depleted review allowance.
    console.warn("clovo_allowance_check_failed", {
      reference: crypto.randomUUID().slice(0, 8),
      category: error instanceof Error ? error.name : "UnknownError",
    });
  }
  return Response.json(
    {
      ready,
      model: modelName(),
      requiresCode: Boolean(process.env.ANALYSIS_ACCESS_CODE),
      allowance,
      ...(unavailable ? { code: "allowance_check_unavailable" } : {}),
    },
    {
      status: unavailable ? 503 : 200,
      headers: {
        "Cache-Control": "no-store",
        ...(unavailable ? { "Retry-After": "5" } : {}),
        ...(visitor?.cookie ? { "Set-Cookie": visitor.cookie } : {}),
      },
    },
  );
}
