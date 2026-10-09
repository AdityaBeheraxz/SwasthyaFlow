import 'server-only';
import {createHash} from 'node:crypto';
import {and,eq,lt,lte,or,inArray,sql} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {referralDeliveries,referrals,referralRecipients,patients,encounters,users,auditLogs,facilities,reports} from '@/db/schema';
import {deliveryConnector,receiptSchema,type ReferralConnector} from './referral-delivery-config';
import {privateProviderFetch} from './privacy-policy';
import {objectStorage,reportStorageKey} from './storage';

export const fingerprint=(connector:ReferralConnector|'local'|'internal')=>createHash('sha256').update(JSON.stringify(connector)).digest('hex');
export async function processReferralDelivery(id:string){
 const conn=await db(),now=new Date(),leaseId=crypto.randomUUID();
 const [job]=await conn.update(referralDeliveries).set({state:'PROCESSING',leaseId,leaseUntil:new Date(Date.now()+60000),attempts:sql`${referralDeliveries.attempts}+1`}).where(and(eq(referralDeliveries.id,id),lte(referralDeliveries.nextAttemptAt,now),or(inArray(referralDeliveries.state,['QUEUED','RETRY_WAIT']),and(eq(referralDeliveries.state,'PROCESSING'),lt(referralDeliveries.leaseUntil,now))))).returning();
 if(!job)return;
 let state='CANCELLED',errorCode:string|null=null,receiptId:string|null=null;
 try{
  const [source]=await conn.select({referral:referrals,recipient:referralRecipients,patient:patients,encounter:encounters,user:users}).from(referrals).innerJoin(referralRecipients,eq(referrals.recipientId,referralRecipients.id)).innerJoin(encounters,eq(referrals.encounterId,encounters.id)).innerJoin(patients,eq(encounters.patientId,patients.id)).innerJoin(referralDeliveries,eq(referralDeliveries.id,referrals.id)).innerJoin(users,eq(users.id,referralDeliveries.requestedBy)).where(eq(referrals.id,id)).limit(1);
  if(!source||!source.patient.consentStatus||!source.recipient.active||!source.user.active||source.user.role!=='medical_officer'||source.user.facilityId!==job.facilityId||source.encounter.facilityId!==job.facilityId||!['APPROVED','REFERRAL_GENERATED'].includes(source.encounter.state))throw new Error('CONSENT_OR_ACCESS_REVOKED');
  const connector=deliveryConnector(job.recipientId,job.facilityId);
  if(!connector||fingerprint(connector)!==job.connectorFingerprint)throw new Error('CONNECTOR_CHANGED');
  if(typeof connector==='string'){
   if(!job.receivingFacilityId||source.recipient.receivingFacilityId!==job.receivingFacilityId)throw new Error('CONNECTOR_CHANGED');
   const [receiver]=await conn.select().from(facilities).where(eq(facilities.id,job.receivingFacilityId!)).limit(1);
   if(!receiver||(connector==='internal'&&(receiver.settings.prototypeOnly===true||receiver.settings.referralAcceptanceApproved!==true)))throw new Error('CONNECTOR_CHANGED');
   let size=0;if(job.attachments.length>20)throw new Error('DOCUMENT_LIMIT');
   for(const a of job.attachments){const [doc]=await conn.select().from(reports).where(eq(reports.id,a.id)).limit(1);if(!doc?.fileUrl||doc.encounterId!==source.encounter.id||doc.fileSha256!==a.sha256)throw new Error('DOCUMENT_UNAVAILABLE');const object=await objectStorage().get(reportStorageKey(doc.fileUrl));size+=object.bytes.length;if(size>30*1024*1024||createHash('sha256').update(object.bytes).digest('hex')!==a.sha256)throw new Error('DOCUMENT_UNAVAILABLE');}
   // Internal transport grants access only to the named receiving workspace.
   state=connector==='local'?'LOCAL_RECEIVED':'RECEIVED';receiptId=`${connector}-${id}`;
  }else{
   const payload=JSON.stringify({schemaVersion:1,referralId:id,recipientId:job.recipientId,report:JSON.parse(source.referral.content)});
   const payloadSha256=createHash('sha256').update(payload).digest('hex');
   const response=await privateProviderFetch(connector.url,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${process.env[connector.tokenEnv]}`,'idempotency-key':id,'x-payload-sha256':payloadSha256},body:payload,signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error('RECEIVER_UNAVAILABLE');
   const text=await response.text();if(text.length>8192)throw new Error('INVALID_RECEIPT');
   const receipt=receiptSchema.safeParse(JSON.parse(text));
   if(!receipt.success||receipt.data.referralId!==id||receipt.data.payloadSha256!==payloadSha256)throw new Error('INVALID_RECEIPT');
   state='RECEIVED';receiptId=receipt.data.receiptId;
  }
 }catch(e){
  const code=e instanceof Error?e.message:'';
  errorCode=['CONSENT_OR_ACCESS_REVOKED','CONNECTOR_CHANGED','EXTERNAL_PROCESSING_BLOCKED','INVALID_RECEIPT','RECEIVER_UNAVAILABLE','DOCUMENT_UNAVAILABLE','DOCUMENT_LIMIT'].includes(code)?code:'DELIVERY_UNCONFIRMED';
  state=['CONSENT_OR_ACCESS_REVOKED','CONNECTOR_CHANGED','EXTERNAL_PROCESSING_BLOCKED'].includes(errorCode)?'CANCELLED':job.attempts>=5?'FAILED':'RETRY_WAIT';
 }
 await conn.transaction(async tx=>{
  const changed=await tx.update(referralDeliveries).set({state,errorCode,receiptId,receivedAt:receiptId?new Date():null,leaseUntil:null,leaseId:null,nextAttemptAt:new Date(Date.now()+Math.min(3600000,30000*2**job.attempts))}).where(and(eq(referralDeliveries.id,id),eq(referralDeliveries.leaseId,leaseId))).returning({id:referralDeliveries.id});
  if(!changed.length)return;
  await tx.update(referrals).set({deliveryStatus:state}).where(eq(referrals.id,id));
  await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:job.requestedBy,facilityId:job.facilityId,action:'REFERRAL_DELIVERY_STATUS',metadata:{referralId:id,recipientId:job.recipientId,state,attempt:job.attempts,errorCode}});
 });
}
export async function processDueReferrals(){
 const conn=await db(),now=new Date();
 const jobs=await conn.select({id:referralDeliveries.id}).from(referralDeliveries).where(and(lte(referralDeliveries.nextAttemptAt,now),or(inArray(referralDeliveries.state,['QUEUED','RETRY_WAIT']),and(eq(referralDeliveries.state,'PROCESSING'),lt(referralDeliveries.leaseUntil,now))))).limit(25);
 for(const job of jobs)await processReferralDelivery(job.id);
 return jobs.length;
}




