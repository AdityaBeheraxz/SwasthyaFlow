import {privateProviderFetch} from '@/lib/privacy-policy';
import {z} from 'zod';
import {providerMode} from '../provider-mode';
import {join,resolve} from 'node:path';
import {access} from 'node:fs/promises';
import {createWorker,OEM} from 'tesseract.js';
import {type ReportMimeType} from '@/lib/file-validation';
import {reportPage} from './pages';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';
import {providerFixtures,sourceHash} from '../provider-fixtures';

export type OcrToken={text:string;confidence:number;bbox:[number,number,number,number];page:number};
export type OcrResult={
 rawText:string;
 tokens:OcrToken[];
 quality:'GOOD'|'LOW_CONFIDENCE';
 meanConfidence:number;
 engine:string;
 warnings:string[];
 pages?:{page:number;width:number;height:number}[];
};
export interface OcrAdapter{extract(document:Uint8Array,mimeType:ReportMimeType):Promise<OcrResult>}
export const fixtureOcr:OcrAdapter={async extract(document){const fixture=(await providerFixtures()).ocr.find(item=>item.sha256===sourceHash(document));if(!fixture)throw new OcrError('OCR_EMPTY_RESULT','Fixture input is not registered.');return summarize(fixture.rawText,fixture.tokens,'fixture-ocr',['Registered engineering fixture; not a live OCR result.']);}};

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
 warnings:z.array(z.string()).optional(),
 pages:z.array(z.object({page:z.number().int().positive(),width:z.number().positive(),height:z.number().positive()})).optional()
}).strict();

export const enterpriseOcr:OcrAdapter={async extract(document,mimeType){
 const url=process.env.OCR_API_URL,key=process.env.OCR_API_KEY;
 if(!url||!key)throw new OcrError('OCR_NOT_CONFIGURED','The approved OCR provider is not configured.');
 const form=new FormData();
 const extension=mimeType==='application/pdf'?'pdf':mimeType==='image/png'?'png':'jpg';
 const payload=document.buffer.slice(document.byteOffset,document.byteOffset+document.byteLength) as ArrayBuffer;
 form.set('document',new File([payload],`report.${extension}`,{type:mimeType}));
 form.set('languages',process.env.OCR_LANGUAGES||'eng+hin+ori');
 form.set('include_tokens','true');
 let response:Response;
 try{response=await privateProviderFetch(url,{method:'POST',headers:{authorization:`Bearer ${key}`},body:form,signal:AbortSignal.timeout(45_000),cache:'no-store'});}catch{throw new OcrError('OCR_PROVIDER_FAILED','The OCR provider could not be reached. Retry or continue with manual transcription.');}
 if(!response.ok)throw new OcrError('OCR_PROVIDER_FAILED','The OCR provider rejected the document. Retry or continue with manual transcription.');
 const parsed=enterpriseResponse.safeParse(await response.json());
 if(!parsed.success)throw new OcrError('OCR_PROVIDER_FAILED','The OCR provider returned an invalid response.');
 return {...summarize(parsed.data.rawText,parsed.data.tokens,'enterprise-ocr',parsed.data.warnings??[]),pages:parsed.data.pages};
}};

function wordsFromBlocks(blocks:Awaited<ReturnType<Awaited<ReturnType<typeof createWorker>>['recognize']>>['data']['blocks']):OcrToken[]{
 if(!blocks)return [];
 return blocks.flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines.flatMap(line=>line.words.map(word=>({text:word.text,confidence:Math.max(0,Math.min(1,word.confidence/100)),bbox:[word.bbox.x0,word.bbox.y0,word.bbox.x1,word.bbox.y1] as [number,number,number,number],page:1})))));
}

export const tesseractOcr:OcrAdapter={async extract(document,mimeType){
 const pageCount=mimeType==='application/pdf'?(await PDFDocument.load(document)).getPageCount():1;
 if(pageCount>10)throw new OcrError('OCR_FORMAT_UNSUPPORTED','No more than ten report pages can be processed.');
 const languages=(process.env.OCR_LANGUAGES||'eng').split('+').filter(Boolean);
 const modelDirectory=resolve(process.env.OCR_MODEL_PATH||join(process.cwd(),...(process.env.VERCEL==='1'||process.env.DEPLOYMENT_MODE==='demo'?['assets','ocr']:['.data','ocr-cache'])));
 if(!languages.length||languages.some(language=>!/^[a-z_]{3,20}$/.test(language)))throw new OcrError('OCR_NOT_CONFIGURED','Configure valid Tesseract language codes.');
 try{await Promise.all(languages.map(language=>access(join(modelDirectory,language+'.traineddata'))));}catch{throw new OcrError('OCR_NOT_CONFIGURED','A local Tesseract language model is missing. Ask your administrator to install the configured traineddata files. No document was sent to an external OCR service.');}
 let worker:Awaited<ReturnType<typeof createWorker>>|undefined;
 try{
  worker=await createWorker(languages,OEM.LSTM_ONLY,{
   logger:()=>undefined,
   cachePath:modelDirectory,
   langPath:modelDirectory,
   gzip:false,
   cacheMethod:'readOnly',
   // Next.js otherwise rewrites Tesseract's relative worker path into `.next`,
   // where the Node worker script does not exist.
   workerPath:join(process.cwd(),'node_modules','tesseract.js','src','worker-script','node','index.js'),
  });
  const texts:string[]=[],tokens:OcrToken[]=[],pages:{page:number;width:number;height:number}[]=[];
  for(let page=1;page<=pageCount;page++){
   const image=await reportPage(document,mimeType,page),metadata=await sharp(image).metadata();
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    const result=await Promise.race([worker.recognize(Buffer.from(image),{rotateAuto:false},{text:true,blocks:true}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new OcrError('OCR_PROVIDER_FAILED','OCR exceeded its time limit. Retry or transcribe manually.')),30000);})]);
    texts.push(result.data.text);tokens.push(...wordsFromBlocks(result.data.blocks).map(token=>({...token,page})));pages.push({page,width:metadata.width!,height:metadata.height!});
   }finally{if(timer)clearTimeout(timer);}
  }
  return {...summarize(texts.join('\n\n'),tokens,'tesseract.js'),pages};
 }catch(error){
  if(error instanceof OcrError)throw error;
  throw new OcrError('OCR_PROVIDER_FAILED','Local Tesseract could not read this document. Upload a clear, upright scan or enter text verified against the original. Handwritten text may be unreadable.');
 }finally{await worker?.terminate().catch(()=>undefined);}
}};

const unavailableOcr:OcrAdapter={async extract(){throw new OcrError('OCR_NOT_CONFIGURED','OCR is not configured. Set OCR_MODE to tesseract or enterprise; no synthetic fallback is used.');}};

export function ocrAdapter():OcrAdapter{
 const mode=providerMode('OCR_MODE','tesseract',['fixture','tesseract','enterprise','unavailable']);
 if(mode==='fixture')return fixtureOcr;
 if(mode==='enterprise')return enterpriseOcr;
 if(mode==='tesseract')return tesseractOcr;
 return unavailableOcr;
}
