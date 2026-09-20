import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { encounters,patients,inputs,auditLogs } from '@/db/schema';
import { session,allowed } from '@/lib/auth';
import { failure,success,parseFailure } from '@/lib/api';
const schema=z.object({patientId:z.string().min(1),text:z.string().trim().min(1),language:z.enum(['en','hi','or']),inputType:z.enum(['text','voice']),audioId:z.string().uuid().optional(),speechSegments:z.array(z.object({text:z.string(),confidence:z.number().min(0).max(1),start:z.number().optional(),end:z.number().optional()})).optional()}).strict();
export async function POST(req:Request){
 const actor=await session();if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);
 try{const body=schema.parse(await req.json());const conn=await db();const [patient]=await conn.select().from(patients).where(eq(patients.id,body.patientId)).limit(1);if(!patient?.consentStatus)return failure('CONSENT_REQUIRED','Consent must be recorded first.',422);
 const id=crypto.randomUUID();await conn.transaction(async tx=>{await tx.insert(encounters).values({id,patientId:body.patientId,chiefComplaint:body.text,state:'INPUT_CAPTURED',status:'INPUT_CAPTURED',facilityId:'F-001'});await tx.insert(inputs).values({id:crypto.randomUUID(),encounterId:id,type:body.inputType,originalText:body.text,transcript:body.text,language:body.language,source:{kind:body.inputType,...(body.audioId?{audioId:body.audioId,speechSegments:body.speechSegments??[]}:{})}});await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:id,action:'ENCOUNTER_CREATED',metadata:{input_type:body.inputType}});});return success({id},201);
 }catch(e){return parseFailure(e);}
}
