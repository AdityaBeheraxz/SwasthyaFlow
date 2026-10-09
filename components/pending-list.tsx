'use client';
import {T} from '@/components/language-provider';

import {useEffect,useState} from 'react';
import {pendingForActor,syncPending,type PendingIntake} from '@/lib/offline';
import {syncErrorMessage} from '@/lib/sync-status';
export function PendingList(){
 const [items,setItems]=useState<PendingIntake[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{const refresh=()=>pendingForActor().then(setItems).catch(()=>{});refresh();window.addEventListener('sf-offline-change',refresh);return()=>window.removeEventListener('sf-offline-change',refresh);},[]);
 async function retry(){setBusy(true);setMessage('');try{if(!navigator.onLine){setMessage('Reconnect this device, then retry.');return;}localStorage.removeItem('sf_simulate_offline');window.dispatchEvent(new Event('sf-offline-change'));const result=await syncPending();setItems(await pendingForActor());if(result.failed)setMessage(syncErrorMessage(result.error??'SYNC_FAILED'));}catch{setMessage(syncErrorMessage('SYNC_FAILED'));}finally{setBusy(false);}}
 if(!items.length)return null;return <div className="panel"><h2 className="section-title"><T text={"On this device · PENDING SYNC"}/></h2><p className="small"><T text={"These encrypted drafts are not confirmed by the server. This button turns off offline simulation and retries the save without creating duplicate records."}/></p>{items.map(item=><p key={item.id} className="small">{new Date(item.createdAt).toLocaleString()} · {item.language.toUpperCase()} · {item.status}{item.error&&` · ${syncErrorMessage(item.error)}`}</p>)}<button className="btn secondary" disabled={busy} onClick={retry}>{busy?<T text={'Syncing…'}/>:<T text={'Reconnect and sync saved drafts'}/>}</button>{message&&<p className="error" role="alert"><T text={message}/></p>}</div>;
}
