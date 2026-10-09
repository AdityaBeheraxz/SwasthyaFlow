import {and,eq,desc} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {clinicalReviewerSession as session} from '@/lib/reviewer-auth';
import {encounterForActor} from '@/lib/access';
import {failure,success,parseFailure} from '@/lib/api';
import {referrals,referralRecipients,patients,triageNotes,reviews,encounters,facilities,auditLogs,referralDeliveries} from '@/db/schema';
import {referralSchema,referralConsentVersion,type ReferralReport} from '@/lib/referral-policy';
import {assertNonDiagnostic} from '@/lib/safety/resolve';
export async function GET(req:Request){const actor=await session();if(actor?.role!=='medical_officer'||!actor.facilityId)return failure('FORBIDDEN','Medical Officer role required.',403);const id=new URL(req.url).searchParams.get('encounterId')??'';if(!await encounterForActor(id,actor))return failure('NOT_FOUND','Encounter not found.',404);const rows=await (await db()).select({id:referrals.id,recipientId:referrals.recipientId,content:referrals.content,createdAt:referrals.createdAt,deliveryStatus:referrals.deliveryStatus,decision:referralDeliveries.decision}).from(referrals).leftJoin(referralDeliveries,eq(referralDeliveries.id,referrals.id)).where(eq(referrals.encounterId,id)).orderBy(desc(referrals.createdAt));return success(rows.filter(r=>{try{return JSON.parse(r.content).version===1;}catch{return false;}}));}
export async function POST(req:Request){
 const actor=await session();if(actor?.role!=='medical_officer'||!actor.facilityId)return failure('FORBIDDEN','Medical Officer role required.',403);
 try{
  const data=referralSchema.parse(await req.json());assertNonDiagnostic(data.reason);
  const encounter=await encounterForActor(data.encounterId,actor);if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);
  if(!['APPROVED','REFERRAL_GENERATED'].includes(encounter.state))return failure('APPROVAL_REQUIRED','Approve the reviewed case before creating a referral.',409);
  const conn=await db();const [[recipient],[patient],[note],[approval],[facility]]=await Promise.all([
   conn.select().from(referralRecipients).where(and(eq(referralRecipients.id,data.recipientId),eq(referralRecipients.facilityId,actor.facilityId),eq(referralRecipients.active,true))).limit(1),
   conn.select().from(patients).where(eq(patients.id,encounter.patientId)).limit(1),conn.select().from(triageNotes).where(eq(triageNotes.encounterId,encounter.id)).limit(1),
   conn.select().from(reviews).where(and(eq(reviews.encounterId,encounter.id),eq(reviews.decision,'APPROVE'))).limit(1),conn.select().from(facilities).where(eq(facilities.id,actor.facilityId)).limit(1)
  ]);
  if(!recipient)return failure('RECIPIENT_UNAVAILABLE','Choose an active verified recipient from your facility directory.',422);
  if(!patient?.consentStatus||!note||!approval||!facility)return failure('APPROVAL_REQUIRED','A consented, doctor-approved reviewed note is required.',409);
  if(patient.age<18&&data.consentAuthority!=='guardian')return failure('GUARDIAN_REQUIRED','Guardian consent is required for a child.',422);
  if(note.summary.length>20000)return failure('SUMMARY_TOO_LONG','Shorten and approve the factual summary before creating a referral.',422);
  assertNonDiagnostic(note.summary);
  const id=crypto.randomUUID(),now=new Date();const report:ReferralReport={version:1,recipient:{name:recipient.name,kind:recipient.kind,institution:recipient.institution,department:recipient.department,registrationNumber:recipient.registrationNumber},patient:{reference:patient.anonymousPatientId,name:data.includeName?patient.name:null,age:patient.age,language:patient.preferredLanguage},sourceFacility:facility.name,doctor:actor.name,createdAt:now.toISOString(),reason:data.reason,summary:note.summary,priority:encounter.priorityFinal??'Unavailable',consentAuthority:data.consentAuthority,consentVersion:referralConsentVersion,deliveryStatus:'NOT_SENT'};
  await conn.transaction(async tx=>{
   const [consented]=await tx.select({id:patients.id}).from(patients).where(and(eq(patients.id,patient.id),eq(patients.consentStatus,true))).for('update');const [active]=await tx.select({id:referralRecipients.id}).from(referralRecipients).where(and(eq(referralRecipients.id,recipient.id),eq(referralRecipients.active,true))).for('update');if(!consented||!active)throw new Error('STALE_CASE');
   const rows=await tx.update(encounters).set({state:'REFERRAL_GENERATED',status:'REFERRAL_GENERATED'}).where(and(eq(encounters.id,encounter.id),eq(encounters.state,encounter.state))).returning({id:encounters.id});if(!rows.length)throw new Error('STALE_CASE');
   await tx.insert(referrals).values({id,encounterId:encounter.id,recipientId:recipient.id,approvedBy:actor.id,consentAt:now,content:JSON.stringify(report),deliveryStatus:'NOT_SENT'});
   await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,encounterId:encounter.id,action:'REFERRAL_CREATED',metadata:{referralId:id,recipientId:recipient.id,consentAuthority:data.consentAuthority,consentVersion:referralConsentVersion,includeName:data.includeName,deliveryStatus:'NOT_SENT'}});
  });return success({id,report,deliveryStatus:'NOT_SENT'},201);
 }catch(e){if(e instanceof Error&&e.message==='AI_PARSE_FAILED')return failure('NON_DIAGNOSTIC_GUARD','Referral text must contain factual concerns only, without diagnosis or treatment advice.',422);if(e instanceof Error&&e.message==='STALE_CASE')return failure('STALE_CASE','The case changed. Reload and retry.',409);return parseFailure(e);}
}



