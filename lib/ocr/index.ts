import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export type OcrToken={text:string;confidence:number;bbox:[number,number,number,number]};
export type OcrResult={rawText:string;tokens:OcrToken[];quality:'GOOD'|'LOW_CONFIDENCE'};
export interface OcrAdapter{extract(image:Uint8Array):Promise<OcrResult>}
export const mockOcr:OcrAdapter={async extract(image){await new Promise(resolve=>setTimeout(resolve,700+image.byteLength%300));return {rawText:'Synthetic CBC report\nHaemoglobin: 9.2 g/dL',tokens:[{text:'Haemoglobin',confidence:0.94,bbox:[20,80,160,105]},{text:'9.2 g/dL',confidence:0.72,bbox:[165,80,240,105]}],quality:'GOOD'};}};
const exec=promisify(execFile);
export const liveOcr:OcrAdapter={async extract(image){const dir=await mkdtemp(join(tmpdir(),'swasthyaflow-'));const file=join(dir,'report.png');try{await writeFile(file,image);const {stdout}=await exec('tesseract',[file,'stdout','-l','eng+hin+ori','tsv'],{maxBuffer:2_000_000,timeout:15_000});const lines=stdout.split(/\r?\n/).slice(1);const tokens:OcrToken[]=lines.map(line=>line.split('\t')).filter(parts=>parts.length>=12&&parts[11]?.trim()).map(parts=>({text:parts[11],confidence:Math.max(0,Math.min(1,Number(parts[10])/100)),bbox:[Number(parts[6]),Number(parts[7]),Number(parts[6])+Number(parts[8]),Number(parts[7])+Number(parts[9])] as [number,number,number,number]}));const rawText=tokens.map(token=>token.text).join(' ');if(!rawText)throw new Error('OCR_FAILED');return {rawText,tokens,quality:tokens.some(token=>token.confidence<0.7)?'LOW_CONFIDENCE':'GOOD'};}catch{throw new Error('OCR_FAILED');}finally{await rm(dir,{recursive:true,force:true});}}};
export function ocrAdapter():OcrAdapter{return process.env.AI_MODE==='live'||process.env.AI_MODE==='enterprise'?liveOcr:mockOcr;}
