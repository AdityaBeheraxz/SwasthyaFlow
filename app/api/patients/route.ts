import { z } from 'zod';
import {eq,sql} from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { patients, patientIdCounters, auditLogs } from '@/db/schema';
import { session, allowed } from '@/lib/auth';
import { failure, success, parseFailure } from '@/lib/api';
const schema=z.object({age:z.number().int().min(0).max(120),language:z.enum(['en','hi','or']),consent:z.literal(true)}).strict();
export async function POST(req:Request){
 const actor=await session(); if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Health Worker, Nurse, or Medical Officer role required for intake.',403);
 if(!actor?.facilityId)return failure('FACILITY_REQUIRED','Your account is not assigned to a facility.',403);
 try{const body=schema.parse(await req.json());const conn=await db();
 const id=crypto.randomUUID();let anonymousPatientId='';
 await conn.transaction(async tx=>{await tx.insert(patientIdCounters).values({id:'global',nextValue:1001}).onConflictDoNothing();const [counter]=await tx.update(patientIdCounters).set({nextValue:sql`${patientIdCounters.nextValue}+1`}).where(eq(patientIdCounters.id,'global')).returning({value:patientIdCounters.nextValue});if(!counter)throw new Error('PATIENT_ID_FAILED');anonymousPatientId=`P-${String(counter.value-1).padStart(4,'0')}`;await tx.insert(patients).values({id,anonymousPatientId,age:body.age,preferredLanguage:body.language,consentStatus:true,facilityId:actor.facilityId!});await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,action:'CONSENT_RECORDED',metadata:{consent:true,facility_id:actor.facilityId}});});
 return success({id,anonymousPatientId},201);
 }catch(e){return parseFailure(e);}
}
