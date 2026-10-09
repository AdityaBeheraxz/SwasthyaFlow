import {z} from 'zod';
import {and,eq} from 'drizzle-orm';
import {clinicalReviewerSession as session} from '@/lib/reviewer-auth';
import {db} from '@/lib/db/server';
import {encounterForActor} from '@/lib/access';
import {referrals,referralRecipients,referralDeliveries,auditLogs,patients,reports} from '@/db/schema';
import {failure,success,parseFailure} from '@/lib/api';
import {deliveryConnector} from '@/lib/referral-delivery-config';
import {fingerprint,processReferralDelivery} from '@/lib/referral-delivery';
import {consumeRateLimit} from '@/lib/rate-limit';
const schema=z.object({electronicConsentConfirmed:z.literal(true),includeAttachments:z.literal(true),consentAuthority:z.enum(['self','guardian'])}).strict();
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await session();if(actor?.role!=='medical_officer'||!actor.facilityId)return failure('FORBIDDEN','Medical Officer role required.',403);
 try{
  const consent=schema.parse(await req.json()),{id}=await params,conn=await db();
  const [row]=await conn.select().from(referrals).where(eq(referrals.id,id)).limit(1);
  const encounter=row?await encounterForActor(row.encounterId,actor):null;
  if(!row||!encounter||!row.recipientId||!row.consentAt||!row.approvedBy)return failure('NOT_FOUND','Referral unavailable.',404);
  const [patient]=await conn.select().from(patients).where(eq(patients.id,encounter.patientId)).limit(1);
  if(patient.age<18&&consent.consentAuthority!=='guardian')return failure('GUARDIAN_REQUIRED','Guardian electronic-sharing consent is required.',422);
  const connector=deliveryConnector(row.recipientId,actor.facilityId);
  if(!connector)return failure('DELIVERY_NOT_CONFIGURED','No approved receiving software is configured for this recipient.',409);
  if(!(await consumeRateLimit(`referral-send:${actor.id}`,20,60)).ok)return failure('RATE_LIMITED','Please wait before sending again.',429);
  await conn.transaction(async tx=>{
   const [active]=await tx.select().from(referralRecipients).where(and(eq(referralRecipients.id,row.recipientId!),eq(referralRecipients.facilityId,actor.facilityId!),eq(referralRecipients.active,true))).for('update');
   const [consented]=await tx.select({id:patients.id}).from(patients).where(and(eq(patients.id,patient.id),eq(patients.consentStatus,true))).for('update');
   if(!active||!consented)throw new Error('STALE_CONSENT');
   if(typeof connector==='string'&&!active.receivingFacilityId)throw new Error('RECEIVING_WORKSPACE_REQUIRED');
   // External adapters require a separate document transport agreement; never silently omit originals.
   if(typeof connector!=='string')throw new Error('DOCUMENT_TRANSPORT_NOT_CONFIGURED');
   const docs=await tx.select().from(reports).where(eq(reports.encounterId,row.encounterId));
   const attachments=docs.filter(d=>d.fileUrl&&d.fileSha256).map(d=>({id:d.id,name:d.fileName??'Uploaded document',mime:d.fileMimeType??'application/octet-stream',sha256:d.fileSha256!,documentType:d.documentType}));
   if(attachments.length!==docs.filter(d=>d.fileUrl).length)throw new Error('DOCUMENT_UNAVAILABLE');
   const inserted=await tx.insert(referralDeliveries).values({id,facilityId:actor.facilityId!,receivingFacilityId:active.receivingFacilityId,attachments,recipientId:row.recipientId!,requestedBy:actor.id,consentAt:new Date(),connectorFingerprint:fingerprint(connector),mode:typeof connector==='string'?connector:'http'}).onConflictDoNothing().returning({id:referralDeliveries.id});
   if(inserted.length){await tx.update(referrals).set({deliveryStatus:'QUEUED'}).where(eq(referrals.id,id));await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,encounterId:row.encounterId,action:'REFERRAL_ELECTRONIC_CONSENT',metadata:{referralId:id,recipientId:row.recipientId,consentAuthority:consent.consentAuthority,consentVersion:'2.0-IN',mode:typeof connector==='string'?connector:'http'}});}
  });
  await processReferralDelivery(id);
  const [job]=await conn.select({state:referralDeliveries.state,attempts:referralDeliveries.attempts,receiptId:referralDeliveries.receiptId,nextAttemptAt:referralDeliveries.nextAttemptAt,errorCode:referralDeliveries.errorCode}).from(referralDeliveries).where(eq(referralDeliveries.id,id));
  return success(job);
 }catch(e){if(e instanceof Error&&['STALE_CONSENT','RECEIVING_WORKSPACE_REQUIRED','DOCUMENT_TRANSPORT_NOT_CONFIGURED','DOCUMENT_UNAVAILABLE'].includes(e.message))return failure(e.message,'Check active consent, receiving workspace and availability of all original documents before sending.',409);return parseFailure(e);}
}



