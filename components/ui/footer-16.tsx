'use client';

import {T,useUiLanguage} from '@/components/language-provider';
import Link from 'next/link';
import {FileCheck2,LockKeyhole,ShieldCheck} from 'lucide-react';
import {SwasthyaFlowLogo} from './swasthyaflow-logo';

const navLinks=[
 {label:'Home',href:'/'},
 {label:'New intake',href:'/intake'},
 {label:'Reviewer queue',href:'/queue'},
 {label:'Privacy',href:'/privacy'},
 {label:'Safety & policy',href:'/privacy#no-diagnosis-or-treatment-suggestions'},
];
const resources=[
 {label:'Security controls',href:'/privacy#session-and-device-protection',Icon:LockKeyhole},
 {label:'Consent & purpose',href:'/privacy#purpose-and-informed-consent',Icon:FileCheck2},
 {label:'Privacy contact',href:'/privacy#accountability-and-incidents',Icon:ShieldCheck},
];

export default function Footer16({production=false}:{production?:boolean}){
 const {t}=useUiLanguage(); const year=new Date().getFullYear();
 return <footer className="border-t border-border bg-background text-foreground print:hidden">
  <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
   <div className="flex flex-col items-center gap-8">
    <Link href="/" aria-label={t("SwasthyaFlow home")} className="inline-flex items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"><SwasthyaFlowLogo/></Link>
    <p className="m-0 max-w-xl text-center text-sm leading-relaxed text-muted-foreground"><T text={"Source-linked intake. Qualified staff review. Confidential referral handover."}/></p>
    <nav aria-label={t("Footer navigation")} className="flex flex-wrap justify-center gap-x-6 gap-y-3">
     {navLinks.map(link=><Link key={link.label} href={link.href} className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"><T text={link.label}/></Link>)}
    </nav>
    <nav aria-label={t("Privacy resources")} className="flex items-center gap-3">
     {resources.map(({label,href,Icon})=><Link key={label} href={href} aria-label={t(label)} title={t(label)} className="grid size-10 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"><Icon aria-hidden="true" className="size-4"/></Link>)}
    </nav>
    <div aria-hidden="true" className="h-px w-full bg-border"/>
    <div className="flex max-w-2xl flex-col gap-3 text-center text-xs leading-relaxed text-muted-foreground">
     <p className="m-0">{production?<T text={'Production deployment requires an approved clinical release. '}/>:<T text={'Protected staff workspace. '}/>}<T text={"Automated extraction requires verification by qualified staff. SwasthyaFlow does not provide a medical diagnosis or treatment advice."}/></p>
     <p className="m-0">&copy; {year} <T text={" SwasthyaFlow. Built for responsible frontline review."}/></p>
    </div>
   </div>
  </div>
 </footer>;
}
