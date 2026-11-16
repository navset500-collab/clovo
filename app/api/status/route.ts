import { modelName } from "@/lib/model";

export async function GET() {
  return Response.json(
    {
      ready:
        Boolean(
          process.env.GEMINI_API_KEY && process.env.BLOB_READ_WRITE_TOKEN,
        ) && process.env.ANALYSIS_ENABLED !== "false",
      model: modelName(),
      requiresCode: Boolean(process.env.ANALYSIS_ACCESS_CODE),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
