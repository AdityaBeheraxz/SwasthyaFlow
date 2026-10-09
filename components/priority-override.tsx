'use client';
import {useId,useRef,useState} from 'react';
import {T,useUiLanguage} from './language-provider';
const priorities=['RED','YELLOW','GREEN'];
type Props={currentPriority:string;role:string;state:string;busy:boolean;onOverride:(priority:string,reason:string)=>Promise<{ok:boolean;error?:string}>};
export function PriorityOverride({currentPriority,role,state,busy,onOverride}:Props){
 const {t}=useUiLanguage(),id=useId(),pending=useRef(false);
 const [priority,setPriority]=useState(''),[reason,setReason]=useState(''),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);
 const requirements:string[]=[];
 if(role!=='medical_officer')requirements.push('Authorize a Medical Officer to override priority.');
 if(state==='PROCESSING')requirements.push('Wait for processing to finish before overriding priority.');
 if(state==='COMPLETED')requirements.push('Completed encounters cannot be changed.');
 if(!priorities.includes(currentPriority))requirements.push('A valid review priority is required before an override.');
 if(!priorities.includes(priority))requirements.push('Select a new priority.');else if(priority===currentPriority)requirements.push('Select a different priority.');
 if(reason.trim().length<10)requirements.push('Enter a written reason of at least 10 characters.');
 async function submit(event:React.FormEvent){
  event.preventDefault();if(busy||pending.current||requirements.length)return;
  pending.current=true;setMessage('');setFailed(false);
  try{const result=await onOverride(priority,reason.trim());if(result.ok){setMessage('Priority override saved. The doctor, written reason and priority change are recorded in the audit trail.');setReason('');setPriority('');}else{setFailed(true);setMessage(result.error||'The override was not saved. Please retry.');}}
  catch{setFailed(true);setMessage('The override was not saved. Please retry.');}finally{pending.current=false;}
 }
 const clear=()=>{setMessage('');setFailed(false);};
 return <form className="stack" onSubmit={submit} aria-labelledby={id+'-heading'}>
  <h3 id={id+'-heading'}><T text="Override priority"/></h3>
  <p className="small muted"><T text="Medical Officer authorization and a written reason are required. Select a priority different from the current one."/></p>
  <p className="small"><T text="Current priority:"/>{' '}<strong><T text={currentPriority}/></strong></p>
  <label className="field"><T text="New priority"/><select value={priority} onChange={event=>{setPriority(event.target.value);clear();}} aria-describedby={requirements.length?id+'-requirements':undefined}><option value=""><T text="Select a new priority."/></option>{priorities.map(value=><option key={value} value={value}>{value}{value===currentPriority?' '+t('(current)'):''}</option>)}</select></label>
  <label className="field"><T text="Written reason"/><textarea value={reason} maxLength={2000} onChange={event=>{setReason(event.target.value);clear();}} placeholder={t('Explain the verified correction (minimum 10 characters)')} aria-describedby={requirements.length?id+'-requirements':undefined}/></label>
  {requirements.length>0&&<div id={id+'-requirements'} className="notice small" role="status"><p><T text="Before recording an override:"/></p><ul>{requirements.map(requirement=><li key={requirement}><T text={requirement}/></li>)}</ul></div>}
  <button className="btn danger" type="submit" disabled={busy||requirements.length>0}>{busy?<T text="Saving priority override…"/>:<T text="Record override"/>}</button>
  {message&&<p className={failed?'error':'notice small'} role={failed?'alert':'status'}><T text={message}/></p>}
 </form>;
}
