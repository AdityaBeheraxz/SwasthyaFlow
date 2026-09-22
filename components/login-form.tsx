'use client';
import {FormEvent,useState} from 'react';

const accounts=[
 {role:'Health Worker',username:'health.worker',password:'HealthWorker!2026'},
 {role:'Nurse',username:'nurse.meera',password:'Nurse!2026'},
 {role:'Medical Officer',username:'doctor.ananya',password:'Doctor!2026'},
 {role:'Medical Officer',username:'doctor.vikram',password:'Doctor!2026'},
 {role:'Administrator',username:'administrator',password:'Admin!2026'},
];

export function LoginForm(){
 const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const response=await fetch('/api/auth/credentials',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})});const value=await response.json();if(!value.ok)throw new Error(value.error.message);const requested=new URLSearchParams(window.location.search).get('next');window.location.href=requested?.startsWith('/')&&!requested.startsWith('//')?requested:'/';}catch(reason){setError(reason instanceof Error?reason.message:'Sign-in failed.');setBusy(false);}}
 function chooseAccount(account:typeof accounts[number]){setUsername(account.username);setPassword(account.password);setError('');}
 return <div className="login-layout"><section className="panel login-panel"><div className="eyebrow">Staff access</div><h1 className="section-title">Sign in to SwasthyaFlow</h1><p className="muted">Use your individual staff credential. Access is limited by role and facility.</p><form className="stack" onSubmit={submit}><label className="field">Username<input autoComplete="username" value={username} onChange={event=>setUsername(event.target.value)} required/></label><label className="field">Password<input type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required minLength={8}/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="btn" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></section><aside className="panel"><div className="eyebrow">Demo credentials</div><h2 className="section-title">Choose a staff account</h2><p className="small muted">These accounts contain synthetic demonstration data only. Production uses the hospital identity provider.</p><div className="credential-list">{accounts.map(account=><button type="button" className="credential-card" key={account.username} onClick={()=>chooseAccount(account)}><strong>{account.role}</strong><span className="mono">{account.username}</span><span className="mono">{account.password}</span></button>)}</div></aside></div>;
}
