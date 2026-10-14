import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'JobHunt AI — Find your next chapter',description:'Live career discovery powered by TinyFish. Verified sources, transparent matching, direct application links.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
