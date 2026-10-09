import type { Metadata } from 'next';
import {cookies} from 'next/headers';
import {LanguageProvider} from '@/components/language-provider';
import {validUiLanguage} from '@/lib/ui-language';
import { Fraunces, Geist, JetBrains_Mono, Noto_Sans_Devanagari, Noto_Sans_Oriya } from 'next/font/google';
import Footer16 from '@/components/ui/footer-16';
import Navbar from '@/components/ui/navbar-02';
import {ProviderStatus} from '@/components/provider-status';
import {AccessGate} from '@/components/access-gate';
import {isProductionDeployment,isDemoDeployment} from '@/lib/runtime-config';
import './globals.css';
const display=Fraunces({subsets:['latin'],variable:'--font-display',display:'swap'});
const body=Geist({subsets:['latin'],variable:'--font-body',display:'swap'});
const mono=JetBrains_Mono({subsets:['latin'],variable:'--font-mono',display:'swap',preload:false});
const hindi=Noto_Sans_Devanagari({subsets:['devanagari'],variable:'--font-hindi',display:'swap',preload:false});
const odia=Noto_Sans_Oriya({subsets:['oriya'],variable:'--font-odia',display:'swap',preload:false});
export const metadata:Metadata={title:'SwasthyaFlow',description:'AI-assisted frontline triage. Human-led clinical decisions.'};
export default async function RootLayout({children}:{children:React.ReactNode}){const language=validUiLanguage((await cookies()).get('sf_ui_language')?.value);const fixture=[process.env.ASR_MODE,process.env.TRANSLATION_MODE,process.env.EXTRACTION_MODE,process.env.OCR_MODE,process.env.AI_MODE].includes('fixture');return <html lang={language} className={`${display.variable} ${body.variable} ${mono.variable} ${hindi.variable} ${odia.variable}`}><body><LanguageProvider initialLanguage={language}><Navbar production={isProductionDeployment}/><main><ProviderStatus demo={isDemoDeployment} fixture={fixture}/><AccessGate production={isProductionDeployment}>{children}</AccessGate></main><Footer16 production={isProductionDeployment}/></LanguageProvider></body></html>}
