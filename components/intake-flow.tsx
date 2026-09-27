'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {offlineActive,queueIntake} from '@/lib/offline';
import {PerformancePanel} from './performance-panel';
import {FailurePanel} from './failure-panel';

type Step='consent'|'capture'|'report'|'processing'|'done';
type Api<T>={ok:true;data:T}|{ok:false;error:{code:string;message:string}};
type SessionActor={role:string}|null;
type OcrToken={text:string;confidence:number;bbox:[number,number,number,number];page:number};
type OcrResult={reportId:string;rawText:string;tokens:OcrToken[];quality:string;meanConfidence:number;warnings:string[]};
type UploadResult={reportId:string;inspection:{pageCount:number;width?:number;height?:number;qualityStatus:string;warnings:string[]}};

async function post<T>(url:string,body:unknown):Promise<T>{
 const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const payload=await response.json() as Api<T>;
 if(!payload.ok)throw new Error(`${payload.error.code}: ${payload.error.message}`);
 return payload.data;
}

export function IntakeFlow(){
 const [hydrated,setHydrated]=useState(false);
 const [actor,setActor]=useState<SessionActor>(null);
 const [step,setStep]=useState<Step>('consent');
 const [consent,setConsent]=useState(false);
 const [age,setAge]=useState('');
 const [language,setLanguage]=useState<'hi'|'or'|'en'>('en');
 const [text,setText]=useState('');
 const [report,setReport]=useState('');
 const [reportFile,setReportFile]=useState<File|null>(null);
 const [reportPreview,setReportPreview]=useState('');
 const [reportId,setReportId]=useState('');
 const [reportReviewed,setReportReviewed]=useState(false);
 const [ocrTokens,setOcrTokens]=useState<OcrToken[]>([]);
 const [reportWarnings,setReportWarnings]=useState<string[]>([]);
 const [ocrQuality,setOcrQuality]=useState('');
 const [patientId,setPatientId]=useState('');
 const [encounterId,setEncounterId]=useState('');
 const [pendingDraft,setPendingDraft]=useState(false);
 const [pendingSync,setPendingSync]=useState(false);
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

 useEffect(()=>{setHydrated(true);fetch('/api/session').then(response=>response.json()).then(value=>setActor(value.data??null)).catch(()=>setActor(null));},[]);
 useEffect(()=>()=>{if(reportPreview)URL.revokeObjectURL(reportPreview);},[reportPreview]);
 const canIntake=actor!==null&&['health_worker','nurse','medical_officer'].includes(actor.role);
 const numericAge=Number(age);

 function selectReport(file:File|null){
  if(reportPreview)URL.revokeObjectURL(reportPreview);
  setReportFile(file);setReportPreview(file?URL.createObjectURL(file):'');setReportId('');setReport('');setReportReviewed(false);setOcrTokens([]);setReportWarnings([]);setOcrQuality('');setError('');
 }

 async function recordConsent(){
  consentStart.current=performance.now();setError('');setBusy(true);
  try{if(offlineActive()){setPendingDraft(true);setStep('capture');return;}const patient=await post<{id:string}>('/api/patients',{age:numericAge,language,consent});setPatientId(patient.id);setStep('capture');}
  catch(reason){setError(reason instanceof Error?reason.message:'SAVE_FAILED');}finally{setBusy(false);}
 }

 async function capture(){
  setError('');setBusy(true);
  try{if(pendingDraft){setStep('report');return;}const encounter=await post<{id:string}>('/api/encounters',{patientId,text,language,inputType:audioId?'voice':'text',...(audioId?{audioId,speechSegments}:{})});setEncounterId(encounter.id);timings.current.intakeMs=performance.now()-consentStart.current;setStep('report');}
  catch(reason){setError(reason instanceof Error?reason.message:'SAVE_FAILED');}finally{setBusy(false);}
 }

 async function extractReport(){
  if(!reportFile||pendingDraft)return;
  setBusy(true);setError('');setReportWarnings([]);setReportReviewed(false);const started=performance.now();
  try{
   setStage('Validating and uploading report');
   const form=new FormData();form.set('encounterId',encounterId);form.set('file',reportFile);
   const uploadResponse=await fetch('/api/reports/upload',{method:'POST',body:form});
   const uploadPayload=await uploadResponse.json() as Api<UploadResult>;
   if(!uploadPayload.ok)throw new Error(`${uploadPayload.error.code}: ${uploadPayload.error.message}`);
   setReportId(uploadPayload.data.reportId);setReportWarnings(uploadPayload.data.inspection.warnings);
   setStage('Extracting text from report');
   const result=await post<OcrResult>('/api/reports/ocr',{reportId:uploadPayload.data.reportId});
   setReport(result.rawText);setOcrTokens(result.tokens);setOcrQuality(result.quality);setReportWarnings(result.warnings);timings.current.ocrMs=performance.now()-started;
  }catch(reason){setError(reason instanceof Error?reason.message:'OCR_FAILED: Report extraction stopped.');}
  finally{setBusy(false);setStage('');}
 }

 async function confirmReport(){
  if(!reportId||!report.trim())return;
  setBusy(true);setError('');
  try{const result=await post<{warnings:string[]}>('/api/reports/ocr',{reportId,reviewedText:report,confirmed:true});setReportWarnings(result.warnings);setReportReviewed(true);}
  catch(reason){setError(reason instanceof Error?reason.message:'OCR review could not be saved.');}finally{setBusy(false);}
 }

 async function analyze(){
  setBusy(true);setError('');let timer:ReturnType<typeof setInterval>|undefined;
  try{
   if(reportFile&&!reportReviewed)throw new Error('OCR_REVIEW_REQUIRED: Check the extracted text against the original report and confirm it before continuing.');
   setStep('processing');
   if(pendingDraft){if(reportFile)throw new Error('Report files require a connection. Enter report text or reconnect before continuing.');await queueIntake({age:numericAge,language,text,inputType:'text',report,consent:true});setPendingSync(true);setStep('done');return;}
   if(!reportFile&&report.trim()){setStage('Saving staff-entered report text');const started=performance.now();await post('/api/reports/ocr',{encounterId,rawText:report});timings.current.ocrMs=performance.now()-started;}
   setStage('Normalizing source information');
   timer=setInterval(async()=>{try{const response=await fetch(`/api/encounters/${encounterId}`);const value=await response.json();if(value.ok&&value.data.encounter.state==='PROCESSING')setStage(value.data.encounter.status);}catch{}},450);
   const triageStart=performance.now();await post('/api/triage/analyze',{encounterId});timings.current.triageMs=performance.now()-triageStart;
   localStorage.setItem('sf_last_performance',JSON.stringify(timings.current));window.dispatchEvent(new Event('sf-perf'));setStep('done');
  }catch(reason){setError(reason instanceof Error?reason.message:'Processing failed');setStep('report');}
  finally{if(timer)clearInterval(timer);setBusy(false);}
 }

 async function startRecording(){setError('');try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks.current=[];const media=new MediaRecorder(stream);recorder.current=media;media.ondataavailable=event=>chunks.current.push(event.data);media.onstop=()=>{const blob=new Blob(chunks.current,{type:media.mimeType});setAudioBlob(blob);setAudioUrl(URL.createObjectURL(blob));stream.getTracks().forEach(track=>track.stop());};media.start();setRecording(true);}catch{setError('Microphone access was denied. Enter the original words manually.');}}
 function stopRecording(){recorder.current?.stop();setRecording(false);}
 async function transcribe(){if(!audioBlob||!patientId)return;setBusy(true);setError('');try{const form=new FormData();form.set('audio',new File([audioBlob],'speech.webm',{type:audioBlob.type}));form.set('patientId',patientId);form.set('langHint',language);const response=await fetch('/api/speech/transcribe',{method:'POST',body:form});const value=await response.json();if(!value.ok)throw new Error(`${value.error.code}: ${value.error.message}`);setText(value.data.text);setAudioId(value.data.audioId);setSpeechSegments(value.data.segments);setUncertain(value.data.segments.filter((segment:{confidence:number})=>segment.confidence<0.7).map((segment:{text:string})=>segment.text));}catch(reason){setError(reason instanceof Error?reason.message:'ASR_FAILED');}finally{setBusy(false);}}

 return <div className="grid-2"><div className="stack"><section className="panel"><div className="eyebrow">Step {step==='consent'?'1':step==='capture'?'2':step==='report'?'3':step==='processing'?'4':'5'} / 5</div>
 {step==='consent'&&<><h2 className="section-title">Consent & purpose</h2><p>SwasthyaFlow stores an anonymous identifier, age, language, original intake text, report sources, verified extraction, and reviewer actions. Automated output supports qualified staff review and does not make a diagnosis.</p>{hydrated&&!canIntake&&<p className="notice" role="status">{actor?.role==='administrator'?'Administrator access is limited to settings, audit, and data administration. Sign in as a Health Worker, Nurse, or Medical Officer to start an intake.':'Staff authorization is required to start an intake.'}</p>}<div className="form-grid"><label className="field">Age<input type="number" min="0" max="120" value={age} onChange={event=>setAge(event.target.value)} placeholder="Enter age"/></label><label className="field">Preferred language<select value={language} onChange={event=>setLanguage(event.target.value as 'hi'|'or'|'en')}><option value="en">English</option><option value="hi">Hindi</option><option value="or">Odia</option></select></label></div><div className="divider"/><label className="check"><input type="checkbox" disabled={!hydrated||!canIntake} checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>Consent to record and organise this information for qualified staff review has been obtained.</span></label><div className="actions"><button className="btn" disabled={!canIntake||!consent||busy||!age||numericAge<0||numericAge>120} onClick={recordConsent}>{busy?'Saving consent…':'Continue to intake →'}</button></div></>}
 {step==='capture'&&<><h2 className="section-title">Capture the concern</h2><div className="notice small">Consent {pendingDraft?'will be queued on this device':'recorded'} · Age {age} · {language.toUpperCase()}</div><p className="small muted">Enter the person’s own words or record a clip. Review every transcript before saving it.</p><button type="button" className={`record ${recording?'active':''}`} aria-label={recording?'Stop recording':'Start recording'} onClick={recording?stopRecording:startRecording}>{recording?'■':'●'}</button>{audioUrl&&<div className="stack"><audio controls src={audioUrl}>Audio playback unavailable</audio><button className="btn secondary" disabled={busy||pendingDraft} title={pendingDraft?'Transcription requires a connection. Enter text manually.':undefined} onClick={transcribe}>Transcribe recording</button></div>}{uncertain.map((phrase,index)=><p key={index} className="badge yellow">Possibly {phrase} · Check audio</p>)}<label className="field" style={{marginTop:20}}>Original words / reviewed transcript<textarea lang={language} value={text} onChange={event=>setText(event.target.value)} placeholder="Record the concern exactly as stated"/></label><div className="actions"><button className="btn" disabled={busy||!text.trim()} onClick={capture}>{busy?'Saving…':'Save intake →'}</button></div></>}
 {step==='report'&&<><h2 className="section-title">Report extraction and verification</h2><p>Upload a PNG, JPEG, or PDF report, or enter a staff-reviewed transcription. The original document remains linked to the encounter.</p><label className="field">Report document<input type="file" accept="image/png,image/jpeg,application/pdf" onChange={event=>selectReport(event.target.files?.[0]??null)}/></label>{reportFile&&<><p className="small mono">{reportFile.name} · {Math.round(reportFile.size/1024)} KB</p>{reportFile.type==='application/pdf'?<iframe className="report-preview" src={reportPreview} title="Original report preview"/>:<Image className="report-preview" src={reportPreview} alt="Original report preview" width={900} height={700} unoptimized/>}<div className="actions"><button className="btn secondary" disabled={busy||pendingDraft} onClick={extractReport}>{busy&&stage?stage:'Extract report text'}</button></div></>}{ocrQuality&&<p><span className={`badge ${ocrQuality==='GOOD'?'green':'yellow'}`}>{ocrQuality}</span> Machine extraction requires staff confirmation.</p>}{reportWarnings.map((warning,index)=><p key={index} className="notice small">{warning}</p>)}{ocrTokens.filter(token=>token.confidence<0.8).slice(0,12).map((token,index)=><span key={index} className="badge yellow">Possibly “{token.text}” · {Math.round(token.confidence*100)}%</span>)}<label className="field">{reportFile?'Extracted report text':'Staff-entered report text'}<textarea value={report} onChange={event=>{setReport(event.target.value);if(reportFile)setReportReviewed(false);}} placeholder={reportFile?'Run extraction, then compare every value with the original report':'Optional: enter only text you verified from the original report'}/></label>{reportFile&&reportId&&report.trim()&&<div className="actions"><button className="btn" disabled={busy||reportReviewed} onClick={confirmReport}>{reportReviewed?'Verified against original':'Confirm reviewed extraction'}</button></div>}<div className="divider"/><div className="actions"><button className="btn" disabled={busy||(!!reportFile&&!reportReviewed)} onClick={analyze}>{reportFile&&!reportReviewed?'Confirm report extraction first':'Organise for review →'}</button></div></>}
 {step==='processing'&&<><h2 className="section-title">Organising information</h2><p role="status" aria-live="polite">{stage||'Preparing sources'}</p><div className="wave" aria-hidden="true">{Array.from({length:25},(_,index)=><span key={index} style={{'--height':`${10+(index*17)%32}px`} as React.CSSProperties}/>)}</div></>}
 {step==='done'&&<><h2 className="section-title">{pendingSync?'PENDING SYNC':'Ready for review'}</h2><p>{pendingSync?'This intake is stored on this device and has not been confirmed by the server. Reconnect and use the navigation sync control.':'Encounter saved. The priority, verification status, and source links are available to the reviewer.'}</p><div className="actions">{!pendingSync&&<Link className="btn" href={`/encounters/${encounterId}`}>Open triage card →</Link>}<Link className="btn secondary" href="/queue">Reviewer queue</Link></div></>}
 {error&&<p className="error" role="alert">{error}</p>}</section></div><aside className="stack"><section className="panel"><h2 className="section-title">Source integrity</h2><p className="small">Uploaded files are decoded and checked for size, type, page count, image quality, and content hash. Raw OCR and staff corrections are stored separately.</p></section><section className="panel"><h2 className="section-title">Review boundary</h2><p className="small">Unverified OCR values cannot affect safety rules. A staff member must compare extraction with the original report and confirm it first.</p></section><PerformancePanel/><FailurePanel encounterId={encounterId}/></aside></div>;
}
