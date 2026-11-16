import type {Attachment} from './types';
const readData=(file:Blob)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Could not read file.'));r.readAsDataURL(file);});
export async function prepareFile(file:File):Promise<Attachment[]>{
 const id=crypto.randomUUID();
 if(file.type==='application/pdf'){
  if(file.size>2000000)throw new Error('PDFs can be up to 2 MB. Compress the PDF or paste the text.');
  const head=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());if(head!=='%PDF-')throw new Error('This file is not a valid PDF.');
  return [{id,name:file.name,kind:'pdf',data:await readData(file)}];
 }
 if(file.type.startsWith('video/')){
  if(file.size>60000000)throw new Error('Use a video under 60 MB and 3 minutes.');
  const url=URL.createObjectURL(file),video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;
  try{
   await new Promise<void>((ok,no)=>{const timer=setTimeout(()=>no(new Error('Could not read this video. Try MP4 or WebM.')),15000);video.onloadeddata=()=>{clearTimeout(timer);ok();};video.onerror=()=>{clearTimeout(timer);no(new Error('Unsupported video. Try MP4 or WebM.'));};video.src=url;});
   if(!Number.isFinite(video.duration)||video.duration>180)throw new Error('Use a video no longer than 3 minutes.');
   const canvas=document.createElement('canvas');const scale=Math.min(1,1100/video.videoWidth);canvas.width=video.videoWidth*scale;canvas.height=video.videoHeight*scale;const ctx=canvas.getContext('2d')!;const frames:Attachment[]=[];
   for(let i=0;i<6;i++){const time=Math.max(.01,Math.min(video.duration-.05,video.duration*(i+.2)/6));await new Promise<void>((ok,no)=>{const timer=setTimeout(()=>no(new Error('Could not sample this video.')),8000);video.onseeked=()=>{clearTimeout(timer);ok();};video.currentTime=time;});ctx.drawImage(video,0,0,canvas.width,canvas.height);frames.push({id:`${id}-${i}`,name:`${file.name} · ${time.toFixed(1)}s`,kind:'video-frame',data:canvas.toDataURL('image/jpeg',.65)});}return frames;
  }finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
 }
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a PDF, MP4, WebM, PNG, JPG or WebP.');
 if(file.size>15000000)throw new Error('Images can be up to 15 MB.');
 const image=new Image();const url=URL.createObjectURL(file);try{await new Promise<void>((ok,no)=>{image.onload=()=>ok();image.onerror=()=>no(new Error('Could not read this image.'));image.src=url;});const canvas=document.createElement('canvas');const scale=Math.min(1,1400/image.width);canvas.width=image.width*scale;canvas.height=image.height*scale;canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);return [{id,name:file.name,kind:'image',data:canvas.toDataURL('image/jpeg',.75)}];}finally{URL.revokeObjectURL(url);}
}
