'use client';
import {T,useUiLanguage} from '@/components/language-provider';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {DocumentIntake,type IntakeDocument} from './document-intake';
import {recordingMimeType} from '@/lib/audio-format';
import {offlineActive,queueIntake,intakeActor,syncPending,pendingForActor} from '@/lib/offline';
import {syncErrorMessage,type SyncedIntake} from '@/lib/sync-status';
import {FacilityNotice} from './facility-notice';
import {PerformancePanel} from './performance-panel';
import {FailurePanel} from './failure-panel';

type Step='consent'|'capture'|'report'|'processing'|'done';
type Api<T>={ok:true;data:T}|{ok:false;error:{code:string;message:string}};
type SessionActor={role:string}|null;
async function post<T>(url:string,body:unknown):Promise<T>{
 const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const payload=await response.json() as Api<T>;
 if(!payload.ok)throw new Error(`${payload.error.code}: ${payload.error.message}`);
 return payload.data;
}

export function IntakeFlow(){const {t:uiText}=useUiLanguage();
 const [hydrated,setHydrated]=useState(false);
 const [actor,setActor]=useState<SessionActor>(null);
 const [step,setStep]=useState<Step>('consent');
 const [consent,setConsent]=useState(false);
 const [patientName,setPatientName]=useState('');
 const [documents,setDocuments]=useState<IntakeDocument[]>([]);
 const [speechMode,setSpeechMode]=useState('');
 const [speechLanguages,setSpeechLanguages]=useState<string[]>([]);
 const [speechConfigured,setSpeechConfigured]=useState<boolean|null>(null);
 const [age,setAge]=useState('');
 const [language,setLanguage]=useState<'hi'|'or'|'en'>('en');
 const [text,setText]=useState('');
 const [report,setReport]=useState('');
 const [patientId,setPatientId]=useState('');
 const [encounterId,setEncounterId]=useState('');
 const [pendingDraft,setPendingDraft]=useState(false);
 const [pendingSync,setPendingSync]=useState(false);
 const [verificationRequired,setVerificationRequired]=useState(false);
 const draftId=useRef('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [stage,setStage]=useState('');
 const [recording,setRecording]=useState(false);
 const [audioUrl,setAudioUrl]=useState('');
 const [audioBlob,setAudioBlob]=useState<Blob|null>(null);
 const [audioId,setAudioId]=useState('');
 const [speechSegments,setSpeechSegments]=useState<{text:string;confidence:number;start?:number;end?:number}[]>([]);
 const [uncertain,setUncertain]=useState<string[]>([]);
 const recorder=useRef<MediaRecorder|null>(null);
 const chunks=useRef<Blob[]>([]);
 const consentStart=useRef(0);
 const timings=useRef<{intakeMs?:number;ocrMs?:number;triageMs?:number}>({});

 useEffect(()=>{fetch('/api/speech/config').then(r=>r.json()).then(v=>{setSpeechConfigured(v.ok&&(v.data.configured||v.data.fixture));setSpeechMode(v.data?.mode??'');setSpeechLanguages(v.data?.languages??[]);}).catch(()=>setSpeechConfigured(false));setHydrated(true);intakeActor().then(setActor).catch(()=>setActor(null));},[]);
 useEffect(()=>{const synced=(event:Event)=>{const result=(event as CustomEvent<SyncedIntake>).detail;if(result.draftId!==draftId.current)return;setEncounterId(result.encounterId);setVerificationRequired(result.verificationRequired);setPendingSync(false);setError('');};window.addEventListener('sf-intake-synced',synced);return()=>window.removeEventListener('sf-intake-synced',synced);},[]);
 async function retrySync(){setBusy(true);setError('');try{if(!navigator.onLine){setError('This device is offline. Reconnect, then retry sync.');return;}localStorage.removeItem('sf_simulate_offline');window.dispatchEvent(new Event('sf-offline-change'));const result=await syncPending();const draft=(await pendingForActor()).find(item=>item.id===draftId.current);if(draft||result.error)setError(syncErrorMessage(draft?.error??result.error??'SYNC_FAILED'));}catch{setError(syncErrorMessage('SYNC_FAILED'));}finally{setBusy(false);}}
 const canIntake=actor!==null&&['health_worker','nurse','medical_officer'].includes(actor.role);
 const numericAge=Number(age);

 async function recordConsent(){
  consentStart.current=performance.now();setError('');setBusy(true);
  try{if(offlineActive()){setPendingDraft(true);setStep('capture');return;}const patient=await post<{id:string}>('/api/patients',{...(patientName.trim()?{name:patientName.trim()}:{}),age:numericAge,language,consent,consentAuthority:numericAge<18?'guardian':'self'});setPatientId(patient.id);setStep('capture');}
  catch(reason){setError(reason instanceof Error?reason.message:'SAVE_FAILED');}finally{setBusy(false);}
 }

 async function capture(){
  setError('');setBusy(true);
  try{if(pendingDraft){setStep('report');return;}const encounter=await post<{id:string}>('/api/encounters',{patientId,text,language,inputType:audioId?'voice':'text',...(audioId?{audioId,speechSegments}:{})});setEncounterId(encounter.id);timings.current.intakeMs=performance.now()-consentStart.current;setStep('report');}
  catch(reason){setError(reason instanceof Error?reason.message:'SAVE_FAILED');}finally{setBusy(false);}
 }

 async function analyze(){
  setBusy(true);setError('');let timer:ReturnType<typeof setInterval>|undefined;
  try{
   if(!pendingDraft&&documents.some(item=>!item.confirmed))throw new Error('OCR_REVIEW_REQUIRED: Check the extracted text against the original report and confirm it before continuing.');
   setStep('processing');
   if(pendingDraft){draftId.current=await queueIntake({...(patientName.trim()?{patientName:patientName.trim()}:{}),age:numericAge,language,text,inputType:audioBlob?'voice':'text',report,consent:true,consentAuthority:numericAge<18?'guardian':'self'},{documents:documents.map(item=>({file:item.file,documentType:item.documentType})),audio:audioBlob});setPendingSync(true);setStep('done');return;}
   if(report.trim()){setStage('Saving staff-entered report text');const started=performance.now();await post('/api/reports/ocr',{encounterId,rawText:report});timings.current.ocrMs=performance.now()-started;}
   setStage('Normalizing source information');
   timer=setInterval(async()=>{try{const response=await fetch(`/api/encounters/${encounterId}`);const value=await response.json();if(value.ok&&value.data.encounter.state==='PROCESSING')setStage(value.data.encounter.status);}catch{}},450);
   const triageStart=performance.now();await post('/api/triage/analyze',{encounterId});timings.current.triageMs=performance.now()-triageStart;
   localStorage.setItem('sf_last_performance',JSON.stringify(timings.current));window.dispatchEvent(new Event('sf-perf'));setStep('done');
  }catch(reason){setError(reason instanceof Error?reason.message:'Processing failed');setStep('report');}
  finally{if(timer)clearInterval(timer);setBusy(false);}
 }

 async function startRecording(){setError('');if(audioUrl)URL.revokeObjectURL(audioUrl);setAudioUrl('');setAudioBlob(null);setAudioId('');try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks.current=[];const mimeType=recordingMimeType();if(!mimeType){stream.getTracks().forEach(track=>track.stop());throw new Error('WEBM_UNSUPPORTED');}const media=new MediaRecorder(stream,{mimeType});recorder.current=media;media.ondataavailable=event=>chunks.current.push(event.data);media.onstop=()=>{const blob=new Blob(chunks.current,{type:media.mimeType});setAudioId('');setSpeechSegments([]);setUncertain([]);setAudioBlob(blob);if(audioUrl)URL.revokeObjectURL(audioUrl);setAudioUrl(URL.createObjectURL(blob));stream.getTracks().forEach(track=>track.stop());};media.start();setRecording(true);}catch(error){setError(error instanceof Error&&error.message==='WEBM_UNSUPPORTED'?'This browser cannot record WebM audio. Use Chrome or Edge, or enter the original words manually.':'Microphone access was denied. Enter the original words manually.');}}
 function stopRecording(){recorder.current?.stop();setRecording(false);}
 async function transcribe(){if(!audioBlob||!patientId)return;setBusy(true);setError('');try{const form=new FormData();form.set('audio',new File([audioBlob],'speech.webm',{type:audioBlob.type}));form.set('patientId',patientId);form.set('langHint',language);const response=await fetch('/api/speech/transcribe',{method:'POST',body:form});const value=await response.json();if(!value.ok)throw new Error(`${value.error.code}: ${value.error.message}`);setText(value.data.text);setAudioId(value.data.audioId);setSpeechSegments(value.data.segments);setUncertain(value.data.segments.filter((segment:{confidence:number})=>segment.confidence<0.7).map((segment:{text:string})=>segment.text));}catch(reason){setError(reason instanceof Error?reason.message:'ASR_FAILED');}finally{setBusy(false);}}

 return <div className="grid-2"><div className="stack"><section className="panel"><div className="eyebrow"><T text={"Step "}/>{step==='consent'?'1':step==='capture'?'2':step==='report'?'3':step==='processing'?'4':'5'} / 5</div>
 {step==='consent'&&<><h2 className="section-title"><T text={"Consent & purpose"}/></h2><p><T text={"SwasthyaFlow stores a patient name when supplied, a patient identifier, age, language, original intake text, report sources, verified extraction, and reviewer actions. Automated output supports qualified staff review and does not make a diagnosis."}/></p><FacilityNotice consent/>{hydrated&&!canIntake&&<p className="notice" role="status">{actor?.role==='administrator'?<T text={'Administrator access is limited to settings, audit, and data administration. Sign in as a Health Worker, Nurse, or Medical Officer to start an intake.'}/>:<T text={'Staff authorization is required to start an intake.'}/>}</p>}<div className="form-grid"><label className="field"><T text={"Patient name"}/><input autoComplete="off" maxLength={200} value={patientName} onChange={event=>setPatientName(event.target.value)} placeholder={uiText("Full name, if supplied")}/></label><label className="field"><T text={"Age"}/><input type="number" min="0" max="120" value={age} onChange={event=>{setAge(event.target.value);setConsent(false);}} placeholder={uiText("Enter age")}/></label><label className="field"><T text={"Preferred language"}/><select value={language} onChange={event=>setLanguage(event.target.value as 'hi'|'or'|'en')}><option value="en"><T text={"English"}/></option><option value="hi"><T text={"Hindi"}/></option><option value="or"><T text={"Odia"}/></option></select></label></div><div className="divider"/><label className="check"><input type="checkbox" disabled={!hydrated||!canIntake} checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>{numericAge<18?<T text={'Verified parent or lawful guardian consent'}/>:<T text={'Patient consent'}/>} <T text={" to record and organise this information for qualified staff review has been obtained. This does not authorize sharing, training, diagnosis or treatment advice."}/></span></label><div className="actions"><button className="btn" disabled={!canIntake||!consent||busy||!age||numericAge<0||numericAge>120} onClick={recordConsent}>{busy?<T text={'Saving consent…'}/>:<T text={'Continue to intake →'}/>}</button></div></>}
 {step==='capture'&&<><h2 className="section-title"><T text={"Capture the concern"}/></h2><div className="notice small"><T text={"Consent "}/>{pendingDraft?<T text={'will be queued on this device'}/>:<T text={'recorded'}/>} <T text={" · Age "}/>{age} · {language.toUpperCase()}</div><p className="small muted"><T text={"Enter the person’s own words or record a clip. Review every transcript before saving it."}/></p><button type="button" className={`record ${recording?'active':''}`} aria-label={recording?uiText('Stop recording'):uiText('Start recording')} onClick={recording?stopRecording:startRecording}>{recording?'■':'●'}</button>{audioUrl&&<div className="stack"><audio controls src={audioUrl}><T text={"Audio playback unavailable"}/></audio><button className="btn secondary" disabled={busy||pendingDraft||speechConfigured!==true||!speechLanguages.includes(language)} title={pendingDraft?uiText('Transcription requires a connection. Enter text manually.'):undefined} onClick={transcribe}><T text={"Transcribe recording"}/></button></div>}{speechMode==='local'&&speechConfigured&&<p className="notice small"><T text={"Local transcription · no API key · English and Hindi supported. Clips are limited to two minutes. Compare the transcript with the recording before saving."}/>{language==='or'?<T text={' Odia is not supported by this local model; enter a verified transcript manually.'}/>:<T text={''}/>}</p>}{speechConfigured===false&&<p className="notice small"><T text={"Automatic transcription is not configured. Install/configure the local speech model, or connect a speech endpoint. You can play the recording and enter a verified transcript below."}/></p>}{uncertain.map((phrase,index)=><p key={index} className="badge yellow"><T text={"Possibly "}/>{phrase} <T text={" · Check audio"}/></p>)}<label className="field" style={{marginTop:20}}><T text={"Original words / reviewed transcript"}/><textarea lang={language} value={text} onChange={event=>setText(event.target.value)} placeholder={uiText("Record the concern exactly as stated")}/></label><div className="actions"><button className="btn" disabled={busy||!text.trim()} onClick={capture}>{busy?<T text={'Saving…'}/>:<T text={'Save intake →'}/>}</button></div></>}
 {step==='report'&&<><h2 className="section-title"><T text={"Report extraction and verification"}/></h2><DocumentIntake documents={documents} onChange={setDocuments} encounterId={encounterId} offline={pendingDraft}/><label className="field"><T text={"Staff-entered report text"}/><textarea value={report} onChange={event=>setReport(event.target.value)} placeholder={uiText("Optional: enter only text verified from the original report")}/></label><p className="notice small"><T text={"OCR can misread documents. Compare medicine names, strengths, schedules, duration and lab values against each original before confirming. Missing or unclear information stays unknown."}/></p><div className="actions"><button className="btn" disabled={busy||(!pendingDraft&&documents.some(item=>!item.confirmed||item.busy))} onClick={analyze}>{pendingDraft?<T text={'Save encrypted draft for sync →'}/>:documents.some(item=>!item.confirmed)?<T text={'Confirm every document first'}/>:<T text={'Organise for review →'}/>}</button></div></>}
 {step==='processing'&&<><h2 className="section-title"><T text={"Organising information"}/></h2><p role="status" aria-live="polite"><T text={stage||'Preparing sources'}/></p><div className="wave" aria-hidden="true">{Array.from({length:25},(_,index)=><span key={index} style={{'--height':`${10+(index*17)%32}px`} as React.CSSProperties}/>)}</div></>}
 {step==='done'&&<><h2 className="section-title">{pendingSync?<T text={'PENDING SYNC'}/>:verificationRequired?<T text={'Sources saved · verification required'}/>:<T text={'Ready for review'}/>}</h2><p>{pendingSync?<T text={'This encrypted intake is still on this device. It may be offline or offline simulation is enabled. Reconnect and sync below to save it to the server.'}/>:verificationRequired?<T text={'The server saved this intake and its documents. Open the case to extract and verify each document before preparing a review note.'}/>:<T text={'Encounter saved. The priority, verification status, and source links are available to the reviewer.'}/>}</p><div className="actions">{pendingSync&&<button className="btn" disabled={busy} onClick={retrySync}>{busy?<T text={'Syncing…'}/>:<T text={'Reconnect and sync intake'}/>}</button>}{!pendingSync&&<Link className="btn" href={`/encounters/${encounterId}`}><T text={"Open triage card →"}/></Link>}<Link className="btn secondary" href="/queue"><T text={"Reviewer queue"}/></Link></div></>}
 {error&&<p className="error" role="alert"><T text={error}/></p>}</section></div><aside className="stack"><section className="panel"><h2 className="section-title"><T text={"Source integrity"}/></h2><p className="small"><T text={"Uploaded files are decoded and checked for size, type, page count, image quality, and content hash. Raw OCR and staff corrections are stored separately."}/></p></section><section className="panel"><h2 className="section-title"><T text={"Review boundary"}/></h2><p className="small"><T text={"Unverified OCR values cannot affect safety rules. A staff member must compare extraction with the original report and confirm it first."}/></p></section><PerformancePanel/><FailurePanel encounterId={encounterId}/></aside></div>;
}
