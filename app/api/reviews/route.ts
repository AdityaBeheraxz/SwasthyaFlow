import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { encounters, triageNotes, reviews, auditLogs } from '@/db/schema';
import { session, allowed } from '@/lib/auth';
import { failure, success, parseFailure } from '@/lib/api';
import { assertNonDiagnostic } from '@/lib/safety/resolve';
import { transition, type EncounterState } from '@/lib/state';

const schema=z.object({
 encounterId:z.string().min(1),
 decision:z.enum(['EDIT','REQUEST_INFO','APPROVE','ESCALATE']),
 summary:z.string().trim().min(1).optional(),
 notes:z.string().optional()
}).strict();

export async function POST(req:Request){
 const actor=await session();
 if(!allowed(actor?.role??null,['nurse','medical_officer']))return failure('FORBIDDEN','Reviewer role required.',403);
 try{
  const body=schema.parse(await req.json());
  if(body.decision==='APPROVE'&&actor?.role!=='medical_officer')return failure('FORBIDDEN','Medical Officer role required to approve.',403);
  if(body.summary)assertNonDiagnostic(body.summary);
  const conn=await db();
  const [encounter]=await conn.select().from(encounters).where(eq(encounters.id,body.encounterId)).limit(1);
  if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);
  const [note]=await conn.select().from(triageNotes).where(eq(triageNotes.encounterId,body.encounterId)).limit(1);
  if(!note&&body.decision!=='REQUEST_INFO')return failure('TRIAGE_FAILED','No usable triage note. Request information or retry.',422);
  const next=body.decision==='EDIT'?'IN_REVIEW':body.decision==='REQUEST_INFO'?'INFO_REQUESTED':body.decision==='APPROVE'?'APPROVED':'ESCALATED';
  const initialReview=['TRIAGED','ASR_FAILED','OCR_FAILED','AI_FAILED','AI_PARSE_FAILED','TRIAGE_FAILED','SAFETY_ENGINE_FAILED','SAVE_FAILED'].includes(encounter.state);
  const current=initialReview?'IN_REVIEW':encounter.state;
  try{
   if(initialReview)transition(encounter.state as EncounterState,'IN_REVIEW',true,false);
   if(next!==current)transition(current as EncounterState,next as EncounterState,true,false);
  }catch{return failure('ILLEGAL_TRANSITION','This review action is not available in the current state.',422);}
  await conn.transaction(async tx=>{
   if(initialReview)await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:body.encounterId,action:'STATE_IN_REVIEW',metadata:{from:encounter.state}});
   if(body.summary&&note)await tx.update(triageNotes).set({summary:body.summary,fieldSources:{...note.fieldSources,summary:`reviewer:${actor!.id}`}}).where(eq(triageNotes.id,note.id));
   await tx.insert(reviews).values({id:crypto.randomUUID(),encounterId:body.encounterId,reviewerId:actor!.id,changes:body.summary&&note?{summary:{before:note.summary,after:body.summary}}:{},decision:body.decision,notes:body.notes??null});
   await tx.update(encounters).set({state:next,status:next}).where(eq(encounters.id,body.encounterId));
   await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:body.encounterId,action:body.decision==='EDIT'?'TRIAGE_EDITED':`REVIEW_${body.decision}`,metadata:{summary_changed:Boolean(body.summary)}});
  });
  return success({state:next});
 }catch(e){
  if(e instanceof Error&&e.message==='AI_PARSE_FAILED')return failure('NON_DIAGNOSTIC_GUARD','Review text contains disallowed diagnosis or treatment language.',422);
  return parseFailure(e);
 }
}
