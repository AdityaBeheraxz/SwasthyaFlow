'use client';
import {T} from '@/components/language-provider';

import {useCallback,useEffect,useState} from 'react';
import {pendingForActor,offlineActive,syncPending,intakeActor} from '@/lib/offline';
import {Button} from '@/components/ui/button';
import Link from 'next/link';
import {syncErrorMessage,type SyncedIntake} from '@/lib/sync-status';
export function OfflineController({allowSimulation=true}:{allowSimulation?:boolean}){
 const [offline,setOffline]=useState(false),[pending,setPending]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[syncedId,setSyncedId]=useState('');
 const refresh=useCallback(async()=>{setOffline(offlineActive());setPending((await pendingForActor()).length);},[]);
 const runSync=useCallback(async()=>{setBusy(true);setMessage('');try{const result=await syncPending();const items=await pendingForActor();setMessage(result.failed?syncErrorMessage(result.error??items.find(item=>item.error)?.error??'SYNC_FAILED'):result.synced?result.synced+' intake synced.':'');await refresh();}catch{setMessage(syncErrorMessage('SYNC_FAILED'));}finally{setBusy(false);}},[refresh]);
 useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});const changed=()=>{refresh().catch(()=>{});};const online=()=>{changed();if(!offlineActive())void runSync();};const synced=(event:Event)=>{setSyncedId((event as CustomEvent<SyncedIntake>).detail.encounterId);setMessage('Intake synced.');};intakeActor().then(changed).catch(changed);window.addEventListener('online',online);window.addEventListener('offline',changed);window.addEventListener('sf-offline-change',changed);window.addEventListener('sf-intake-synced',synced);return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',changed);window.removeEventListener('sf-offline-change',changed);window.removeEventListener('sf-intake-synced',synced);};},[refresh,runSync]);
 function toggle(){localStorage.setItem('sf_simulate_offline',offline?'0':'1');setOffline(offlineActive());window.dispatchEvent(new Event('sf-offline-change'));}
 return <div className="flex flex-wrap items-center gap-2">{allowSimulation?<Button variant="outline" size="sm" onClick={toggle} aria-pressed={offline}>{offline?<T text={'Simulated offline'}/>:<T text={'Simulate offline'}/>}</Button>:offline&&<span role="status"><T text={"Offline · drafts stay on this device"}/></span>}{pending>0&&<Button variant="ghost" size="sm" disabled={busy||offline} onClick={runSync}>{busy?<T text={'Syncing…'}/>:pending+' PENDING SYNC'}</Button>}{message&&<span className="text-xs text-muted-foreground" role="status">{message}</span>}{syncedId&&<Link className="text-link small" href={'/encounters/'+syncedId}><T text={"Open synced intake"}/></Link>}</div>;
}
