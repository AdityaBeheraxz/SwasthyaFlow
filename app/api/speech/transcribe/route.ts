import {session,allowed} from '@/lib/auth';
import {failure,success} from '@/lib/api';
import {consumeRateLimit} from '@/lib/rate-limit';
import {speechAdapter} from '@/lib/speech';
import {patientForActor} from '@/lib/access';
import {objectStorage} from '@/lib/storage';
import {matchesDeclaredType} from '@/lib/file-validation';
export async function POST(req:Request){
 const actor=await session();
 if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);
 const rate=await consumeRateLimit(`${actor!.id}:transcribe`,20,60);if(!rate.ok)return failure('RATE_LIMITED','Too many processing requests. Retry shortly.',429);
 let audioKey:string|undefined;
 try{
  const form=await req.formData(),patientId=form.get('patientId'),audio=form.get('audio'),lang=form.get('langHint');
  if(typeof patientId!=='string'||!(audio instanceof File)||!['en','hi','or'].includes(String(lang)))return failure('VALIDATION_FAILED','Patient, audio, and language are required.',422);
  const patient=await patientForActor(patientId,actor!);if(!patient?.consentStatus)return failure('CONSENT_REQUIRED','Consent must be recorded before transcription.',422);
  if(!['audio/webm','video/webm'].includes(audio.type))return failure('FILE_TYPE_UNSUPPORTED','Record audio in WebM format.',422);
  if(audio.size>10_000_000)return failure('FILE_TOO_LARGE','Audio exceeds 10 MB.',422);
  const bytes=new Uint8Array(await audio.arrayBuffer());if(!matchesDeclaredType(bytes,audio.type))return failure('FILE_SIGNATURE_INVALID','Audio contents do not match WebM.',422);
  const audioId=crypto.randomUUID();audioKey=`audio/${audioId}.webm`;await objectStorage().put(audioKey,bytes,audio.type||'audio/webm');
  const transcript=await speechAdapter().transcribe(new Blob([bytes],{type:audio.type}),lang as 'en'|'hi'|'or');
  return success({...transcript,audioId});
 }catch{if(audioKey)await objectStorage().delete(audioKey).catch(()=>undefined);return failure('ASR_FAILED','Transcription failed. Retry or enter the original words manually.',503);}
}
