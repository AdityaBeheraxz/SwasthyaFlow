import {db} from '@/lib/db/server';
import {reports,auditLogs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
import {encounterForActor} from '@/lib/access';
import {objectStorage} from '@/lib/storage';
import {matchesDeclaredType} from '@/lib/file-validation';
const types:Record<string,string>={'image/png':'png','image/jpeg':'jpg','application/pdf':'pdf'};
export async function POST(req:Request){
 const actor=await session();
 if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);
 let storedKey:string|undefined;
 try{
  const form=await req.formData(),encounterId=form.get('encounterId'),file=form.get('file');
  if(typeof encounterId!=='string'||!(file instanceof File))return failure('VALIDATION_FAILED','Encounter and file are required.',422);
  const ext=types[file.type];if(!ext)return failure('FILE_TYPE_UNSUPPORTED','Upload a PNG, JPEG, or PDF.',422);
  if(file.size>8_000_000)return failure('FILE_TOO_LARGE','Report exceeds 8 MB.',422);
  const conn=await db(),encounter=await encounterForActor(encounterId,actor!);
  if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);
  const bytes=new Uint8Array(await file.arrayBuffer());if(!matchesDeclaredType(bytes,file.type))return failure('FILE_SIGNATURE_INVALID','File contents do not match the declared type.',422);
  const id=crypto.randomUUID();storedKey=`reports/${id}.${ext}`;
  await objectStorage().put(storedKey,bytes,file.type);
  await conn.transaction(async tx=>{await tx.insert(reports).values({id,encounterId,fileUrl:storedKey,qualityStatus:'PENDING_OCR'});await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId,action:'REPORT_UPLOADED',metadata:{report_id:id,file_type:file.type}});});
  return success({reportId:id},201);
 }catch(e){if(storedKey)await objectStorage().delete(storedKey).catch(()=>undefined);return parseFailure(e);}
}
