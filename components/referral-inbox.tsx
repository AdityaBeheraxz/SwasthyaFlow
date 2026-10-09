'use client';
import {T} from '@/components/language-provider';

import {useCallback,useEffect,useRef,useState} from 'react';
import type {ReferralReport} from '@/lib/referral-policy';
type Received={id:string;content:string;receiptId:string;receivedAt:string;decision:string|null;mode:string;attachments:{id:string;name:string;documentType:string}[]};
type Workspace={name:string;facility:string};
const indiaTime=(value:string)=>new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
function report(row:Received):ReferralReport|null{try{const value=JSON.parse(row.content);return value.version===1&&value.patient&&value.recipient&&typeof value.reason==='string'?value:null;}catch{return null;}}
export function ReferralInbox(){
 const [rows,setRows]=useState<Received[]>([]),[error,setError]=useState(''),[workspace,setWorkspace]=useState<Workspace|null>(null);
 const [checking,setChecking]=useState(true),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[status,setStatus]=useState('pending');
 const [cursor,setCursor]=useState(''),[updated,setUpdated]=useState(''),[decisionId,setDecisionId]=useState('');
 const request=useRef(0),closed=useRef(false);
 const load=useCallback(async(next='')=>{
  if(closed.current)return;const version=++request.current;setLoading(true);
  try{
   const auth=await (await fetch('/api/referrals/workspace',{cache:'no-store'})).json();
   if(version!==request.current)return;
   if(!auth.ok)throw new Error(auth.error.message);
   if(!auth.data.authenticated){setWorkspace(null);setRows([]);setCursor('');return;}
   setWorkspace(auth.data);
   const params=new URLSearchParams({status,limit:'50'});if(next)params.set('cursor',next);
   const response=await fetch('/api/referrals/inbox?'+params,{cache:'no-store'}),v=await response.json();
   if(version!==request.current)return;
   if(!v.ok){if(response.status===401||response.status===403)setWorkspace(null);throw new Error(v.error.message);}
   setRows(previous=>next?[...previous,...v.data.filter((r:Received)=>!previous.some(p=>p.id===r.id))]:v.data);
   setCursor(response.headers.get('X-Next-Cursor')??'');setUpdated(new Date().toISOString());setError('');
  }catch(e){if(version===request.current){setRows([]);setCursor('');setError(e instanceof Error?e.message:'Inbox unavailable.');}}
  finally{if(version===request.current){setChecking(false);setLoading(false);}}
 },[status]);
 useEffect(()=>{const counter=request;setRows([]);setCursor('');void load();const timer=setInterval(()=>{if(!document.hidden)void load();},30000);return()=>{clearInterval(timer);counter.current++;};},[load]);
 async function open(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const v=await (await fetch('/api/referrals/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})})).json();setPassword('');if(!v.ok)throw new Error(v.error.message);closed.current=false;await load();}catch(e){setError(e instanceof Error?e.message:'Workspace unavailable.');}finally{setBusy(false);}}
 async function close(){closed.current=true;request.current++;setRows([]);setCursor('');setError('');setPassword('');setLoading(false);setBusy(true);try{const r=await fetch('/api/referrals/workspace',{method:'DELETE'});if(!r.ok)throw new Error();setWorkspace(null);}catch{closed.current=false;await load();setError('Workspace could not be closed. Retry closing it.');}finally{setBusy(false);}}
 async function decide(id:string,decision:string){if(decision==='DECLINED'&&!window.confirm('Decline this referral? Access to its documents will close and the referring doctor will see the decision.'))return;setDecisionId(id);setError('');try{const v=await (await fetch(`/api/referrals/${id}/decision`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision})})).json();if(!v.ok)throw new Error(v.error.message);setStatus('all');await load();}catch(e){setError(e instanceof Error?e.message:'Decision unavailable.');}finally{setDecisionId('');}}
 if(checking)return <section className="panel" role="status"><T text={"Checking referral workspace…"}/></section>;
 if(!workspace)return <section className="panel stack"><p className="eyebrow"><T text={"Restricted receiving workspace"}/></p><h2 className="section-title"><T text={"Acceptance inbox"}/></h2><p><T text={"Enter the receiving doctor’s credentials to open their facility’s inbox. Your main staff session stays signed in."}/></p>{error&&<p className="error" role="alert"><T text={error}/></p>}<form className="stack" onSubmit={open}><label className="field"><T text={"Receiving doctor username"}/><input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required/></label><label className="field"><T text={"Receiving doctor password"}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label><button className="btn" disabled={busy}>{busy?<T text={'Verifying credentials…'}/>:<T text={'Open receiving workspace'}/>}</button></form><p className="small muted"><T text={"Source-case review uses the source facility’s reviewer account. This workspace is for referrals already sent to the receiving facility."}/></p></section>;
 return <div className="stack">
  <section className="panel stack"><div className="workspace-heading"><div><p className="eyebrow"><T text={"Confidential handover"}/></p><h2 className="section-title"><T text={"Acceptance inbox"}/></h2><p><strong>{workspace.facility}</strong><br/><span className="small muted"><T text={"Receiving Medical Officer · "}/>{workspace.name}</span></p></div><button className="btn secondary" disabled={busy} onClick={close}>{busy?<T text={'Closing receiving workspace…'}/>:<T text={'Close receiving workspace'}/>}</button></div>
   <p className="small muted"><T text={"Only this facility’s doctors can open consented referrals and their original documents. Institutions marked prototype are pitch workspaces awaiting hospital onboarding."}/></p>
   <div className="workspace-heading"><label className="field"><T text={"Referral status"}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="pending"><T text={"Awaiting acceptance"}/></option><option value="accepted"><T text={"Accepted"}/></option><option value="all"><T text={"All available referrals"}/></option></select></label><button className="btn secondary" onClick={()=>load()} disabled={loading}>{loading?<T text={'Loading referrals…'}/>:<T text={'Refresh inbox'}/>}</button></div>
   <p className="small muted" role="status">{rows.length} <T text={" referrals loaded"}/>{updated?' · Updated '+indiaTime(updated)+' IST':<T text={''}/>} <T text={" · Acceptance records software handover, not an appointment."}/></p>
  </section>
  {error&&<p role="alert" className="error"><T text={error}/></p>}
  {!rows.length&&!loading&&!error&&<section className="panel"><h2 className="section-title">{status==='pending'?<T text={'No referrals awaiting acceptance'}/>:status==='accepted'?<T text={'No accepted referrals'}/>:<T text={'No referrals received yet'}/>}</h2><p className="muted"><T text={"A source doctor must approve a case, select this facility and send it with patient or guardian consent. Creating or downloading a report alone does not deliver it."}/></p></section>}
  {rows.map(row=>{const r=report(row);if(!r)return <article className="panel" key={row.id}><p className="error"><T text={"This referral cannot be displayed. Contact the facility administrator with reference "}/>{row.id}.</p></article>;return <article className="panel stack referral-record" key={row.id} data-referral-id={row.id}>
   <div className="workspace-heading"><div><p className="eyebrow">{r.sourceFacility}</p><h2 className="section-title">{r.patient.reference}{r.patient.name?' · '+r.patient.name:<T text={''}/>}</h2><p className="small"><T text={"Age "}/>{r.patient.age} · {r.patient.language.toUpperCase()} · {r.recipient.department}</p></div><span className={'badge '+(r.priority==='RED'?'red':r.priority==='YELLOW'?'yellow':'unavailable')}><T text={r.priority}/> <T text={" · review priority"}/></span></div>
   <p className="small mono">{row.mode==='local'?<T text={'RECEIVED IN PROTOTYPE'}/>:<T text={'RECEIVED IN SWASTHYAFLOW'}/>} · {row.decision??<T text={'Awaiting doctor acceptance'}/>}</p><p className="small muted"><T text={"Received "}/>{indiaTime(row.receivedAt)} <T text={" IST · Receipt "}/>{row.receiptId}</p><p>{r.reason}</p>
   <details><summary><T text={"Doctor-reviewed concerns"}/></summary><p className="source-details">{r.summary}</p><p className="small"><T text={"Approving doctor: "}/>{r.doctor}</p></details>
   <div><h3><T text={"Original prescriptions and reports"}/></h3><p className="small muted"><T text={"Source evidence. SwasthyaFlow generates no treatment advice or prescriptions."}/></p><div className="document-list">{row.attachments.map(a=><a key={a.id} className="document-link" target="_blank" rel="noreferrer" href={`/api/referrals/${row.id}/attachments/${a.id}?workspace=receiving`}>{a.documentType} · {a.name}</a>)}</div>{!row.attachments.length&&<p><T text={"No source documents were uploaded."}/></p>}</div>
   <div className="actions"><a className="btn secondary" target="_blank" rel="noreferrer" href={`/api/referrals/${row.id}/download?print=1&workspace=receiving`}><T text={"Print referral report and documents"}/></a><a className="btn secondary" href={`/api/referrals/${row.id}/download?workspace=receiving`}><T text={"Download referral bundle"}/></a></div>
   {!row.decision&&<div className="actions"><button className="btn" disabled={!!decisionId} onClick={()=>decide(row.id,'ACCEPTED')}>{decisionId===row.id?<T text={'Recording decision…'}/>:<T text={'Accept referral'}/>}</button><button className="btn secondary" disabled={!!decisionId} onClick={()=>decide(row.id,'DECLINED')}><T text={"Decline referral"}/></button></div>}
  </article>;})}
  {cursor&&<button className="btn secondary" disabled={loading} onClick={()=>load(cursor)}><T text={"Load older referrals"}/></button>}
 </div>;
}
