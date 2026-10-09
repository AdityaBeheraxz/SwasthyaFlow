import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {estimateTextTilt} from './image-quality';
import {PDFDocument} from 'pdf-lib';
import {uploadLimits} from './upload-limits';

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
 const maximum=uploadLimits().reportBytes;
 if(bytes.byteLength>maximum)throw new ReportFileValidationError('FILE_TOO_LARGE',`Report exceeds ${maximum/1_000_000} MB.`);
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
  const small=await sharp(bytes).rotate().resize(128,128,{fit:'fill'}).grayscale().raw().toBuffer();
  const tiltSample=await sharp(bytes).rotate().resize(400,400,{fit:'inside'}).grayscale().raw().toBuffer({resolveWithObject:true});
  const tilt=estimateTextTilt(tiltSample.data,tiltSample.info.width,tiltSample.info.height);
  if(tilt!==null)warnings.push('Text appears tilted by approximately '+Math.abs(tilt)+' degrees. Align the page and retake it if extraction is unclear.');
  const border=[...small].filter((_,index)=>index%128<3||index%128>124||index<384||index>=16000);
  const darkBorder=border.filter(value=>value<100).length/border.length;
  if(darkBorder>0.12)warnings.push('Content or a dark background reaches the image edge. Check that no report text is cropped.');
  const quadrants=[0,1,2,3].map(quadrant=>{let sum=0,count=0;for(let y=quadrant<2?0:64;y<(quadrant<2?64:128);y++)for(let x=quadrant%2?64:0;x<(quadrant%2?128:64);x++){sum+=small[y*128+x];count++;}return sum/count;});
  if(Math.max(...quadrants)-Math.min(...quadrants)>55)warnings.push('Lighting varies across the page. Check dark areas and glare before verifying extraction.');
  if(stats.channels.some(channel=>channel.mean<70))warnings.push('The page is dark. Retake it with more even lighting if text is unclear.');
  return {mimeType,extension:type==='image/png'?'png':'jpg',byteLength:bytes.byteLength,sha256,pageCount:1,width,height,qualityStatus:warnings.length?'QUALITY_WARNING':'READY',warnings};
 }catch(error){
  if(error instanceof ReportFileValidationError)throw error;
  throw new ReportFileValidationError('IMAGE_INVALID','The image is damaged or cannot be decoded safely.');
 }
}

export async function preprocessReportImage(bytes:Uint8Array){
 const processed=await sharp(bytes,{failOn:'warning',limitInputPixels:25_000_000})
  .rotate()
  .resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true})
  .grayscale()
  .normalize()
  .median(3)
  .sharpen({sigma:1})
  .png({compressionLevel:6})
  .toBuffer();
 if(process.env.OCR_ADAPTIVE_THRESHOLD!=='true')return new Uint8Array(processed);
 const {data,info}=await sharp(processed).grayscale().raw().toBuffer({resolveWithObject:true});
 const local=await sharp(processed).grayscale().blur(8).raw().toBuffer();
 for(let i=0;i<data.length;i++)data[i]=data[i]<local[i]-12?0:255;
 return new Uint8Array(await sharp(data,{raw:{width:info.width,height:info.height,channels:1}}).png().toBuffer());
}
