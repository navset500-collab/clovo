import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export const newKey = () => randomBytes(24).toString('hex');
export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');
export function owns(key: string, hash: string) { const a=Buffer.from(hashKey(key)),b=Buffer.from(hash);return a.length===b.length&&timingSafeEqual(a,b); }
export const validId = (id: string) => /^[a-f0-9]{48}$/.test(id);
const hits = new Map<string,{count:number;until:number}>();
export function guard(request: Request, bucket: string, max=20) {
  const origin=request.headers.get('origin');if(origin){try{if(new URL(origin).host!==(request.headers.get('host')||new URL(request.url).host))return 'Invalid request origin.';}catch{return 'Invalid request origin.';}}
  const now=Date.now();for(const[k,v]of hits)if(v.until<now)hits.delete(k);
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]||'local';const k=bucket+ip;const hit=hits.get(k)||{count:0,until:now+3600000};if(hit.count>=max)return 'The demo request limit has been reached. Please try later.';hits.set(k,{...hit,count:hit.count+1});return null;
}
export async function limitedJson(request: Request, max=4000000) { if(Number(request.headers.get('content-length'))>max)throw new Error('Upload is too large. Use fewer or smaller files.');const text=await request.text();if(text.length>max)throw new Error('Upload is too large. Use fewer or smaller files.');return JSON.parse(text); }
