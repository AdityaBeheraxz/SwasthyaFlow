'use client';
import {T} from '@/components/language-provider';

import {useEffect,useState} from 'react';
import {intakeActor,clearPrivateDrafts} from '@/lib/offline';
import {Button} from '@/components/ui/button';
type Actor={id:string;name:string;role:string}|null;
export function AuthControl({production,compact=false}:{production:boolean;compact?:boolean}){const [actor,setActor]=useState<Actor>(null);const [loaded,setLoaded]=useState(false);const [error,setError]=useState('');useEffect(()=>{intakeActor().then(value=>setActor(value?{id:value.id,name:value.name??value.id,role:value.role}:null)).catch(()=>setActor(null)).finally(()=>setLoaded(true));},[]);if(!loaded)return <span className="text-xs text-muted-foreground" role="status"><T text={"Checking sign-in…"}/></span>;if(!actor)return <Button asChild size="sm"><a href={production?'/api/auth/login':'/login'}><T text={"Staff sign in"}/></a></Button>;return <form onSubmit={async event=>{event.preventDefault();const form=event.currentTarget;try{await clearPrivateDrafts();form.submit();}catch{setError('Private drafts could not be cleared. Retry sign-out.');}}} action="/api/auth/logout" method="post" className="flex items-center gap-3"><span className={compact?'':'hidden 2xl:block'}><strong className="block max-w-36 truncate text-sm">{actor.name}</strong><span className="block text-xs capitalize text-muted-foreground"><T text={actor.role.replaceAll('_',' ')}/></span></span><Button variant="outline" size="sm" type="submit"><T text={"Sign out"}/></Button>{error&&<span role="alert">{error}</span>}</form>}
