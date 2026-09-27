import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';

export const reportMimeTypes=['image/png','image/jpeg','application/pdf'] as const;
export type ReportMimeType=typeof reportMimeTypes[number];

export type ReportFileInspection={
 mimeType:ReportMimeType;
 extension:'png'|'jpg'|'pdf';
 byteLength:number;
 sha256:string;
 pageCount:number;
 width?:number;
 height?:number;
 qualityStatus:'READY'|'QUALITY_WARNING';
 warnings:string[];
};

export class ReportFileValidationError extends Error{
 constructor(public code:string,message:string){super(message);this.name='ReportFileValidationError';}
}

export function matchesDeclaredType(bytes:Uint8Array,type:string){
 if(type==='image/png')return bytes.length>8&&[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);
 if(type==='image/jpeg')return bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[bytes.length-2]===0xff&&bytes[bytes.length-1]===0xd9;
 if(type==='application/pdf')return bytes.length>8&&new TextDecoder().decode(bytes.slice(0,5))==='%PDF-'&&new TextDecoder().decode(bytes.slice(-1024)).includes('%%EOF');
 if(type==='audio/webm'||type==='video/webm')return bytes.length>4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;
 return false;
}

export async function inspectReportFile(bytes:Uint8Array,type:string):Promise<ReportFileInspection>{
 if(!reportMimeTypes.includes(type as ReportMimeType))throw new ReportFileValidationError('FILE_TYPE_UNSUPPORTED','Upload a PNG, JPEG, or PDF report.');
 const mimeType=type as ReportMimeType;
 if(bytes.byteLength<1024)throw new ReportFileValidationError('FILE_TOO_SMALL','The report file is empty or too small to contain a readable document.');
 if(bytes.byteLength>8_000_000)throw new ReportFileValidationError('FILE_TOO_LARGE','Report exceeds 8 MB.');
 if(!matchesDeclaredType(bytes,type))throw new ReportFileValidationError('FILE_SIGNATURE_INVALID','File contents do not match the declared type.');
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(type==='application/pdf'){
  try{
   const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false});
   const pageCount=pdf.getPageCount();
   if(pageCount<1)throw new ReportFileValidationError('PDF_EMPTY','The PDF has no pages.');
   if(pageCount>10)throw new ReportFileValidationError('PDF_TOO_MANY_PAGES','Upload a report with no more than 10 pages.');
   return {mimeType,extension:'pdf',byteLength:bytes.byteLength,sha256,pageCount,qualityStatus:'READY',warnings:[]};
  }catch(error){
   if(error instanceof ReportFileValidationError)throw error;
   throw new ReportFileValidationError('PDF_INVALID','The PDF is damaged, encrypted, or cannot be read safely.');
  }
 }
 try{
  const image=sharp(bytes,{failOn:'warning',limitInputPixels:25_000_000});
  const [metadata,stats]=await Promise.all([image.metadata(),image.stats()]);
  const expected=type==='image/png'?'png':'jpeg';
  if(metadata.format!==expected)throw new ReportFileValidationError('FILE_SIGNATURE_INVALID','The decoded image format does not match the declared type.');
  const width=metadata.width??0,height=metadata.height??0;
  if(width<320||height<240)throw new ReportFileValidationError('IMAGE_TOO_SMALL','The report image must be at least 320 × 240 pixels.');
  const warnings:string[]=[];
  if(width<900||height<700)warnings.push('Image resolution is low; capture the full report closer to the camera.');
  if(stats.entropy<2.5)warnings.push('Image contrast is low; use even lighting and avoid glare.');
  if(stats.sharpness<1)warnings.push('Image may be blurred; hold the camera steady and retake it if text is unclear.');
  return {mimeType,extension:type==='image/png'?'png':'jpg',byteLength:bytes.byteLength,sha256,pageCount:1,width,height,qualityStatus:warnings.length?'QUALITY_WARNING':'READY',warnings};
 }catch(error){
  if(error instanceof ReportFileValidationError)throw error;
  throw new ReportFileValidationError('IMAGE_INVALID','The image is damaged or cannot be decoded safely.');
 }
}

export async function preprocessReportImage(bytes:Uint8Array){
 return new Uint8Array(await sharp(bytes,{failOn:'warning',limitInputPixels:25_000_000})
  .rotate()
  .resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true})
  .grayscale()
  .normalize()
  .sharpen({sigma:1})
  .png({compressionLevel:6})
  .toBuffer());
}
