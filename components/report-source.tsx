'use client';
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

export function ReportSource({report,onSource}:{report:ReportView;onSource:(source:string)=>void}){
 const confidence=report.ocrConfidencePermille===null||report.ocrConfidencePermille===undefined?null:Math.round(report.ocrConfidencePermille/10);
 return <section className="panel stack">
  <div><span className={`badge ${report.qualityStatus==='HUMAN_VERIFIED'?'green':report.qualityStatus==='OCR_FAILED'?'red':'yellow'}`}>{report.qualityStatus??'PENDING'}</span>{confidence!==null&&<span className="small mono"> OCR confidence {confidence}%</span>}</div>
  {report.fileName&&<p className="small mono">{report.fileName} · {report.pageCount??1} page{report.pageCount===1?'':'s'} · {report.ocrEngine??'OCR pending'}</p>}
  {report.qualityWarnings?.map((warning,index)=><p key={index} className="notice small">{warning}</p>)}
  {report.rawOcr&&<div><h3>Original OCR output</h3><pre className="source-details">{report.rawOcr}</pre></div>}
  {report.reviewedText&&<div><h3>Staff-verified report text</h3><pre className="source-details">{report.reviewedText}</pre><p className="small muted">Verified {report.reviewedAt?new Date(report.reviewedAt).toLocaleString():''}</p></div>}
  {!report.rawOcr&&!report.reviewedText&&<p className="error">{report.ocrError?`OCR failed: ${report.ocrError}`:'OCR pending or unavailable'}</p>}
  {report.fileUrl&&<a className="text-link" href={`/api/reports/file/${report.id}`} target="_blank" rel="noreferrer">Open original report ↗</a>}
  {report.ocrTokens?.filter(token=>token.confidence<0.8).slice(0,20).map((token,index)=><button key={index} className="badge yellow" onClick={()=>onSource(`Report token: ${token.text}\nConfidence: ${Math.round(token.confidence*100)}%\nPage: ${token.page??1}\nBounding box: ${token.bbox.join(', ')}\nOpen the original report to verify.`)}>Possibly {token.text} · inspect source</button>)}
  <button className="text-link" onClick={()=>onSource(`Report ${report.id}\nQuality: ${report.qualityStatus??'unknown'}\nVerified text: ${report.reviewedText??'Not verified'}\nOriginal OCR: ${report.rawOcr??'Unavailable'}`)}>Inspect report provenance →</button>
 </section>;
}
