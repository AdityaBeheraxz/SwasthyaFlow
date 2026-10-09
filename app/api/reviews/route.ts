import { z } from 'zod';
import { and,desc,eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { encounters, triageNotes, reviews, auditLogs,inputs,reports,rulesConfig } from '@/db/schema';
import {allowed} from '@/lib/auth';
import {clinicalReviewerSession as session} from '@/lib/reviewer-auth';
import { failure, success, parseFailure } from '@/lib/api';
import { assertNonDiagnostic } from '@/lib/safety/resolve';
import {encounterForActor} from '@/lib/access';
import { transition, type EncounterState } from '@/lib/state';
import {assemble} from '@/lib/pipeline';
import {structuredFactsSchema,type StructuredFacts} from '@/lib/ai/types';
import {validateRules} from '@/lib/safety/rules-config';
import type {PriorityResult} from '@/lib/safety/resolve';
import {evidenceSchema} from '@/lib/facts';
import {isProductionDeployment} from '@/lib/runtime-config';
import {rulesChecksum} from '@/lib/safety/rules-approval';

const schema=z.object({
 encounterId:z.string().min(1),
 decision:z.enum(['EDIT','REQUEST_INFO','APPROVE','ESCALATE']),
 summary:z.string().trim().min(1).optional(),
 notes:z.string().max(5000).optional(),
 fields:z.object({duration:z.array(z.string().max(500)).max(100).optional(),ambiguousInformation:z.array(z.string().max(1000)).max(100).optional(),symptoms:z.array(z.string().trim().min(1).max(500)).max(100),timeline:z.array(z.string().trim().min(1).max(1000)).max(100),history:z.array(z.string().max(1000)).max(100),medications:z.array(z.string().max(1000)).max(100),missingInformation:z.array(z.string().max(500)).max(100),followUpQuestions:z.array(z.string().max(500)).max(100),evidence:z.array(evidenceSchema).max(100)}).strict().optional()
}).strict();

export async function POST(req:Request){
 const actor=await session();
 if(!allowed(actor?.role??null,['nurse','medical_officer']))return failure('FORBIDDEN','Reviewer role required.',403);
 try{
  const body=schema.parse(await req.json());
  if(body.decision==='APPROVE'&&actor?.role!=='medical_officer')return failure('FORBIDDEN','Medical Officer role required to approve.',403);
  if(body.summary)assertNonDiagnostic(body.summary);
  if(body.notes)assertNonDiagnostic(body.notes);
  if(body.fields)assertNonDiagnostic(JSON.stringify(body.fields));
  const conn=await db();
  const encounter=await encounterForActor(body.encounterId,actor!);
  if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);
  const [note]=await conn.select().from(triageNotes).where(eq(triageNotes.encounterId,body.encounterId)).limit(1);
  if(body.decision==='APPROVE'){
   const sourceDocuments=await conn.select({fileUrl:reports.fileUrl,reviewedText:reports.reviewedText}).from(reports).where(eq(reports.encounterId,encounter.id));
   if(sourceDocuments.some(report=>report.fileUrl&&!report.reviewedText))return failure('OCR_REVIEW_REQUIRED','Verify every original document and re-evaluate its sources before approval.',409);
  }
  let updatedNote:ReturnType<typeof assemble>|undefined;
  if(body.fields&&note){
   const [source]=await conn.select().from(inputs).where(eq(inputs.encounterId,encounter.id)).orderBy(desc(inputs.createdAt)).limit(1);
   const storedReports=await conn.select().from(reports).where(eq(reports.encounterId,encounter.id));
   const [config]=await conn.select().from(rulesConfig).where(and(eq(rulesConfig.facilityId,actor!.facilityId!),eq(rulesConfig.active,true))).orderBy(desc(rulesConfig.version)).limit(1);
   if(!config)return failure('SAFETY_ENGINE_FAILED','No active ruleset is available.',409);
   const activeRules=validateRules(config.rules);
   if(isProductionDeployment&&(config.status!=='APPROVED'||config.approvedBy!==process.env.CLINICAL_RULESET_APPROVER||!config.approvedAt||config.checksum!==rulesChecksum(activeRules)))return failure('SAFETY_ENGINE_FAILED','Clinical rules approval is invalid.',409);
   const parsed=structuredFactsSchema.safeParse(note.fieldSources.facts);
   const base:StructuredFacts=parsed.success?parsed.data:{patient_reported:{symptoms:[],duration:[],history:[],medications:[]},timeline:[],report_data:[],missing_information:[],ambiguous_information:[],follow_up_questions:[],risk_signals:[],review_priority:'PENDING_RULE_ENGINE'};
   const facts={...base,patient_reported:{...base.patient_reported,duration:body.fields.duration??base.patient_reported.duration,symptoms:body.fields.symptoms,history:body.fields.history,medications:body.fields.medications},ambiguous_information:body.fields.ambiguousInformation??base.ambiguous_information,timeline:body.fields.timeline,missing_information:body.fields.missingInformation,follow_up_questions:body.fields.followUpQuestions};
   const hbValues=storedReports.filter(report=>report.documentType!=='prescription'&&report.reviewedText&&typeof report.extractedData?.hb==='number').map(report=>report.extractedData!.hb as number);
   updatedNote=assemble(facts,{text:source?.originalText??encounter.chiefComplaint,language:source?.language??'en',reportValues:hbValues.length?{hb:Math.min(...hbValues)}:undefined},encounter.priorityFinal as PriorityResult,activeRules);
   updatedNote.summary=body.summary??note.summary;
   updatedNote.fieldSources={...updatedNote.fieldSources,provenance:{original:note.fieldSources.provenance,correction:{reviewerId:actor!.id,at:new Date().toISOString(),fields:body.fields}},evidence:body.fields.evidence,summary:`reviewer:${actor!.id}`};
  }
  if(!note&&body.decision!=='REQUEST_INFO')return failure('TRIAGE_FAILED','No usable triage note. Request information or retry.',422);
  const next=body.decision==='EDIT'?'IN_REVIEW':body.decision==='REQUEST_INFO'?'INFO_REQUESTED':body.decision==='APPROVE'?'APPROVED':'ESCALATED';
  const initialReview=['ESCALATED','TRIAGED','ASR_FAILED','OCR_FAILED','AI_FAILED','AI_PARSE_FAILED','TRIAGE_FAILED','SAFETY_ENGINE_FAILED','SAVE_FAILED'].includes(encounter.state);
  const current=initialReview?'IN_REVIEW':encounter.state;
  try{
   if(initialReview)transition(encounter.state as EncounterState,'IN_REVIEW',true,false);
   if(next!==current)transition(current as EncounterState,next as EncounterState,true,false);
  }catch{return failure('ILLEGAL_TRANSITION','This review action is not available in the current state.',422);}
  await conn.transaction(async tx=>{
   if(initialReview)await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:body.encounterId,action:'STATE_IN_REVIEW',metadata:{from:encounter.state}});
   if(body.summary&&note)await tx.update(triageNotes).set({summary:body.summary,fieldSources:{...note.fieldSources,summary:`reviewer:${actor!.id}`}}).where(eq(triageNotes.id,note.id));
   if(updatedNote&&note)await tx.update(triageNotes).set(updatedNote).where(eq(triageNotes.id,note.id));
   await tx.insert(reviews).values({id:crypto.randomUUID(),encounterId:body.encounterId,reviewerId:actor!.id,changes:{...(body.summary&&note?{summary:{before:note.summary,after:body.summary}}:{}),...(body.fields&&note?{fields:{before:{facts:note.fieldSources.facts,evidence:note.fieldSources.evidence,timeline:encounter.timeline,missingInformation:note.missingInformation,followUpQuestions:note.followUpQuestions},after:body.fields}}:{})},decision:body.decision,notes:body.notes??null});
   const changed=await tx.update(encounters).set({state:next,status:next,...(updatedNote&&body.fields?{timeline:body.fields.timeline,symptoms:body.fields.symptoms,priority:updatedNote.priority,priorityFinal:updatedNote.priority}: {})}).where(and(eq(encounters.id,body.encounterId),eq(encounters.state,encounter.state))).returning({id:encounters.id});
   if(!changed.length)throw new Error('CASE_CHANGED');
   if(updatedNote&&updatedNote.priority!==encounter.priorityFinal)await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:encounter.id,action:'PRIORITY_REEVALUATED',metadata:{previous:encounter.priorityFinal,current:updatedNote.priority,reason:'Reviewer corrected source facts'}});
   await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:body.encounterId,action:body.decision==='EDIT'?'TRIAGE_EDITED':`REVIEW_${body.decision}`,metadata:{summary_changed:Boolean(body.summary)}});
  });
  return success({state:next});
 }catch(e){
  if(e instanceof Error&&e.message==='CASE_CHANGED')return failure('CASE_CHANGED','Another action changed this case. Refresh and review its current state before retrying.',409);
  if(e instanceof Error&&e.message==='AI_PARSE_FAILED')return failure('NON_DIAGNOSTIC_GUARD','Review text contains disallowed diagnosis or treatment language.',422);
  return parseFailure(e);
 }
}


