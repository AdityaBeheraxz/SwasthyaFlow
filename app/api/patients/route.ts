import { z } from 'zod';
import { db } from '@/lib/db/server';
import { patients, auditLogs } from '@/db/schema';
import { session, allowed } from '@/lib/auth';
import { failure, success, parseFailure } from '@/lib/api';
const schema=z.object({age:z.number().int().min(0).max(120),language:z.enum(['en','hi','or']),consent:z.literal(true)}).strict();
export async function POST(req:Request){
 const actor=await session(); if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);
 try{const body=schema.parse(await req.json());const conn=await db();
 const count=await conn.select({id:patients.anonymousPatientId}).from(patients);
 const next=1001+Math.max(12,count.length); const id=crypto.randomUUID(); const anonymousPatientId=`P-${next}`;
 await conn.transaction(async tx=>{await tx.insert(patients).values({id,anonymousPatientId,age:body.age,preferredLanguage:body.language,consentStatus:true});await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,action:'CONSENT_RECORDED',metadata:{consent:true}});});
 return success({id,anonymousPatientId},201);
 }catch(e){return parseFailure(e);}
}
