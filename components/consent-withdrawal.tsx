'use client';
import {T} from '@/components/language-provider';

import {useState} from 'react';
export function ConsentWithdrawal({patientId}:{patientId:string}){
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function withdraw(){setBusy(true);setError('');try{const response=await fetch('/api/privacy/consent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({patientId,withdraw:true,requestConfirmed:true})});const result=await response.json();if(!result.ok)throw new Error(result.error.message);window.location.assign('/queue');}catch(error){setError(error instanceof Error?error.message:'Withdrawal could not be saved.');setBusy(false);}}
 return <div className="stack"><label className="check"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/><span className="small"><T text={"The patient or lawful guardian has requested withdrawal of processing consent. I have verified this request. Case access and processing will stop; retention obligations are handled by the facility."}/></span></label><button className="btn secondary" disabled={!confirmed||busy} onClick={withdraw}>{busy?<T text={'Recording withdrawal…'}/>:<T text={'Record consent withdrawal'}/>}</button>{error&&<p className="error" role="alert"><T text={error}/></p>}</div>;
}
