'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';

const publicPaths=new Set(['/','/login','/privacy']);
export function AccessGate({children,production}:{children:React.ReactNode;production:boolean}){
 const pathname=usePathname(),[state,setState]=useState<'loading'|'signed-in'|'signed-out'>('loading');
 const isPublic=publicPaths.has(pathname);
 useEffect(()=>{if(isPublic){setState('signed-in');return;}setState('loading');fetch('/api/session',{cache:'no-store'}).then(response=>response.json()).then(value=>setState(value.data?'signed-in':'signed-out')).catch(()=>setState('signed-out'));},[isPublic,pathname]);
 if(isPublic||state==='signed-in')return <>{children}</>;
 if(state==='loading')return <div className="container"><section className="panel" role="status">Checking staff authorization…</section></div>;
 return <div className="container"><section className="panel access-denied"><div className="eyebrow">Authorization required</div><h1 className="section-title">Staff sign-in required</h1><p>Your identity, role, and facility must be verified before this area can be opened.</p><a className="btn" href={production?'/api/auth/login':`/login?next=${encodeURIComponent(pathname)}`}>Secure sign in</a></section></div>;
}
