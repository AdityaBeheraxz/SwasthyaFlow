import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
import {db} from '@/lib/db/server';
import {patients,auditLogs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
import {privacyPolicyVersion} from '@/lib/privacy-policy';
const schema=z.object({patientId:z.string().uuid(),withdraw:z.literal(true),requestConfirmed:z.literal(true)}).strict();
export async function POST(req:Request){
 const actor=await session();if(!actor?.facilityId||!allowed(actor.role,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Clinical staff authorization required.',403);
 try{
  const body=schema.parse(await req.json()),conn=await db();
  const [patient]=await conn.select({id:patients.id}).from(patients).where(and(eq(patients.id,body.patientId),eq(patients.facilityId,actor.facilityId))).limit(1);
  if(!patient)return failure('NOT_FOUND','Patient not found.',404);
  await conn.transaction(async tx=>{await tx.update(patients).set({consentStatus:false}).where(eq(patients.id,patient.id));await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'CONSENT_WITHDRAWN',metadata:{policy_version:privacyPolicyVersion}});});
  return success({withdrawn:true});
 }catch(error){return parseFailure(error);}
}
