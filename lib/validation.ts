import { z } from 'zod';
const prose = z.string().max(1400);
export const safeUrl = z.string().max(1500).refine(s => !s || (() => { try { const u = new URL(s); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } })(), 'Use an http or https link');
export const inputSchema = z.object({
  name: z.string().trim().min(1).max(80), description: z.string().trim().min(25).max(18000), audience: z.string().trim().min(5).max(1000), task: z.string().trim().max(1500), url: safeUrl.default(''), stage: z.enum(['idea','prototype','launched']), language: z.enum(['en','es']).default('en'),
  attachments: z.array(z.object({ id: z.string().max(80), name: z.string().max(200), kind: z.enum(['image','pdf','video-frame']), data: z.string().max(2800000).regex(/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/) })).max(8).default([]), accessCode: z.string().max(200).optional(),
});
export const briefSchema = z.object({ product: z.string().max(260), problem: prose, strengths: z.array(prose).max(4), assumptions: z.array(prose).max(5), evidence: z.array(prose).max(6) });
export const marketSchema = z.object({ summary: prose, signals: z.array(z.object({ title: z.string().max(160), detail: prose, sourceIds: z.array(z.string()).max(5) })).max(4), alternatives: z.array(z.object({ name: z.string().max(160), difference: prose, sourceIds: z.array(z.string()).max(5) })).max(4), unknowns: z.array(prose).max(5) });
export const personaSchema = z.object({ name: z.string().max(80), role: z.string().max(140), situation: prose, reaction: prose, useful: prose, friction: prose, alternative: prose, wouldTry: z.enum(['yes','maybe','no']), condition: prose });
export const critiqueSchema = z.object({ summary: prose, concerns: z.array(z.object({ title: z.string().max(160), evidence: prose, risk: prose, test: prose, citations:z.array(z.object({sourceId:z.string().max(30),quote:z.string().max(650),location:z.string().max(200)})).max(3) })).min(1).max(4) });
export const planSchema = z.object({ summary: prose, improvements: z.array(z.object({ findingIds:z.array(z.string().max(30)).min(1).max(4), title: z.string().max(160), change: prose, why: prose, effort: z.string().max(80), check: prose })).min(1).max(4) });
export const experimentSchema = z.object({ summary: prose, task: prose, questions: z.array(z.string().max(350)).min(2).max(4), successSignal: prose, recruit: prose });
export const studySchema = z.object({ name: z.string().trim().min(1).max(80), description: z.string().trim().min(25).max(5000), url: safeUrl, task: z.string().max(1400), questions: z.array(z.string().max(350)).min(1).max(4), language: z.enum(['en','es']) });
export const responseSchema = z.object({ use: z.enum(['yes','maybe','no']), frequency: z.enum(['daily','weekly','monthly','rarely','never']), problem: z.string().trim().min(5).max(1200), feedback: z.string().trim().min(10).max(2500), answers: z.array(z.string().trim().max(1000)).max(4), consent: z.literal(true), website: z.string().max(0).optional() });
export function validSourceIds(ids: string[], allowed: string[]) { return [...new Set(ids)].filter(id => allowed.includes(id)); }
