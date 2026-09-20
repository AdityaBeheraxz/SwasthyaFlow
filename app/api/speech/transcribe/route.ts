import {eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {patients} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success} from '@/lib/api';
import {speechAdapter} from '@/lib/speech';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function POST(req:Request){const actor=await session();if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);try{const form=await req.formData();const patientId=form.get('patientId');const audio=form.get('audio');const lang=form.get('langHint');if(typeof patientId!=='string'||!(audio instanceof File)||!['en','hi','or'].includes(String(lang)))return failure('VALIDATION_FAILED','Patient, audio, and language are required.',422);const [patient]=await (await db()).select().from(patients).where(eq(patients.id,patientId)).limit(1);if(!patient?.consentStatus)return failure('CONSENT_REQUIRED','Consent must be recorded before transcription.',422);if(audio.size>10_000_000)return failure('FILE_TOO_LARGE','Audio exceeds 10 MB.',422);const bytes=new Uint8Array(await audio.arrayBuffer());const audioId=crypto.randomUUID();await mkdir('.data/audio',{recursive:true});await writeFile(join('.data/audio',`${audioId}.webm`),bytes);const transcript=await speechAdapter().transcribe(new Blob([bytes],{type:audio.type}),lang as 'en'|'hi'|'or');return success({...transcript,audioId});}catch{return failure('ASR_FAILED','Transcription failed. Retry or enter the original words manually.',503);}}
