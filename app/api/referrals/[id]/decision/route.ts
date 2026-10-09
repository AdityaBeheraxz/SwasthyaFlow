import {z} from 'zod';
import {and,eq,isNull} from 'drizzle-orm';
import {referralWorkspaceSession} from '@/lib/referral-workspace-auth';
import {db} from '@/lib/db/server';
import {referralDeliveries,auditLogs} from '@/db/schema';
import {referralForDoctor} from '@/lib/referral-access';
import {failure,success,parseFailure} from '@/lib/api';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await referralWorkspaceSession();if(actor?.role!=='medical_officer'||!actor.facilityId)return failure('FORBIDDEN','Receiving doctor required.',403);
 try{const {decision}=z.object({decision:z.enum(['ACCEPTED','DECLINED'])}).strict().parse(await req.json()),{id}=await params;
 const access=await referralForDoctor(id,actor);if(!access?.receiver)return failure('NOT_FOUND','Received referral unavailable.',404);
 const conn=await db();const changed=await conn.transaction(async tx=>{const rows=await tx.update(referralDeliveries).set({decision,decidedBy:actor.id,decidedAt:new Date()}).where(and(eq(referralDeliveries.id,id),eq(referralDeliveries.receivingFacilityId,actor.facilityId!),isNull(referralDeliveries.decision))).returning({id:referralDeliveries.id});if(rows.length)await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'REFERRAL_RECEIVER_DECISION',metadata:{referralId:id,decision}});return rows.length;});
 return changed?success({decision}):failure('ALREADY_DECIDED','This referral already has a receiving-doctor decision.',409);
 }catch(e){return parseFailure(e);}
}

