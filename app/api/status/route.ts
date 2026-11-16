import { modelName } from '@/lib/model';

export async function GET() {
  return Response.json({ ready: Boolean(process.env.GEMINI_API_KEY), model: modelName(), requiresCode: Boolean(process.env.ANALYSIS_ACCESS_CODE) }, { headers: { 'Cache-Control': 'no-store' } });
}
