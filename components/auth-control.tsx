'use client';
import {useEffect,useState} from 'react';
type Actor={id:string;role:string}|null;
export function AuthControl(){const [actor,setActor]=useState<Actor>(null);const [loaded,setLoaded]=useState(false);useEffect(()=>{fetch('/api/session').then(response=>response.json()).then(value=>setActor(value.data??null)).finally(()=>setLoaded(true));},[]);if(!loaded)return <span className="small muted" role="status">Checking sign-in…</span>;if(!actor)return <a className="btn" href="/api/auth/login">Secure sign in</a>;return <form action="/api/auth/logout" method="post" className="auth-control"><span><strong>{actor.role.replaceAll('_',' ')}</strong><br/><span className="small muted">Authenticated</span></span><button className="btn secondary" type="submit">Sign out</button></form>}
