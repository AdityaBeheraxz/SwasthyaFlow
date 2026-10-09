'use client';
import {T} from '@/components/language-provider';

import {useState} from 'react';
import {ReportOverlay} from './report-overlay';
import type {ReportField} from '@/lib/ocr/report-data';
type Token={text:string;confidence:number;bbox:[number,number,number,number];page?:number};
export type ReportView={
 id:string;
 documentType?:string;
 fileUrl:string|null;
 fileName?:string|null;
 fileMimeType?:string|null;
 fileSize?:number|null;
 fileSha256?:string|null;
 pageCount?:number|null;
 rawOcr:string|null;
 reviewedText?:string|null;
 reviewedBy?:string|null;
 reviewedAt?:string|null;
 ocrEngine?:string|null;
 ocrConfidencePermille?:number|null;
 ocrError?:string|null;
 qualityStatus?:string|null;
 qualityWarnings?:string[]|null;
 ocrTokens:Token[]|null;
 extractedData:Record<string,unknown>|null;
};

export function ReportSource({report,onSource,editable=false,editingRestriction,onSaved}:{report:ReportView;onSource:(source:string)=>void;editable?:boolean;editingRestriction?:string;onSaved?:()=>Promise<void>}){
 const [reviewed,setReviewed]=useState(report.reviewedText??report.rawOcr??''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function save(){setBusy(true);try{const response=await fetch('/api/reports/ocr',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reportId:report.id,reviewedText:reviewed,confirmed:true})});const payload=await response.json();if(!payload.ok)throw new Error(payload.error.message);await onSaved?.();setMessage('Report corrections and verification saved. Re-evaluate the encounter before approval.');}catch(error){setMessage(error instanceof Error?error.message:'Save failed');}finally{setBusy(false);}}
 async function extract(){setBusy(true);try{const response=await fetch('/api/reports/ocr',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reportId:report.id})});const value=await response.json();if(!value.ok)throw new Error(value.error.message);setReviewed(value.data.rawText);await onSaved?.();setMessage('Extraction is ready to compare with the original.');}catch(error){setMessage(error instanceof Error?error.message:'Extraction failed');}finally{setBusy(false);}}
 const confidence=report.ocrConfidencePermille===null||report.ocrConfidencePermille===undefined?null:Math.round(report.ocrConfidencePermille/10);
 return <section className="panel stack">
  <h3>{report.documentType==='prescription'?<T text={'Prescription'}/>:<T text={'Lab / clinical report'}/>}</h3><div><span className={`badge ${report.qualityStatus==='HUMAN_VERIFIED'?'green':report.qualityStatus==='OCR_FAILED'?'red':'yellow'}`}>{report.qualityStatus??<T text={'PENDING'}/>}</span>{confidence!==null&&<span className="small mono"> <T text={" OCR confidence "}/>{confidence}%</span>}</div>
  {report.fileName&&<p className="small mono">{report.fileName} · {report.pageCount??1} <T text={" page"}/>{report.pageCount===1?<T text={''}/>:'s'} · {report.ocrEngine??'OCR pending'}</p>}
  {report.fileUrl&&!report.rawOcr&&<div className="stack">
   <button type="button" className="btn secondary" disabled={busy||!editable||report.qualityStatus==='OCR_PROCESSING'} onClick={extract}>{busy||report.qualityStatus==='OCR_PROCESSING'?<T text={'Extracting…'}/>:<T text={report.documentType==='prescription'?'Extract prescription':'Extract report'}/>}</button>
   {!editable&&<p className="notice small"><T text={editingRestriction??'Document extraction is unavailable in this workspace.'}/></p>}
   {message&&<p role="status"><T text={message}/></p>}
  </div>}
  {report.qualityWarnings?.map((warning,index)=><p key={index} className="notice small">{warning}</p>)}
  {report.rawOcr&&<div><h3>{report.ocrEngine==='staff_transcription'?<T text={'Original staff transcription'}/>:<T text={'Original OCR output'}/>}</h3><pre className="source-details">{report.rawOcr}</pre></div>}
  {report.reviewedText&&<div><h3><T text={"Staff-verified report text"}/></h3><pre className="source-details">{report.reviewedText}</pre><p className="small muted"><T text={"Verified "}/>{report.reviewedAt?new Date(report.reviewedAt).toLocaleString():<T text={''}/>}</p></div>}
  {Array.isArray(report.extractedData?.fields)&&<div className="table-wrap"><table><thead><tr><th><T text={"Field"}/></th><th><T text={"Value"}/></th><th><T text={"Report reference"}/></th><th><T text={"Verification"}/></th></tr></thead><tbody>{(report.extractedData.fields as ReportField[]).map((field,index)=><tr key={index}><td>{field.label}</td><td>{field.value} <T text={"  "}/>{field.unit}</td><td>{field.referenceRange??<T text={'Not supplied'}/>}</td><td><button className="text-link" onClick={()=>onSource(field.sourceText)}>{field.state}</button></td></tr>)}</tbody></table></div>}
  {Array.isArray(report.extractedData?.prescriptionItems)&&<div className="table-wrap"><table><thead><tr><th><T text={"Medicine as written"}/></th><th><T text={"Strength"}/></th><th><T text={"Schedule as written"}/></th><th><T text={"Duration"}/></th><th><T text={"State"}/></th></tr></thead><tbody>{(report.extractedData.prescriptionItems as import('@/lib/ocr/prescription').PrescriptionItem[]).map((item,index)=><tr key={index}><td><button className="text-link" onClick={()=>onSource(item.sourceText)}>{item.medicine??<T text={'Unclear — verify original'}/>}</button></td><td>{item.strength??<T text={'Not read'}/>}</td><td>{item.frequency??<T text={'Not supplied / unclear'}/>}</td><td>{item.duration??<T text={'Not supplied / unclear'}/>}</td><td>{item.state}</td></tr>)}</tbody></table><p className="small"><T text={"Transcribed source information only. Missing prescription details are never inferred."}/></p></div>}
  {report.fileUrl&&report.ocrEngine==='tesseract.js'&&Array.isArray(report.extractedData?.pages)&&<details><summary><T text={"Inspect uncertain text on report pages"}/></summary><ReportOverlay id={report.id} tokens={report.ocrTokens??[]} pages={report.extractedData.pages as {page:number;width:number;height:number}[]}/></details>}
  {editable&&(report.rawOcr||(!report.fileUrl&&report.reviewedText))&&<details><summary><T text={"Correct report extraction"}/></summary><label className="field"><T text={"Reviewed report text"}/><textarea value={reviewed} onChange={event=>setReviewed(event.target.value)}/></label><button className="btn secondary" disabled={busy||!reviewed.trim()} onClick={save}><T text={"Save verified report correction"}/></button>{message&&<p role="status"><T text={message}/></p>}</details>}
  {!report.rawOcr&&!report.reviewedText&&(report.ocrError?<p className="error" role="alert">OCR failed: {report.ocrError}</p>:<p className="notice small" role="status"><T text={busy||report.qualityStatus==='OCR_PROCESSING'?'Extracting…':'Text has not been extracted yet.'}/></p>)}
  {report.fileUrl&&<a className="text-link" href={`/api/reports/file/${report.id}`} target="_blank" rel="noreferrer"><T text={"Open original report ↗"}/></a>}
  {report.ocrTokens?.filter(token=>token.confidence<0.8).slice(0,20).map((token,index)=><button key={index} className="badge yellow" onClick={()=>onSource(`Report token: ${token.text}\nConfidence: ${Math.round(token.confidence*100)}%\nPage: ${token.page??1}\nBounding box: ${token.bbox.join(', ')}\nOpen the original report to verify.`)}><T text={"Possibly "}/>{token.text} <T text={" · inspect source"}/></button>)}
  <button className="text-link" onClick={()=>onSource(`Report ${report.id}\nQuality: ${report.qualityStatus??'unknown'}\nVerified text: ${report.reviewedText??'Not verified'}\nOriginal OCR: ${report.rawOcr??'Unavailable'}`)}><T text={"Inspect report provenance →"}/></button>
 </section>;
}
