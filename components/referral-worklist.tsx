'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {T,useUiLanguage} from '@/components/language-provider';
import {ReferralPanel} from '@/components/referral-panel';
import {ReviewerAuthorization} from '@/components/reviewer-authorization';
import {deliveryLabels} from '@/lib/referral-delivery-config';
type Row={encounter:{id:string;state:string;priority:string|null;createdAt:string};patient:{reference:string;name:string|null;age:number;language:string};referralCount:number;deliveryStatus:string|null;decision:string|null};
type Case={encounter:{state:string};patient:{name:string|null;anonymousPatientId:string;age:number};note:{summary:string}|null};
type Reviewer={role:string;name:string;scoped:boolean;facility:string};

function ReferringCase({id,onChanged,onClose}:{id:string;onChanged:()=>void;onClose:()=>void}){
 const [data,setData]=useState<Case|null>(null),[reviewer,setReviewer]=useState<Reviewer|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0);
 useEffect(()=>{const controller=new AbortController();setError('');
  Promise.all([fetch('/api/encounters/'+id,{signal:controller.signal,cache:'no-store'}).then(r=>r.json()),fetch('/api/reviews/workspace',{signal:controller.signal,cache:'no-store'}).then(r=>r.json())]).then(([c,r])=>{if(!c.ok||!r.ok)throw new Error(c.error?.message??r.error?.message);setData(c.data);setReviewer(r.data);}).catch(e=>{if(e.name!=='AbortError'){setData(null);setReviewer(null);setError(e.message);}});
  return()=>controller.abort();
 },[id,version]);
 const reload=useCallback(async()=>{setVersion(v=>v+1);onChanged();},[onChanged]);
 if(error)return <section className="panel"><p className="error" role="alert"><T text={error}/></p><button className="btn secondary" onClick={onClose}><T text="Back to patient list"/></button></section>;
 if(!data||!reviewer)return <section className="panel" role="status"><T text="Loading encounter…"/></section>;
 const approved=['APPROVED','REFERRAL_GENERATED'].includes(data.encounter.state);
 return <div className="stack">
  <section className="panel stack"><div className="workspace-heading"><div><h2 className="section-title">{data.patient.name??data.patient.anonymousPatientId}</h2><p className="small mono">{data.patient.anonymousPatientId} · <T text="Age"/> {data.patient.age} · <T text={data.encounter.state}/></p></div><button className="btn secondary" onClick={onClose}><T text="Back to patient list"/></button></div>
   {data.note&&<details><summary><T text="Review note"/></summary><p>{data.note.summary}</p></details>}
   <div className="actions"><Link className="text-link" href={'/encounters/'+id}><T text="Open case and original sources"/></Link><Link className="text-link" href={'/audit?encounterId='+id}><T text="Inspect triage audit"/></Link></div>
   {!approved&&<p className="notice"><T text="Approve the reviewed case before creating a referral."/></p>}
  </section>
  <ReviewerAuthorization {...reviewer} onChanged={reload}/>
  <ReferralPanel key={reviewer.role+reviewer.name} id={id} state={data.encounter.state} age={data.patient.age} onSaved={reload}/>
 </div>;
}

export function ReferralWorklist(){
 const {t,language}=useUiLanguage();
 const params=useSearchParams(),router=useRouter(),caseParam=params.get('case');
 const caseId=caseParam&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseParam)?caseParam:null;
 const [rows,setRows]=useState<Row[]>([]),[view,setView]=useState('ready'),[search,setSearch]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0),[version,setVersion]=useState(0),[selected,setSelected]=useState<string|null>(caseId),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>setSelected(caseId),[caseId]);
 const refresh=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setRows([]);setError('');
  fetch('/api/referrals/worklist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({view,search:query,page}),signal:controller.signal,cache:'no-store'}).then(r=>r.json()).then(v=>{if(!v.ok)throw new Error(v.error.message);setRows(v.data);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[view,query,page,version]);
 if(selected)return <ReferringCase key={selected} id={selected} onChanged={refresh} onClose={()=>{setSelected(null);router.replace('/referrals',{scroll:false});refresh();}}/>;
 return <div className="stack">
  <section className="panel stack"><div className="workspace-heading"><div><h2 className="section-title"><T text="Refer patients"/></h2><p className="small muted"><T text="Choose a patient from your facility. A Medical Officer decides whether to refer after reviewing the case; priority alone does not authorize referral."/></p></div><button className="btn secondary" disabled={loading} onClick={refresh}><T text="Refresh patient list"/></button></div>
   <form className="referral-filters" onSubmit={e=>{e.preventDefault();setQuery(search.trim());setPage(0);}}><label className="field"><T text="Referral stage"/><select value={view} onChange={e=>{setView(e.target.value);setPage(0);}}><option value="ready">{t('Ready to refer')}</option><option value="review">{t('Needs doctor review')}</option><option value="existing">{t('Existing referrals')}</option><option value="all">{t('All active cases')}</option></select></label><label className="field"><T text="Find a patient"/><input value={search} maxLength={80} onChange={e=>setSearch(e.target.value)} placeholder={t('Patient name or reference')}/></label><button className="btn secondary" type="submit"><T text="Search"/></button></form>
   <p className="small muted"><T text="Only cases with active consent are shown. Creating or sending a referral requires doctor authorization and separate sharing consent."/></p>
  </section>
  {error&&<p className="error" role="alert"><T text={error}/></p>}
  {loading?<p className="panel" role="status"><T text="Loading patients…"/></p>:!error&&<><div className="table-wrap"><table><caption className="sr-only"><T text="Facility patients for referral"/></caption><thead><tr><th><T text="Patient"/></th><th><T text="Priority"/></th><th><T text="Status"/></th><th><T text="Referral progress"/></th><th><T text="Action"/></th></tr></thead><tbody>{rows.map(row=>{const ready=['APPROVED','REFERRAL_GENERATED'].includes(row.encounter.state),priority=row.encounter.priority??'PRIORITY_UNAVAILABLE';return <tr key={row.encounter.id} className={priority==='RED'?'pinned':''}><td><strong>{row.patient.name??<T text="Name not recorded"/>}</strong><div className="small mono">{row.patient.reference} · <T text="Age"/> {row.patient.age}</div><div className="small muted">{new Date(row.encounter.createdAt).toLocaleString(language==='en'?'en-IN':language==='hi'?'hi-IN':'or-IN',{timeZone:'Asia/Kolkata'})} IST</div></td><td><span className={'badge '+(priority==='RED'?'red':priority==='YELLOW'?'yellow':priority==='GREEN'?'green':'unavailable')}><T text={priority}/></span></td><td><T text={row.encounter.state}/></td><td>{row.referralCount?<><T text={row.deliveryStatus?deliveryLabels[row.deliveryStatus]??row.deliveryStatus:'Existing referrals'}/>{row.decision&&<> · <T text={row.decision}/></>}</>:<T text={ready?'Ready to refer':'Needs doctor review'}/>}</td><td>{ready||row.referralCount?<button className="text-link" onClick={()=>{setSelected(row.encounter.id);router.push('/referrals?case='+row.encounter.id,{scroll:false});}}><T text={row.referralCount?'Manage referral':'Refer patient'}/></button>:<Link className="text-link" href={'/encounters/'+row.encounter.id}><T text="Review case"/></Link>}</td></tr>;})}</tbody></table></div>{!rows.length&&<section className="panel"><h3><T text="No patients match this referral stage"/></h3><p className="muted"><T text="Choose Needs doctor review or All active cases to review a patient before referral."/></p></section>}<div className="actions"><button className="btn secondary" disabled={page===0} onClick={()=>setPage(p=>p-1)}><T text="Previous page"/></button><span><T text="Page"/> {page+1}</span><button className="btn secondary" disabled={rows.length<50} onClick={()=>setPage(p=>p+1)}><T text="Next page"/></button></div></>}
 </div>;
}
