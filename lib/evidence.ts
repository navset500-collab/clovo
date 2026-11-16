import type {ProjectInput,EvidenceSource,Citation,Concern} from './types.ts';
export function makeEvidenceSources(input:ProjectInput):EvidenceSource[]{
 const es=input.language==='es';const sources:EvidenceSource[]=[];const chunks=Array.from({length:Math.ceil(input.description.length/650)},(_,i)=>input.description.slice(i*650,(i+1)*650));
 chunks.forEach((text,i)=>sources.push({id:`B${i+1}`,kind:'brief',label:`${es?'Tu descripción':'Your description'} · ${i+1}`,text:text.trim()}));
 sources.push({id:'A1',kind:'audience',label:es?'Público objetivo':'Intended audience',text:input.audience});
 if(input.task)sources.push({id:'Q1',kind:'question',label:es?'Tu pregunta':'Your question',text:input.task});
 input.attachments.forEach((f,i)=>sources.push({id:`F${i+1}`,kind:'attachment',label:f.name,text:es?'Material original proporcionado por ti.':'Original material supplied by you.',attachmentId:f.id}));return sources;
}
const normalize=(s:string)=>s.normalize('NFKC').replace(/\s+/g,' ').trim();
export function checkCitations(citations:{sourceId:string;quote:string;location:string}[],sources:EvidenceSource[]):Citation[]{
 return citations.flatMap<Citation>(c=>{const source=sources.find(s=>s.id===c.sourceId);if(!source)return [];
  if(source.kind==='attachment')return [{...c,verification:'file-interpretation' as const}];
  if(normalize(c.quote).length<12||!normalize(source.text).includes(normalize(c.quote)))return [];
  return [{...c,location:source.label,verification:'text-match' as const}];
 });
}
export function groundConcerns(items:{title:string;evidence:string;risk:string;test:string;citations:{sourceId:string;quote:string;location:string}[]}[],sources:EvidenceSource[]):Concern[]{
 return items.map((c,i)=>{const citations=checkCitations(c.citations,sources);return {...c,id:`C${i+1}`,citations,basis:citations.some(c=>c.verification==='text-match')?'brief-supported':citations.length?'file-interpretation':'hypothesis'};});
}
export function linkPlans<T extends {findingIds:string[]}>(plans:T[],concerns:Concern[]){const ids=new Set(concerns.map(c=>c.id));return plans.map(p=>({...p,findingIds:[...new Set(p.findingIds)].filter(id=>ids.has(id))})).filter(p=>p.findingIds.length>0);}
