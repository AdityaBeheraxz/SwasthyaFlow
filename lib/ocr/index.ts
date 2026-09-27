import {z} from 'zod';
import {join} from 'node:path';
import {createWorker,OEM} from 'tesseract.js';
import {preprocessReportImage,type ReportMimeType} from '@/lib/file-validation';

export type OcrToken={text:string;confidence:number;bbox:[number,number,number,number];page:number};
export type OcrResult={
 rawText:string;
 tokens:OcrToken[];
 quality:'GOOD'|'LOW_CONFIDENCE';
 meanConfidence:number;
 engine:string;
 warnings:string[];
};
export interface OcrAdapter{extract(document:Uint8Array,mimeType:ReportMimeType):Promise<OcrResult>}

export class OcrError extends Error{
 constructor(public code:'OCR_NOT_CONFIGURED'|'OCR_FORMAT_UNSUPPORTED'|'OCR_PROVIDER_FAILED'|'OCR_EMPTY_RESULT',message:string){super(message);this.name='OcrError';}
}

function summarize(rawText:string,tokens:OcrToken[],engine:string,warnings:string[]=[]):OcrResult{
 const clean=rawText.replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 if(clean.length<3)throw new OcrError('OCR_EMPTY_RESULT','No readable text was found. Retake the image or enter the report text manually.');
 const meanConfidence=tokens.length?tokens.reduce((total,token)=>total+token.confidence,0)/tokens.length:0;
 const low=tokens.filter(token=>token.confidence<0.8).length;
 if(meanConfidence<0.8||low>0)warnings.push('Some text has low OCR confidence and must be checked against the original report.');
 return {rawText:clean,tokens,meanConfidence:Number(meanConfidence.toFixed(3)),quality:meanConfidence>=0.8&&low===0?'GOOD':'LOW_CONFIDENCE',engine,warnings:[...new Set(warnings)]};
}

const enterpriseResponse=z.object({
 rawText:z.string().min(1),
 tokens:z.array(z.object({text:z.string().min(1),confidence:z.number().min(0).max(1),bbox:z.tuple([z.number(),z.number(),z.number(),z.number()]),page:z.number().int().positive().default(1)})),
 warnings:z.array(z.string()).optional()
}).strict();

export const enterpriseOcr:OcrAdapter={async extract(document,mimeType){
 const url=process.env.OCR_API_URL,key=process.env.OCR_API_KEY;
 if(!url||!key)throw new OcrError('OCR_NOT_CONFIGURED','The approved OCR provider is not configured.');
 const form=new FormData();
 const extension=mimeType==='application/pdf'?'pdf':mimeType==='image/png'?'png':'jpg';
 const payload=document.buffer.slice(document.byteOffset,document.byteOffset+document.byteLength) as ArrayBuffer;
 form.set('document',new File([payload],`report.${extension}`,{type:mimeType}));
 form.set('languages',process.env.OCR_LANGUAGES??'eng+hin+ori');
 form.set('include_tokens','true');
 let response:Response;
 try{response=await fetch(url,{method:'POST',headers:{authorization:`Bearer ${key}`},body:form,signal:AbortSignal.timeout(45_000),cache:'no-store'});}catch{throw new OcrError('OCR_PROVIDER_FAILED','The OCR provider could not be reached. Retry or continue with manual transcription.');}
 if(!response.ok)throw new OcrError('OCR_PROVIDER_FAILED','The OCR provider rejected the document. Retry or continue with manual transcription.');
 const parsed=enterpriseResponse.safeParse(await response.json());
 if(!parsed.success)throw new OcrError('OCR_PROVIDER_FAILED','The OCR provider returned an invalid response.');
 return summarize(parsed.data.rawText,parsed.data.tokens,'enterprise-ocr',parsed.data.warnings??[]);
}};

function wordsFromBlocks(blocks:Awaited<ReturnType<Awaited<ReturnType<typeof createWorker>>['recognize']>>['data']['blocks']):OcrToken[]{
 if(!blocks)return [];
 return blocks.flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines.flatMap(line=>line.words.map(word=>({text:word.text,confidence:Math.max(0,Math.min(1,word.confidence/100)),bbox:[word.bbox.x0,word.bbox.y0,word.bbox.x1,word.bbox.y1] as [number,number,number,number],page:1})))));
}

export const tesseractOcr:OcrAdapter={async extract(document,mimeType){
 if(mimeType==='application/pdf')throw new OcrError('OCR_FORMAT_UNSUPPORTED','PDF OCR requires the configured enterprise OCR provider. Upload a PNG or JPEG, or enter report text manually.');
 const image=await preprocessReportImage(document);
 const languages=(process.env.OCR_LANGUAGES??'eng').split('+').filter(Boolean);
 let worker:Awaited<ReturnType<typeof createWorker>>|undefined;
 try{
  worker=await createWorker(languages,OEM.LSTM_ONLY,{
   logger:()=>undefined,
   cachePath:join(process.cwd(),'.data','ocr-cache'),
   // Next.js otherwise rewrites Tesseract's relative worker path into `.next`,
   // where the Node worker script does not exist.
   workerPath:join(process.cwd(),'node_modules','tesseract.js','src','worker-script','node','index.js'),
  });
  const result=await worker.recognize(Buffer.from(image),{rotateAuto:true},{text:true,blocks:true});
  return summarize(result.data.text,wordsFromBlocks(result.data.blocks),'tesseract.js');
 }catch(error){
  if(error instanceof OcrError)throw error;
  throw new OcrError('OCR_PROVIDER_FAILED','OCR could not read this image. Check connectivity for the language model, retake the image, or enter report text manually.');
 }finally{await worker?.terminate().catch(()=>undefined);}
}};

const unavailableOcr:OcrAdapter={async extract(){throw new OcrError('OCR_NOT_CONFIGURED','OCR is not configured. Set OCR_MODE to tesseract or enterprise; no synthetic fallback is used.');}};

export function ocrAdapter():OcrAdapter{
 if(process.env.OCR_MODE==='enterprise')return enterpriseOcr;
 if(process.env.OCR_MODE==='tesseract'||(!process.env.OCR_MODE&&process.env.DEPLOYMENT_MODE!=='production'))return tesseractOcr;
 return unavailableOcr;
}
