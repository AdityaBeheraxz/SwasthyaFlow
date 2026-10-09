'use client';
import {T} from '@/components/language-provider';

import {FormEvent,useState} from 'react';

export function LoginForm(){
 const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const response=await fetch('/api/auth/credentials',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})});const value=await response.json();if(!value.ok)throw new Error(value.error.message);const requested=new URLSearchParams(window.location.search).get('next');window.location.href=requested?.startsWith('/')&&!requested.startsWith('//')?requested:'/';}catch(reason){setError(reason instanceof Error?reason.message:'Sign-in failed.');setBusy(false);}}
 return <section className="panel login-panel" style={{maxWidth:560,margin:'40px auto'}}><div className="eyebrow"><T text={"Staff access"}/></div><h1 className="section-title"><T text={"Sign in to SwasthyaFlow"}/></h1><p className="muted"><T text={"Use your individual staff credential. Access is limited by role and facility."}/></p><form className="stack" onSubmit={submit}><label className="field"><T text={"Username"}/><input autoComplete="username" value={username} onChange={event=>setUsername(event.target.value)} required/></label><label className="field"><T text={"Password"}/><input type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required minLength={8}/></label>{error&&<p className="error" role="alert"><T text={error}/></p>}<button className="btn" disabled={busy}>{busy?<T text={'Signing in…'}/>:<T text={'Sign in'}/>}</button></form></section>;
}
