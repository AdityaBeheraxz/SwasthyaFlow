'use client';
import {useState} from 'react';
import {ReportOverlay} from './report-overlay';
import type {ReportField} from '@/lib/ocr/report-data';
type Token={text:string;confidence:number;bbox:[number,number,number,number];page?:number};
export type ReportView={
 id:string;
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

export function ReportSource({report,onSource,editable=false,onSaved}:{report:ReportView;onSource:(source:string)=>void;editable?:boolean;onSaved?:()=>Promise<void>}){
 const [reviewed,setReviewed]=useState(report.reviewedText??report.rawOcr??''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function save(){setBusy(true);try{const response=await fetch('/api/reports/ocr',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reportId:report.id,reviewedText:reviewed,confirmed:true})});const payload=await response.json();if(!payload.ok)throw new Error(payload.error.message);await onSaved?.();setMessage('Report corrections and verification saved. Re-evaluate the encounter before approval.');}catch(error){setMessage(error instanceof Error?error.message:'Save failed');}finally{setBusy(false);}}
 async function extract(){setBusy(true);try{const response=await fetch('/api/reports/ocr',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reportId:report.id})});const value=await response.json();if(!value.ok)throw new Error(value.error.message);setReviewed(value.data.rawText);await onSaved?.();setMessage('Extraction is ready to compare with the original.');}catch(error){setMessage(error instanceof Error?error.message:'Extraction failed');}finally{setBusy(false);}}
 const confidence=report.ocrConfidencePermille===null||report.ocrConfidencePermille===undefined?null:Math.round(report.ocrConfidencePermille/10);
 return <section className="panel stack">
  <div><span className={`badge ${report.qualityStatus==='HUMAN_VERIFIED'?'green':report.qualityStatus==='OCR_FAILED'?'red':'yellow'}`}>{report.qualityStatus??'PENDING'}</span>{confidence!==null&&<span className="small mono"> OCR confidence {confidence}%</span>}</div>
  {report.fileName&&<p className="small mono">{report.fileName} · {report.pageCount??1} page{report.pageCount===1?'':'s'} · {report.ocrEngine??'OCR pending'}</p>}
  {report.qualityWarnings?.map((warning,index)=><p key={index} className="notice small">{warning}</p>)}
  {report.rawOcr&&<div><h3>{report.ocrEngine==='staff_transcription'?'Original staff transcription':'Original OCR output'}</h3><pre className="source-details">{report.rawOcr}</pre></div>}
  {report.reviewedText&&<div><h3>Staff-verified report text</h3><pre className="source-details">{report.reviewedText}</pre><p className="small muted">Verified {report.reviewedAt?new Date(report.reviewedAt).toLocaleString():''}</p></div>}
  {Array.isArray(report.extractedData?.fields)&&<div className="table-wrap"><table><thead><tr><th>Field</th><th>Value</th><th>Report reference</th><th>Verification</th></tr></thead><tbody>{(report.extractedData.fields as ReportField[]).map((field,index)=><tr key={index}><td>{field.label}</td><td>{field.value} {field.unit}</td><td>{field.referenceRange??'Not supplied'}</td><td><button className="text-link" onClick={()=>onSource(field.sourceText)}>{field.state}</button></td></tr>)}</tbody></table></div>}
  {report.fileUrl&&report.ocrEngine==='tesseract.js'&&Array.isArray(report.extractedData?.pages)&&<details><summary>Inspect uncertain text on report pages</summary><ReportOverlay id={report.id} tokens={report.ocrTokens??[]} pages={report.extractedData.pages as {page:number;width:number;height:number}[]}/></details>}
  {editable&&report.fileUrl&&!report.rawOcr&&<div><button className="btn secondary" disabled={busy} onClick={extract}>{busy?'Extracting…':'Extract saved report text'}</button>{message&&<p role="status">{message}</p>}</div>}
  {editable&&(report.rawOcr||(!report.fileUrl&&report.reviewedText))&&<details><summary>Correct report extraction</summary><label className="field">Reviewed report text<textarea value={reviewed} onChange={event=>setReviewed(event.target.value)}/></label><button className="btn secondary" disabled={busy||!reviewed.trim()} onClick={save}>Save verified report correction</button>{message&&<p role="status">{message}</p>}</details>}
  {!report.rawOcr&&!report.reviewedText&&<p className="error">{report.ocrError?`OCR failed: ${report.ocrError}`:'OCR pending or unavailable'}</p>}
  {report.fileUrl&&<a className="text-link" href={`/api/reports/file/${report.id}`} target="_blank" rel="noreferrer">Open original report ↗</a>}
  {report.ocrTokens?.filter(token=>token.confidence<0.8).slice(0,20).map((token,index)=><button key={index} className="badge yellow" onClick={()=>onSource(`Report token: ${token.text}\nConfidence: ${Math.round(token.confidence*100)}%\nPage: ${token.page??1}\nBounding box: ${token.bbox.join(', ')}\nOpen the original report to verify.`)}>Possibly {token.text} · inspect source</button>)}
  <button className="text-link" onClick={()=>onSource(`Report ${report.id}\nQuality: ${report.qualityStatus??'unknown'}\nVerified text: ${report.reviewedText??'Not verified'}\nOriginal OCR: ${report.rawOcr??'Unavailable'}`)}>Inspect report provenance →</button>
 </section>;
}
