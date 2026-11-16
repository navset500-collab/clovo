import {responseSchema} from '@/lib/validation';
import {owns,validId,guard,limitedJson} from '@/lib/access';
import {readJson,writeJson,studyPath,responsesFor,deleteStudy,type StoredStudy} from '@/lib/studies';
import {list} from '@vercel/blob';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
async function load(id:string){if(!validId(id))return null;return readJson<StoredStudy>(studyPath(id));}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{const{id}=await params;const study=await load(id);if(!study)return json({error:'This study was not found or has expired.'},404);
 const key=request.headers.get('authorization')?.replace(/^Bearer /,'');
 if(key){if(!owns(key,study.ownerHash))return json({error:'Invalid owner key.'},403);const{ownerHash,...publicStudy}=study;void ownerHash;return json({study:publicStudy,responses:await responsesFor(id)});}
 if(Date.parse(study.expiresAt)<Date.now())return json({error:'This feedback link has expired.'},410);
 const{ownerHash,...publicStudy}=study;void ownerHash;return json({study:publicStudy});
 }catch{return json({error:'Unable to load this study.'},503);}
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const denied=guard(request,'feedback',30);if(denied)return json({error:denied},429);
 try{const{id}=await params;const study=await load(id);if(!study||Date.parse(study.expiresAt)<Date.now())return json({error:'This feedback link is closed.'},410);
 const parsed=responseSchema.safeParse(await limitedJson(request,12000));if(!parsed.success||parsed.data.answers.length!==study.questions.length)return json({error:'Please complete the feedback and consent checkbox.'},400);
 const{blobs}=await list({prefix:`studies/${id}/responses/`,limit:200});if(blobs.length>=200)return json({error:'This study has reached its response limit.'},409);
 const responseId=crypto.randomUUID();const{consent,website,...data}=parsed.data;void consent;void website;
 await writeJson(`studies/${id}/responses/${responseId}.json`,{...data,id:responseId,createdAt:new Date().toISOString()});return json({ok:true});
 }catch{return json({error:'Your response was not saved. Please try again.'},503);}
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 const denied=guard(request,'study-delete');if(denied)return json({error:denied},429);
 try{const{id}=await params;const study=await load(id);if(!study)return json({ok:true});const key=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';if(!owns(key,study.ownerHash))return json({error:'Invalid owner key.'},403);await deleteStudy(id);return json({ok:true});}catch{return json({error:'Deletion failed. Please retry.'},503);}
}
