import {webmMimeType} from '@/lib/audio-format';
import {measured} from '@/lib/metrics';
import {session,allowed} from '@/lib/auth';
import {failure,success} from '@/lib/api';
import {consumeRateLimit} from '@/lib/rate-limit';
import {speechAdapter} from '@/lib/speech';
import {patientForActor} from '@/lib/access';
import {objectStorage} from '@/lib/storage';
import {matchesDeclaredType} from '@/lib/file-validation';
import {uploadLimits} from '@/lib/upload-limits';
export async function POST(req:Request){
 const actor=await session();
 if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);
 const rate=await consumeRateLimit(`${actor!.id}:transcribe`,20,60);if(!rate.ok)return failure('RATE_LIMITED','Too many processing requests. Retry shortly.',429);
 let audioKey:string|undefined;
 try{
  const form=await req.formData(),patientId=form.get('patientId'),audio=form.get('audio'),lang=form.get('langHint');
  if(typeof patientId!=='string'||!(audio instanceof File)||!['en','hi','or'].includes(String(lang)))return failure('VALIDATION_FAILED','Patient, audio, and language are required.',422);
  const patient=await patientForActor(patientId,actor!);if(!patient?.consentStatus)return failure('CONSENT_REQUIRED','Consent must be recorded before transcription.',422);
  const mimeType=webmMimeType(audio.type);
  if(!mimeType)return failure('FILE_TYPE_UNSUPPORTED','Record audio in WebM format.',422);
  if(audio.size>uploadLimits().audioBytes)return failure('FILE_TOO_LARGE','Recording exceeds the upload limit for this site.',422);
  const bytes=new Uint8Array(await audio.arrayBuffer());if(!matchesDeclaredType(bytes,mimeType))return failure('FILE_SIGNATURE_INVALID','Audio contents do not match WebM.',422);
  const audioId=crypto.randomUUID();audioKey=`audio/${audioId}.webm`;await objectStorage().put(audioKey,bytes,mimeType);
  const transcript=await measured(actor!.facilityId!,'asr',()=>speechAdapter().transcribe(new Blob([bytes],{type:mimeType}),lang as 'en'|'hi'|'or'));
  return success({...transcript,audioId});
 }catch(error){if(audioKey)await objectStorage().delete(audioKey).catch(()=>undefined);
  const code=error instanceof Error?error.message:'ASR_FAILED';
  const messages:Record<string,string>={ASR_NOT_CONFIGURED:'Configure the local speech model or connect a speech endpoint. No substitute transcript was generated.',ASR_LANGUAGE_UNSUPPORTED:'The installed local model supports English and Hindi, not Odia. Enter a verified Odia transcript manually.',ASR_NO_SPEECH:'No clear speech was detected. Record again or enter the original words manually.',ASR_AUDIO_TOO_LONG:'Record a clip of no more than two minutes.',ASR_BUSY:'Another local recording is being transcribed. Retry when it finishes.'};
  return messages[code]?failure(code,messages[code],code==='ASR_NOT_CONFIGURED'||code==='ASR_BUSY'?503:422):failure('ASR_FAILED','Transcription failed. Retry or enter the original words manually.',503);
 }
}
