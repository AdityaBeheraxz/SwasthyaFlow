import 'server-only';
import {and,eq} from 'drizzle-orm';
import {db} from './db/server';
import type {Actor} from './auth';
import {referrals,referralDeliveries,referralRecipients,encounters,patients,auditLogs} from '@/db/schema';
export async function referralForDoctor(id:string,actor:Actor){
 if(actor.role!=='medical_officer'||!actor.facilityId)return null;
 const conn=await db();
 const [row]=await conn.select({referral:referrals,delivery:referralDeliveries,encounter:encounters,recipient:referralRecipients}).from(referrals).innerJoin(encounters,eq(referrals.encounterId,encounters.id)).innerJoin(patients,eq(encounters.patientId,patients.id)).innerJoin(referralRecipients,eq(referrals.recipientId,referralRecipients.id)).leftJoin(referralDeliveries,eq(referralDeliveries.id,referrals.id)).where(and(eq(referrals.id,id),eq(patients.consentStatus,true),eq(referralRecipients.active,true))).limit(1);
 if(!row||!row.referral.consentAt||!row.referral.approvedBy)return null;
 const sender=row.encounter.facilityId===actor.facilityId;
 const receiver=row.delivery?.receivingFacilityId===actor.facilityId&&['LOCAL_RECEIVED','RECEIVED'].includes(row.delivery.state)&&['local','internal'].includes(row.delivery.mode)&&row.recipient.receivingFacilityId===actor.facilityId&&row.delivery.decision!=='DECLINED';
 if(!sender&&!receiver)return null;
 await conn.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'REFERRAL_ACCESS_AUTHORIZED',metadata:{referralId:id,receiver}});
 return {...row,sender,receiver};
}

