import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { encounters, auditLogs } from '@/db/schema';
import {clinicalReviewerSession as session} from '@/lib/reviewer-auth';
import { failure, success, parseFailure } from '@/lib/api';
import { authorizeOverride,makeOverrideAudit } from '@/lib/safety/override';
import { assertNonDiagnostic,type Priority } from '@/lib/safety/resolve';
import { z } from 'zod';
import {encounterForActor} from '@/lib/access';
const bodySchema=z.object({encounterId:z.string().min(1),newPriority:z.enum(['RED','YELLOW','GREEN']),reason:z.string().max(2000)});
export async function POST(req:Request){
 const actor=await session(); if(!actor)return failure('UNAUTHORIZED','Sign in with an authorized staff account.',401);
 try{
  const body=bodySchema.parse(await req.json());assertNonDiagnostic(body.reason);const conn=await db();
  const current=await encounterForActor(body.encounterId,actor!);
  if(!current)return failure('NOT_FOUND','Encounter not found.',404);
  if(current.state==='PROCESSING')return failure('ILLEGAL_TRANSITION','Wait for processing to finish before overriding priority.',422);if(current.state==='COMPLETED')return failure('ILLEGAL_TRANSITION','Completed encounters cannot be changed.',422);
  if(!['RED','YELLOW','GREEN'].includes(current.priorityFinal??''))return failure('PRIORITY_UNAVAILABLE','Only a valid priority can be overridden.',422);
  const check=authorizeOverride(actor.role,current.priorityFinal as Priority,body.newPriority,body.reason);
  if(!check.ok)return failure(check.code,check.code==='OVERRIDE_REASON_REQUIRED'?'A reason of at least 10 characters is required.':check.code==='NO_PRIORITY_CHANGE'?'The selected priority is already current. Select a different priority.':'Medical Officer authorization is required to override priority.',check.status);
  const timestamp=new Date();
  await conn.transaction(async tx=>{
   await tx.update(encounters).set({priorityFinal:body.newPriority,priority:body.newPriority,prioritySource:'OVERRIDE'}).where(eq(encounters.id,body.encounterId));
   await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,encounterId:body.encounterId,timestamp,...makeOverrideAudit(current.priorityFinal as Priority,body.newPriority,actor.id,body.reason,timestamp)});
  });
  return success({priority:body.newPriority});
 }catch(e){if(e instanceof Error&&e.message==='AI_PARSE_FAILED')return failure('NON_DIAGNOSTIC_GUARD','Override reasons must not contain diagnosis or treatment suggestions.',422);return parseFailure(e);}
}


