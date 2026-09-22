import type { Metadata } from 'next';
import { Fraunces, Geist, JetBrains_Mono, Noto_Sans_Devanagari, Noto_Sans_Oriya } from 'next/font/google';
import Link from 'next/link';
import Navbar from '@/components/ui/navbar-02';
import {AccessGate} from '@/components/access-gate';
import {isProductionDeployment} from '@/lib/runtime-config';
import './globals.css';
const display=Fraunces({subsets:['latin'],variable:'--font-display',display:'swap'});
const body=Geist({subsets:['latin'],variable:'--font-body',display:'swap'});
const mono=JetBrains_Mono({subsets:['latin'],variable:'--font-mono',display:'swap'});
const hindi=Noto_Sans_Devanagari({subsets:['devanagari'],variable:'--font-hindi',display:'swap'});
const odia=Noto_Sans_Oriya({subsets:['oriya'],variable:'--font-odia',display:'swap'});
export const metadata:Metadata={title:'SwasthyaFlow',description:'AI-assisted frontline triage. Human-led clinical decisions.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${hindi.variable} ${odia.variable}`}><body><Navbar production={isProductionDeployment}/><main><AccessGate production={isProductionDeployment}>{children}</AccessGate></main><footer className="site-footer"><div>{isProductionDeployment?'Production candidate. Use only under an approved clinical release.':'Educational prototype using synthetic data.'} AI-generated review priority is not a medical diagnosis. Final assessment must be made by qualified healthcare staff.</div><nav aria-label="Policy links"><Link href="/privacy">Privacy</Link><Link href="/privacy">Security</Link><Link href="/privacy">Policy</Link></nav></footer></body></html>}
