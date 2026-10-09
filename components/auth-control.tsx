'use client';
import {T} from '@/components/language-provider';

import {useEffect,useState} from 'react';
import {intakeActor,clearPrivateDrafts} from '@/lib/offline';
import {Button} from '@/components/ui/button';
type Actor={id:string;name:string;role:string}|null;
export function AuthControl({production,compact=false}:{production:boolean;compact?:boolean}){
 const [actor,setActor]=useState<Actor>(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{intakeActor().then(value=>setActor(value?{id:value.id,name:value.name??value.id,role:value.role}:null)).catch(()=>setActor(null)).finally(()=>setLoaded(true));},[]);
 async function signOut(event:React.FormEvent){
  event.preventDefault();if(busy)return;setBusy(true);setError('');
  try{await clearPrivateDrafts();}catch{setError('Private drafts could not be cleared. Retry sign-out.');setBusy(false);return;}
  try{
   // Fetch preserves the same-origin header even with Referrer-Policy: no-referrer.
   const response=await fetch('/api/auth/logout',{method:'POST',headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store'});
   const value=await response.json();
   if(!response.ok||!value.ok)throw new Error(value.error?.message??'Sign-out failed. Please retry.');
   window.location.assign('/');
  }catch(reason){setError(reason instanceof Error?reason.message:'Sign-out failed. Please retry.');setBusy(false);}
 }
 if(!loaded)return <span className="text-xs text-muted-foreground" role="status"><T text="Checking sign-in…"/></span>;
 if(!actor)return <Button asChild size="sm"><a href={production?'/api/auth/login':'/login'}><T text="Staff sign in"/></a></Button>;
 return <form onSubmit={signOut} className="flex items-center gap-3"><span className={compact?'':'hidden 2xl:block'}><strong className="block max-w-36 truncate text-sm">{actor.name}</strong><span className="block text-xs capitalize text-muted-foreground"><T text={actor.role.replaceAll('_',' ')}/></span></span><Button variant="outline" size="sm" type="submit" disabled={busy}><T text={busy?'Signing out…':'Sign out'}/></Button>{error&&<span role="alert"><T text={error}/></span>}</form>;
}
