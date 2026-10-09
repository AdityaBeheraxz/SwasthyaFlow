import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm,mkdir,access} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
import type {SpeechAdapter} from './index';
const execute=promisify(execFile);
const responseSchema=z.object({text:z.string().trim().min(1),language:z.string(),segments:z.array(z.object({text:z.string(),start:z.number().nonnegative(),end:z.number().nonnegative(),confidence:z.number().min(0).max(1)}))});
let running=false;
export async function localSpeechReady(){
 if(!process.env.LOCAL_ASR_PYTHON||!process.env.LOCAL_ASR_MODEL_PATH)return false;
 try{await Promise.all([access(process.env.LOCAL_ASR_PYTHON),...['model.bin','config.json','tokenizer.json','vocabulary.txt'].map(file=>access(join(process.env.LOCAL_ASR_MODEL_PATH!,file)))]);return true;}catch{return false;}
}
export const localSpeech:SpeechAdapter={async transcribe(audio,language){
 if(language==='or')throw new Error('ASR_LANGUAGE_UNSUPPORTED');
 if(!await localSpeechReady())throw new Error('ASR_NOT_CONFIGURED');
 if(running)throw new Error('ASR_BUSY');
 running=true;let directory:string|undefined;
 try{
  const root=join(process.cwd(),'.data','asr-tmp');await mkdir(root,{recursive:true});directory=await mkdtemp(join(root,'recording-'));
  const file=join(directory,'speech.webm');await writeFile(file,new Uint8Array(await audio.arrayBuffer()));
  let stdout:string;
  try{({stdout}=await execute(process.env.LOCAL_ASR_PYTHON!,[join(process.cwd(),'scripts','local-asr.py'),file,language],{timeout:120000,maxBuffer:1024*1024,windowsHide:true,env:{...process.env,HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',PYTHONIOENCODING:'utf-8'}}));}
  catch(error){const output=(error as {stdout?:string}).stdout;let code='ASR_FAILED';try{const parsed=JSON.parse(output??'{}');if(['ASR_LANGUAGE_UNSUPPORTED','ASR_NO_SPEECH','ASR_AUDIO_TOO_LONG','ASR_NOT_CONFIGURED'].includes(parsed.error))code=parsed.error;}catch{}throw new Error(code);}
  const parsed=responseSchema.safeParse(JSON.parse(stdout));if(!parsed.success)throw new Error('ASR_FAILED');return parsed.data;
 }finally{running=false;if(directory)await rm(directory,{recursive:true,force:true});}
}};
