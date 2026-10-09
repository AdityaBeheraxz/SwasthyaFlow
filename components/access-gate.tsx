'use client';
import {T} from '@/components/language-provider';

import {useEffect,useState} from 'react';
import {intakeActor} from '@/lib/session-client';
import {usePathname} from 'next/navigation';

const publicPaths=new Set(['/','/login','/privacy']);
export function AccessGate({children,production}:{children:React.ReactNode;production:boolean}){
 const pathname=usePathname(),[state,setState]=useState<'loading'|'signed-in'|'signed-out'>('loading');
 const isPublic=publicPaths.has(pathname);
 useEffect(()=>{if(isPublic){setState('signed-in');return;}let active=true;setState('loading');const check=()=>intakeActor().then(actor=>{if(active)setState(actor?'signed-in':'signed-out');}).catch(()=>{if(active)setState('signed-out');});void check();const timer=setInterval(check,60000);return()=>{active=false;clearInterval(timer);};},[isPublic,pathname]);
 if(isPublic||state==='signed-in')return <>{children}</>;
 if(state==='loading')return <div className="container"><section className="panel" role="status"><T text={"Checking staff authorization…"}/></section></div>;
 return <div className="container"><section className="panel access-denied"><div className="eyebrow"><T text={"Authorization required"}/></div><h1 className="section-title"><T text={"Staff sign-in required"}/></h1><p><T text={"Your identity, role, and facility must be verified before this area can be opened."}/></p><a className="btn" href={production?'/api/auth/login':`/login?next=${encodeURIComponent(pathname)}`}><T text={"Secure sign in"}/></a></section></div>;
}
