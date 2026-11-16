import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Clovo — See how your idea lands.',description:'Test an idea, MVP or product with six AI agents, a simulated user panel, and feedback from people you invite. Find what matters and what to build next.',referrer:'strict-origin-when-cross-origin'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
