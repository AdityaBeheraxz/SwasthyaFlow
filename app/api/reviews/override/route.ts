import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { encounters, auditLogs } from '@/db/schema';
import { session } from '@/lib/auth';
import { failure, success, parseFailure } from '@/lib/api';
import { authorizeOverride,makeOverrideAudit } from '@/lib/safety/override';
import { type Priority } from '@/lib/safety/resolve';
import { z } from 'zod';
const bodySchema=z.object({encounterId:z.string().min(1),newPriority:z.enum(['RED','YELLOW','GREEN']),reason:z.string()});
export async function POST(req:Request){
 const actor=await session(); if(!actor)return failure('UNAUTHORIZED','Select a demo role.',401);
 try{
  const body=bodySchema.parse(await req.json()); const conn=await db();
  const [current]=await conn.select().from(encounters).where(eq(encounters.id,body.encounterId)).limit(1);
  if(!current)return failure('NOT_FOUND','Encounter not found.',404);
  if(current.state==='COMPLETED')return failure('ILLEGAL_TRANSITION','Completed encounters cannot be changed.',422);
  if(!['RED','YELLOW','GREEN'].includes(current.priorityFinal??''))return failure('PRIORITY_UNAVAILABLE','Only a valid priority can be overridden.',422);
  const check=authorizeOverride(actor.role,current.priorityFinal as Priority,body.newPriority,body.reason);
  if(!check.ok)return failure(check.code,check.code==='OVERRIDE_REASON_REQUIRED'?'A reason of at least 10 characters is required.':'Action is not permitted.',check.status);
  const timestamp=new Date();
  await conn.transaction(async tx=>{
   await tx.update(encounters).set({priorityFinal:body.newPriority,priority:body.newPriority,prioritySource:'OVERRIDE'}).where(eq(encounters.id,body.encounterId));
   await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,encounterId:body.encounterId,timestamp,...makeOverrideAudit(current.priorityFinal as Priority,body.newPriority,actor.id,body.reason,timestamp)});
  });
  return success({priority:body.newPriority});
 }catch(e){return parseFailure(e);}
}
