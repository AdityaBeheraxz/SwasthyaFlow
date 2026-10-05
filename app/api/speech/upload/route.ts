import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {createHash} from 'node:crypto';
import {db} from '@/lib/db/server';
import {inputs,auditLogs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
import {encounterForActor} from '@/lib/access';
import {objectStorage} from '@/lib/storage';
import {matchesDeclaredType} from '@/lib/file-validation';
export async function POST(request:Request){
 const actor=await session();if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);
 try{
  const form=await request.formData(),id=z.string().uuid().parse(form.get('audioId')),encounterId=z.string().parse(form.get('encounterId')),file=form.get('file');
  if(!(file instanceof File)||!['audio/webm','video/webm'].includes(file.type)||file.size>10000000)return failure('FILE_TYPE_UNSUPPORTED','A WebM recording under 10 MB is required.',422);
  const encounter=await encounterForActor(encounterId,actor!);if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);
  const bytes=new Uint8Array(await file.arrayBuffer());if(!matchesDeclaredType(bytes,file.type))return failure('FILE_SIGNATURE_INVALID','The recording is not WebM.',422);
  const digest=createHash('sha256').update(bytes).digest('hex'),conn=await db();
  const [input]=await conn.select().from(inputs).where(eq(inputs.encounterId,encounterId)).limit(1);if(!input)return failure('NOT_FOUND','Input not found.',404);
  if(input.source?.audioId){if(input.source.audioId!==id||input.source.audioSha256!==digest)return failure('SYNC_CONFLICT','A different recording is already linked.',409);return success({audioId:id});}
  if(encounter.state!=='INPUT_CAPTURED')return failure('ENCOUNTER_LOCKED','Recordings can only be linked before processing.',409);
  const key='audio/'+id+'.webm';await objectStorage().put(key,bytes,file.type);
  await conn.transaction(async tx=>{await tx.update(inputs).set({type:'voice',source:{...input.source,kind:'voice',audioId:id,audioSha256:digest,transcriptVerification:'STAFF_ENTERED'}}).where(eq(inputs.id,input.id));await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId,action:'OFFLINE_AUDIO_LINKED',metadata:{audio_id:id,sha256:digest}});});
  return success({audioId:id});
 }catch(error){return parseFailure(error);}
}
