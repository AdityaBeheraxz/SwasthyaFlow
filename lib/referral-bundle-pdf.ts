import 'server-only';
import {PDFDocument,PDFName,StandardFonts} from 'pdf-lib';
import {createHash} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {db} from './db/server';
import {reports,type ReferralAttachment} from '@/db/schema';
import {objectStorage,reportStorageKey} from './storage';
export async function appendReferralDocuments(cover:Uint8Array,attachments:ReferralAttachment[]){
 if(attachments.length>20)throw new Error('BUNDLE_LIMIT');
 const pdf=await PDFDocument.load(cover),font=await pdf.embedFont(StandardFonts.Helvetica);let total=cover.length;
 for(let i=0;i<attachments.length;i++){
  const a=attachments[i],[doc]=await (await db()).select().from(reports).where(eq(reports.id,a.id)).limit(1);
  if(!doc?.fileUrl||doc.fileSha256!==a.sha256)throw new Error('DOCUMENT_UNAVAILABLE');
  const object=await objectStorage().get(reportStorageKey(doc.fileUrl));total+=object.bytes.length;
  if(total>30*1024*1024||createHash('sha256').update(object.bytes).digest('hex')!==a.sha256)throw new Error('DOCUMENT_INTEGRITY_OR_SIZE');
  const separator=pdf.addPage([595,842]);separator.drawText(`Original ${a.documentType==='prescription'?'prescription':'report'} ${i+1}`,{x:40,y:780,size:20,font});separator.drawText('Source document provided by the patient; not SwasthyaFlow treatment advice.',{x:40,y:750,size:10,font});separator.drawText(`Document ID: ${a.id}`,{x:40,y:725,size:10,font});separator.drawText('Verify original contents. OCR may contain errors.',{x:40,y:700,size:10,font});
  if(object.contentType==='application/pdf'){
   const original=await PDFDocument.load(object.bytes);if(original.getPageCount()+pdf.getPageCount()>80)throw new Error('BUNDLE_LIMIT');
   const pages=await pdf.copyPages(original,original.getPageIndices());for(const page of pages){page.node.delete(PDFName.of('Annots'));page.node.delete(PDFName.of('AA'));pdf.addPage(page);}
  }else if(['image/png','image/jpeg'].includes(object.contentType)){
   const image=object.contentType==='image/png'?await pdf.embedPng(object.bytes):await pdf.embedJpg(object.bytes),page=pdf.addPage([595,842]),scale=Math.min(515/image.width,762/image.height);page.drawImage(image,{x:40,y:40,width:image.width*scale,height:image.height*scale});
  }else throw new Error('DOCUMENT_UNSUPPORTED');
 }
 return pdf.save();
}
