import Participant from '@/components/Participant';
export const metadata={title:'Give feedback — Clovo',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <Participant id={id}/>;}
