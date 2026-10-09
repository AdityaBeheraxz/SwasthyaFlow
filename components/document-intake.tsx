'use client';
import {T,useUiLanguage} from '@/components/language-provider';

import {useEffect,useId,useRef,useState} from 'react';
import Image from 'next/image';
export type IntakeDocument={id:string;file:File;documentType:'report'|'prescription';uploaded?:boolean;text:string;confirmed:boolean;warnings:string[];error?:string;busy?:boolean};
function DocumentPicker({documentType,documents,onAdd}:{documentType:IntakeDocument['documentType'];documents:IntakeDocument[];onAdd:(files:FileList|null,documentType:IntakeDocument['documentType'])=>void}){
 const input=useRef<HTMLInputElement>(null),id=useId();
 const selected=documents.filter(document=>document.documentType===documentType);
 return <div className="stack" data-document-picker={documentType}>
  <label className="field" htmlFor={id}><T text={documentType==='prescription'?'Prescription document':'Report document'}/></label>
  <input ref={input} id={id} tabIndex={-1} className="sr-only" type="file" multiple accept="image/png,image/jpeg,application/pdf" aria-describedby={id+'-selection'} onChange={event=>{onAdd(event.target.files,documentType);event.target.value='';}}/>
  <button type="button" className="btn secondary" onClick={()=>input.current?.click()}><T text={documentType==='prescription'?'Choose prescription files':'Choose report files'}/></button>
  <div id={id+'-selection'} className="small" role="status" aria-live="polite">{selected.length?<ul className="document-selection">{selected.map(document=><li key={document.id}>{document.file.name}</li>)}</ul>:<span className="muted"><T text={documentType==='prescription'?'No prescriptions selected':'No reports selected'}/></span>}</div>
 </div>;
}
async function result(response:Response){const value=await response.json();if(!value.ok)throw new Error(value.error.code+': '+value.error.message);return value.data;}
function DocumentRow({document,encounterId,offline,change,remove}:{document:IntakeDocument;encounterId:string;offline:boolean;change:(value:Partial<IntakeDocument>)=>void;remove:()=>void}){const {t:uiText}=useUiLanguage();
 const [preview,setPreview]=useState('');
 useEffect(()=>{const url=URL.createObjectURL(document.file);setPreview(url);return()=>URL.revokeObjectURL(url);},[document.file]);
 async function extract(){change({busy:true,error:undefined,confirmed:false});try{
  if(!document.uploaded){const form=new FormData();form.set('encounterId',encounterId);form.set('reportId',document.id);form.set('documentType',document.documentType);form.set('file',document.file);await result(await fetch('/api/reports/upload',{method:'POST',body:form}));change({uploaded:true});}
  if(document.uploaded){const saved=await result(await fetch('/api/encounters/'+encounterId));const existing=saved.reports.find((item:{id:string})=>item.id===document.id);if(existing?.rawOcr){change({text:existing.reviewedText??existing.rawOcr,warnings:existing.qualityWarnings??[],confirmed:!!existing.reviewedText});return;}}
  const data=await result(await fetch('/api/reports/ocr',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reportId:document.id})}));change({text:data.rawText,warnings:data.warnings});
 }catch(error){change({error:error instanceof Error?error.message:'Extraction failed.'});}finally{change({busy:false});}}
 async function confirm(){change({busy:true,error:undefined});try{const data=await result(await fetch('/api/reports/ocr',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reportId:document.id,reviewedText:document.text,confirmed:true})}));change({confirmed:true,warnings:data.warnings});}catch(error){change({error:error instanceof Error?error.message:'Verification failed.'});}finally{change({busy:false});}}
 return <article className="panel stack"><h3>{document.documentType==='prescription'?<T text={'Prescription'}/>:<T text={'Lab / clinical report'}/>} · {document.file.name}</h3><p className="small">{Math.round(document.file.size/1024)} KB · {document.confirmed?<T text={'Staff verified'}/>:<T text={'Needs source verification'}/>}</p>{preview&&(document.file.type==='application/pdf'?<iframe className="report-preview" src={preview} title={uiText('Original')+' '+document.file.name}/>:<Image className="report-preview" src={preview} alt={uiText('Original')+' '+document.file.name} width={900} height={700} unoptimized/>)}{document.warnings.map((warning,index)=><p key={index} className="notice small">{warning}</p>)}{offline?<p className="notice small"><T text={"This document will sync separately and remain unverified until reviewed."}/></p>:<><button className="btn secondary" disabled={document.busy||!!document.text} onClick={extract}>{document.busy?<T text={'Processing…'}/>:<T text={document.documentType==='prescription'?'Extract prescription':'Extract report'}/>}</button><label className="field"><T text={"Reviewed text · "}/>{document.file.name}<textarea value={document.text} disabled={document.busy||!document.uploaded} onChange={event=>change({text:event.target.value,confirmed:false})} placeholder={uiText("Extract, then compare each value against this document.")}/></label>{document.uploaded&&document.text&&<button className="btn" disabled={document.busy||document.confirmed} onClick={confirm}>{<><T text={document.confirmed?'Verified':'Confirm'}/> {document.file.name}</>}</button>}</>}{document.error&&<p className="error" role="alert"><T text={document.error}/></p>}{!document.uploaded&&<button className="text-link" onClick={remove}><T text={"Remove "}/>{document.file.name}</button>}</article>;
}
export function DocumentIntake({documents,onChange,encounterId,offline}:{documents:IntakeDocument[];onChange:React.Dispatch<React.SetStateAction<IntakeDocument[]>>;encounterId:string;offline:boolean}){
 const [error,setError]=useState('');
 const [maxBytes,setMaxBytes]=useState(3500000);
 useEffect(()=>{fetch('/api/health',{cache:'no-store'}).then(response=>response.json()).then(value=>{if(value.ok&&Number.isFinite(value.data.limits?.reportBytes))setMaxBytes(value.data.limits.reportBytes);}).catch(()=>{});},[]);
 function add(files:FileList|null,documentType:'report'|'prescription'){
  if(!files)return;const selected=[...files];if(documents.length+selected.length>10){setError('Attach at most ten documents per intake.');return;}
  if(selected.some(file=>!['image/png','image/jpeg','application/pdf'].includes(file.type))){setError('Each document must be PNG, JPEG or PDF.');return;}
  if(selected.some(file=>file.size>maxBytes)){setError('Document exceeds the upload limit for this site ('+(maxBytes/1000000)+' MB).');return;}
  setError('');onChange(current=>[...current,...selected.map(file=>({id:crypto.randomUUID(),file,documentType,text:'',confirmed:false,warnings:[]}))]);
 }
 return <div className="stack"><p><T text={"Prescriptions and reports are separate sources. Add several files to each category and verify every document independently."}/></p><DocumentPicker documentType="prescription" documents={documents} onAdd={add}/><DocumentPicker documentType="report" documents={documents} onAdd={add}/>{error&&<p className="error" role="alert"><T text={error}/></p>}{documents.map(document=><DocumentRow key={document.id} document={document} encounterId={encounterId} offline={offline} change={value=>onChange(current=>current.map(item=>item.id===document.id?{...item,...value}:item))} remove={()=>onChange(current=>current.filter(item=>item.id!==document.id))}/>)}</div>;
}
