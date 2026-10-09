'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {T,useUiLanguage} from '@/components/language-provider';
export function ReferralTabs(){
 const path=usePathname(),{t}=useUiLanguage();
 return <nav className="referral-tabs" aria-label={t('Referral sections')}>
  {[{href:'/referrals',label:'Refer patients'},{href:'/referrals/inbox',label:'Acceptance inbox'}].map(item=><Link key={item.href} href={item.href} aria-current={path===item.href?'page':undefined}><T text={item.label}/></Link>)}
 </nav>;
}
