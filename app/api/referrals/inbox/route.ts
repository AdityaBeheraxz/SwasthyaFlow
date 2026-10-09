import {and,eq,or,isNull,ne,inArray,desc,isNotNull,lt,sql} from 'drizzle-orm';
import {referralWorkspaceSession} from '@/lib/referral-workspace-auth';
import {db} from '@/lib/db/server';
import {referralDeliveries,referrals,encounters,patients,referralRecipients,auditLogs} from '@/db/schema';
import {failure,success} from '@/lib/api';
import {nextCursor,pageSize,readCursor,queryFailure} from '@/lib/record-pagination';
export async function GET(req:Request){
 const actor=await referralWorkspaceSession();if(actor?.role!=='medical_officer'||!actor.facilityId)return failure('FORBIDDEN','Medical Officer role required.',403);
 try{const params=new URL(req.url).searchParams,limit=pageSize(params.get('limit')),cursor=readCursor(params.get('cursor')),status=params.get('status')??'all';if(!['all','pending','accepted'].includes(status))return failure('INVALID_FILTER','Choose all, pending or accepted referrals.',400);const orderTime=sql`date_trunc('milliseconds',${referralDeliveries.receivedAt})`;
 const rows=await (await db()).select({id:referrals.id,content:referrals.content,receiptId:referralDeliveries.receiptId,receivedAt:referralDeliveries.receivedAt,attachments:referralDeliveries.attachments,decision:referralDeliveries.decision,mode:referralDeliveries.mode}).from(referralDeliveries).innerJoin(referrals,eq(referrals.id,referralDeliveries.id)).innerJoin(encounters,eq(encounters.id,referrals.encounterId)).innerJoin(patients,eq(patients.id,encounters.patientId)).innerJoin(referralRecipients,eq(referralRecipients.id,referrals.recipientId)).where(and(eq(referralDeliveries.receivingFacilityId,actor.facilityId),eq(referralRecipients.receivingFacilityId,actor.facilityId),inArray(referralDeliveries.state,['LOCAL_RECEIVED','RECEIVED']),inArray(referralDeliveries.mode,['local','internal']),or(isNull(referralDeliveries.decision),ne(referralDeliveries.decision,'DECLINED')),eq(patients.consentStatus,true),eq(referralRecipients.active,true),isNotNull(referralDeliveries.receivedAt),status==='pending'?isNull(referralDeliveries.decision):status==='accepted'?eq(referralDeliveries.decision,'ACCEPTED'):undefined,cursor?or(lt(orderTime,sql`${cursor.at}::timestamptz`),and(eq(orderTime,sql`${cursor.at}::timestamptz`),lt(referrals.id,cursor.id))):undefined)).orderBy(desc(orderTime),desc(referrals.id)).limit(limit+1);
 await (await db()).insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'REFERRAL_INBOX_ACCESSED',metadata:{count:rows.length}});const page=rows.slice(0,limit),response=success(page),last=page.at(-1);if(rows.length>limit&&last?.receivedAt)response.headers.set('X-Next-Cursor',nextCursor(last.receivedAt,last.id));return response;}catch(e){return queryFailure(e,'referral inbox');}
}





