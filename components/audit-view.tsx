'use client';
import {T,useUiLanguage} from '@/components/language-provider';

import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
type Event={id:string;userId:string|null;actorName:string|null;encounterId:string|null;action:string;timestamp:string;metadata:Record<string,unknown>};
const initialFilters={q:'',from:'',to:'',hideAccess:false};
const indiaTime=(value:string)=>new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
export function AuditView({encounterId}:{encounterId?:string}){const {t:uiText}=useUiLanguage();
 const [events,setEvents]=useState<Event[]>([]),[error,setError]=useState(''),[role,setRole]=useState('');
 const [draft,setDraft]=useState(initialFilters),[filters,setFilters]=useState(initialFilters);
 const [cursor,setCursor]=useState(''),[loading,setLoading]=useState(true),[updated,setUpdated]=useState('');
 const [purgeId,setPurgeId]=useState(encounterId??''),[busy,setBusy]=useState(false);
 const [risk,setRisk]=useState<{id:string;priorityFinal:string|null;state:string}|null>(null);
 const request=useRef(0);
 const controller=useRef<AbortController|null>(null);
 const load=useCallback(async(next='')=>{
  controller.current?.abort();const pending=new AbortController();controller.current=pending;
  const version=++request.current;setLoading(true);setError('');
  let failureMessage='Audit unavailable.';
  try{
   const params=new URLSearchParams({limit:'50',q:filters.q,hideAccess:String(filters.hideAccess)});
   if(filters.from)params.set('from',new Date(filters.from+'T00:00:00+05:30').toISOString());
   if(filters.to)params.set('to',new Date(filters.to+'T23:59:59.999+05:30').toISOString());
   if(next)params.set('cursor',next);
   const response=await fetch((encounterId?`/api/audit/${encodeURIComponent(encounterId)}`:'/api/audit')+'?'+params,{cache:'no-store',signal:pending.signal}),value=await response.json();
   if(version!==request.current)return;
   if(!response.ok||!value.ok){
    if([401,403,404].includes(response.status)){setRisk(null);setEvents([]);setCursor('');}
    failureMessage=value.error?.message??failureMessage;throw new Error(failureMessage);
   }
   setEvents(previous=>next?[...previous,...value.data.filter((e:Event)=>!previous.some(p=>p.id===e.id))]:value.data);
   setRisk(value.case??null);
   setCursor(response.headers.get('X-Next-Cursor')??'');setUpdated(new Date().toISOString());
  }catch{if(version===request.current&&!pending.signal.aborted){setError(failureMessage);if(!next){setEvents([]);setCursor('');setRisk(null);}}}
  finally{if(version===request.current)setLoading(false);}
 },[encounterId,filters]);
 useEffect(()=>{const counter=request;const abort=controller;setEvents([]);setCursor('');void load();return()=>{counter.current++;abort.current?.abort();};},[load]);
 useEffect(()=>{
  let active=true;setPurgeId(encounterId??'');setRole('');
  void fetch('/api/session',{cache:'no-store'}).then(r=>r.json()).then(staff=>{if(active)setRole(staff.data?.role??'');}).catch(()=>{});
  return()=>{active=false;};
 },[encounterId]);
 async function purge(){
  if(!purgeId.trim()||!window.confirm(`Purge clinical data for ${purgeId}? The audit tombstone will remain.`))return;
  setBusy(true);setError('');try{const v=await (await fetch('/api/privacy/purge',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({encounterId:purgeId.trim()})})).json();if(!v.ok)throw new Error(v.error.message);window.location.reload();}catch(e){setError(e instanceof Error?e.message:'Purge failed');setBusy(false);}
 }
 return <div className="stack">
  {encounterId&&<Link className="text-link" href="/audit"><T text="View facility audit"/></Link>}
  {risk?.id===encounterId&&risk&&<section className="panel"><h2 className="section-title"><T text={"Case priority and referral"}/></h2><p><span className={'badge '+(risk.priorityFinal==='RED'?'red':risk.priorityFinal==='YELLOW'?'yellow':risk.priorityFinal==='GREEN'?'green':'unavailable')}>{risk.priorityFinal??<T text={'Priority unavailable'}/>}</span> · <T text={risk.state}/></p><p><T text={"A Medical Officer must approve the reviewed case and record recipient-specific consent before sending a referral."}/></p><Link className="btn" href={['APPROVED','REFERRAL_GENERATED','COMPLETED'].includes(risk.state)?`/referrals?case=${encounterId}`:`/encounters/${encounterId}#referral`}><T text={"Review risk and refer"}/></Link></section>}
  <section className="panel stack" aria-label={uiText("Audit controls")}>
   <div className="workspace-heading"><div><h2 className="section-title">{encounterId?<T text={'Case activity'}/>:<T text={'Facility activity'}/>}</h2><p className="small muted">{events.length} <T text={" events loaded · Times in IST"}/>{updated?' · Updated '+indiaTime(updated):<T text={''}/>}</p></div><button className="btn secondary" onClick={()=>load()} disabled={loading}>{loading?<T text={'Loading audit…'}/>:<T text={'Refresh audit'}/>}</button></div>
   <form className="stack" noValidate onSubmit={e=>{e.preventDefault();if(draft.from&&draft.to&&draft.from>draft.to){setError('From date must be on or before to date.');return;}setFilters({...draft});}}>
    <label className="field"><T text={"Filter events"}/><input value={draft.q} maxLength={100} onChange={e=>setDraft({...draft,q:e.target.value})} placeholder={uiText("Action, encounter ID or actor")}/></label>
    <div className="form-grid"><label className="field"><T text={"From date (IST)"}/><input type="date" value={draft.from} onChange={e=>setDraft({...draft,from:e.target.value})}/></label><label className="field"><T text={"To date (IST)"}/><input type="date" min={draft.from||undefined} value={draft.to} onChange={e=>setDraft({...draft,to:e.target.value})}/></label></div>
    <label className="check small"><input type="checkbox" checked={draft.hideAccess} onChange={e=>setDraft({...draft,hideAccess:e.target.checked})}/><T text={"Hide routine access events in this view"}/></label>
    <div className="actions"><button className="btn" disabled={loading}><T text={"Apply audit filters"}/></button><button className="btn secondary" type="button" disabled={loading} onClick={()=>{setError('');setDraft(initialFilters);setFilters({...initialFilters});}}><T text={"Reset filters"}/></button></div>
   </form>
   <details className="small muted"><summary><T text={"Audit privacy and storage"}/></summary><p><T text={"Events are append-only and record the actor, action, case reference and timestamp. Facility-wide metadata is redacted. Medical Officers can inspect detailed case events with active consent. Filtering does not delete records."}/></p></details>
  </section>
  {error&&<p className="error" role="alert"><T text={error}/></p>}
  <div className="table-wrap audit-table" aria-busy={loading}><table><caption className="sr-only"><T text={"Authorized audit records in newest-first order"}/></caption><thead><tr><th><T text={"When · IST"}/></th><th><T text={"Action"}/></th><th><T text={"Actor"}/></th><th><T text={"Case"}/></th><th><T text={"Details"}/></th></tr></thead><tbody>{events.map(e=><tr key={e.id}><td className="small">{indiaTime(e.timestamp)}</td><td><strong>{e.action.replaceAll('_',' ').toLowerCase()}</strong><div className="small mono muted">{e.action}</div></td><td className="small">{e.actorName&&<div>{e.actorName}</div>}<div className="mono">{e.userId??'System'}</div></td><td className="small mono">{e.encounterId?<Link className="text-link" href={`/audit?encounterId=${encodeURIComponent(e.encounterId)}`}>{e.encounterId}</Link>:'—'}</td><td><details className="small"><summary><T text={"Event details"}/></summary><p className="mono"><T text={"Event ID: "}/>{e.id}</p>{Object.keys(e.metadata).length?Object.entries(e.metadata).map(([key,value])=><p key={key}><strong>{key.replaceAll('_',' ')}:</strong> <T text={"  "}/>{typeof value==='object'?JSON.stringify(value):String(value)}</p>):<p><T text={"No additional metadata available to this role."}/></p>}</details></td></tr>)}</tbody></table>{!loading&&!events.length&&!error&&<p className="panel muted"><T text={"No audit events match these filters."}/></p>}</div>
  {cursor&&<button className="btn secondary" disabled={loading} onClick={()=>load(cursor)}>{loading?<T text={'Loading…'}/>:<T text={'Load older audit events'}/>}</button>}
  {role==='administrator'&&<section className="panel"><h2 className="section-title"><T text={"Purge an encounter"}/></h2><p className="small"><T text={"Removes clinical records and source files. The audit tombstone remains."}/></p><label className="field"><T text={"Encounter ID"}/><input value={purgeId} onChange={e=>setPurgeId(e.target.value)}/></label><div className="actions"><button className="btn danger" disabled={busy||!purgeId.trim()} onClick={purge}>{busy?<T text={'Purging…'}/>:<T text={'Purge encounter'}/>}</button></div></section>}
 </div>;
}
