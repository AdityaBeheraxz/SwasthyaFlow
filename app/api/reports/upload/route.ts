import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {encounters,reports,auditLogs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
const types:Record<string,string>={'image/png':'png','image/jpeg':'jpg','application/pdf':'pdf'};
export async function POST(req:Request){const actor=await session();if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);try{const form=await req.formData();const encounterId=form.get('encounterId');const file=form.get('file');if(typeof encounterId!=='string'||!(file instanceof File))return failure('VALIDATION_FAILED','Encounter and file are required.',422);const ext=types[file.type];if(!ext)return failure('FILE_TYPE_UNSUPPORTED','Upload a PNG, JPEG, or PDF.',422);if(file.size>8_000_000)return failure('FILE_TOO_LARGE','Report exceeds 8 MB.',422);const conn=await db();const [encounter]=await conn.select().from(encounters).where(eq(encounters.id,encounterId)).limit(1);if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);const id=crypto.randomUUID(),fileUrl=`${id}.${ext}`;await mkdir('.data/reports',{recursive:true});await writeFile(join('.data/reports',fileUrl),new Uint8Array(await file.arrayBuffer()));await conn.transaction(async tx=>{await tx.insert(reports).values({id,encounterId,fileUrl,qualityStatus:'PENDING_OCR'});await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId,action:'REPORT_UPLOADED',metadata:{report_id:id,file_type:file.type}});});return success({reportId:id},201);}catch(e){return parseFailure(e);}}
