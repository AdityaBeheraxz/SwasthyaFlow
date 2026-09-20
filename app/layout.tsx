import type { Metadata } from 'next';
import { Fraunces, Geist, JetBrains_Mono, Noto_Sans_Devanagari, Noto_Sans_Oriya } from 'next/font/google';
import Link from 'next/link';
import { RoleSwitcher } from '@/components/role-switcher';
import { OfflineController } from '@/components/offline-controller';
import { SwasthyaFlowLogo } from '@/components/ui/swasthyaflow-logo';
import './globals.css';
const display=Fraunces({subsets:['latin'],variable:'--font-display',display:'swap'});
const body=Geist({subsets:['latin'],variable:'--font-body',display:'swap'});
const mono=JetBrains_Mono({subsets:['latin'],variable:'--font-mono',display:'swap'});
const hindi=Noto_Sans_Devanagari({subsets:['devanagari'],variable:'--font-hindi',display:'swap'});
const odia=Noto_Sans_Oriya({subsets:['oriya'],variable:'--font-odia',display:'swap'});
export const metadata:Metadata={title:'SwasthyaFlow',description:'AI-assisted frontline triage. Human-led clinical decisions.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${hindi.variable} ${odia.variable}`}><body><header className="site-header"><Link className="brand" href="/" aria-label="SwasthyaFlow home"><SwasthyaFlowLogo /></Link><nav aria-label="Main"><Link href="/intake">New intake</Link><Link href="/queue">Reviewer queue</Link><Link href="/audit">Audit & privacy</Link><Link href="/settings">Settings</Link></nav><OfflineController/><RoleSwitcher /></header><main>{children}</main><footer className="site-footer">Educational prototype using synthetic data. AI-generated review priority is not a medical diagnosis. Final assessment must be made by qualified healthcare staff.</footer></body></html>}
