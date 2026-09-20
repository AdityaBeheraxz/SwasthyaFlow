import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { encounters,patients,triageNotes,auditLogs,inputs,reports,rulesConfig } from '@/db/schema';
import {desc} from 'drizzle-orm';
import { session,allowed } from '@/lib/auth';
import { failure,success,parseFailure } from '@/lib/api';
import { extract,assemble } from '@/lib/pipeline';
import {translationAdapter} from '@/lib/translation';
import { transition,type EncounterState } from '@/lib/state';
import type {PriorityResult} from '@/lib/safety/resolve';
import {validateRules} from '@/lib/safety/rules-config';
const schema=z.object({encounterId:z.string().min(1),simulateFailure:z.enum(['ASR_FAILED','OCR_FAILED','AI_FAILED','AI_PARSE_FAILED','TRIAGE_FAILED','SAFETY_ENGINE_FAILED','SAVE_FAILED']).optional()}).strict();
export async function POST(req:Request){
 const actor=await session();if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);
 let encounterId:string|undefined;
 try{const body=schema.parse(await req.json());const conn=await db();const [encounter]=await conn.select().from(encounters).where(eq(encounters.id,body.encounterId)).limit(1);if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);
 if(body.simulateFailure&&process.env.NODE_ENV==='production')return failure('FORBIDDEN','Failure simulation is available only in development.',403);
 encounterId=body.encounterId;
 const [patient]=await conn.select().from(patients).where(eq(patients.id,encounter.patientId)).limit(1);
 if(!patient?.consentStatus)return failure('CONSENT_REQUIRED','Consent must be recorded before processing.',422);
 transition(encounter.state as EncounterState,'PROCESSING',true,false);
 await conn.update(encounters).set({state:'PROCESSING',status:'Normalizing'}).where(eq(encounters.id,encounter.id));
 if(body.simulateFailure)throw new Error(body.simulateFailure);
 const [source]=await conn.select().from(inputs).where(eq(inputs.encounterId,encounter.id)).limit(1);
 if(!source?.originalText)throw new Error('TRIAGE_FAILED');
 const [report]=await conn.select().from(reports).where(eq(reports.encounterId,encounter.id)).limit(1);
 const normalized=await translationAdapter().normalize(source.originalText,(source.language==='hi'||source.language==='or')?source.language:'en');
 await conn.update(inputs).set({source:{...(source.source??{}),normalized:normalized.normalized,ambiguousSpans:normalized.ambiguousSpans}}).where(eq(inputs.id,source.id));
 await conn.update(encounters).set({status:'Extracting facts'}).where(eq(encounters.id,encounter.id));
 const bundle={text:source.originalText,language:source.language??'en',normalizedText:normalized.normalized,reportText:report?.rawOcr??undefined};
 const facts=await extract(bundle);
 await conn.update(encounters).set({status:'Applying safety rules'}).where(eq(encounters.id,encounter.id));
 const [config]=await conn.select().from(rulesConfig).where(eq(rulesConfig.active,true)).orderBy(desc(rulesConfig.version)).limit(1);
 if(!config)throw new Error('SAFETY_ENGINE_FAILED');
 let activeRules;try{activeRules=validateRules(config.rules);}catch{throw new Error('SAFETY_ENGINE_FAILED');}
 const note=assemble(facts,bundle,encounter.priorityFinal as PriorityResult|undefined,activeRules);
 await conn.update(encounters).set({status:'Assembling triage note'}).where(eq(encounters.id,encounter.id));
 const [existingNote]=await conn.select().from(triageNotes).where(eq(triageNotes.encounterId,encounter.id)).limit(1);
 await conn.transaction(async tx=>{if(existingNote)await tx.update(triageNotes).set(note).where(eq(triageNotes.id,existingNote.id));else await tx.insert(triageNotes).values({id:crypto.randomUUID(),encounterId:encounter.id,...note});await tx.update(encounters).set({state:'TRIAGED',status:'TRIAGED',priority:note.priority,priorityFinal:note.priority,prioritySource:'RULES',symptoms:facts.patient_reported.symptoms,timeline:facts.timeline}).where(eq(encounters.id,encounter.id));await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:encounter.id,action:'TRIAGE_COMPLETED',metadata:{priority:note.priority,rule_ids:note.riskSignals.map(rule=>rule.ruleId)}});});
 return success({note});
 }catch(e){const code=e instanceof Error?e.message:'SAVE_FAILED';if(encounterId&&['ASR_FAILED','OCR_FAILED','AI_FAILED','AI_PARSE_FAILED','TRIAGE_FAILED','SAFETY_ENGINE_FAILED','SAVE_FAILED'].includes(code)){const conn=await db();const [stored]=await conn.select().from(encounters).where(eq(encounters.id,encounterId)).limit(1);await conn.update(encounters).set({state:code,status:code,priorityFinal:stored?.priorityFinal??(code==='SAFETY_ENGINE_FAILED'?'PRIORITY_UNAVAILABLE':null)}).where(eq(encounters.id,encounterId));}return ['ASR_FAILED','OCR_FAILED','AI_FAILED','AI_PARSE_FAILED','TRIAGE_FAILED','SAFETY_ENGINE_FAILED','SAVE_FAILED'].includes(code)?failure(code,`${code}: processing stopped. Retry or request manual review.`,422):parseFailure(e);}
}
