import {and,eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {auditLogs,rulesConfig} from '@/db/schema';
import {session} from '@/lib/auth';
import {failure,parseFailure,success} from '@/lib/api';
import {validateRules} from '@/lib/safety/rules-config';
import {rulesChecksum} from '@/lib/safety/rules-approval';
import {isProductionDeployment} from '@/lib/runtime-config';

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await session();
 if(actor?.role!=='medical_officer')return failure('FORBIDDEN','Medical Officer role required.',403);
 if(!actor.facilityId)return failure('FACILITY_REQUIRED','Your account is not assigned to a facility.',403);
 if(isProductionDeployment&&actor.id!==process.env.CLINICAL_RULESET_APPROVER)return failure('FORBIDDEN','Designated clinical rules approver required.',403);
 try{
  const {id}=await params,conn=await db();
  const [candidate]=await conn.select().from(rulesConfig).where(and(eq(rulesConfig.id,id),eq(rulesConfig.facilityId,actor.facilityId))).limit(1);
  if(!candidate)return failure('NOT_FOUND','Ruleset not found.',404);
  if(candidate.status!=='DRAFT')return failure('INVALID_STATE','Only a draft ruleset can be approved.',409);
  if(candidate.createdBy===actor.id)return failure('SEPARATION_OF_DUTIES','The author cannot approve this ruleset.',409);
  const rules=validateRules(candidate.rules),checksum=rulesChecksum(rules),approvedAt=new Date();
  await conn.transaction(async tx=>{
   await tx.update(rulesConfig).set({active:false}).where(and(eq(rulesConfig.facilityId,actor.facilityId!),eq(rulesConfig.active,true)));
   await tx.update(rulesConfig).set({status:'APPROVED',active:true,checksum,approvedBy:actor.id,approvedAt}).where(eq(rulesConfig.id,id));
   await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'RULES_CONFIG_APPROVED',metadata:{rules_config_id:id,version:candidate.version,checksum}});
  });
  return success({id,status:'APPROVED',checksum});
 }catch(e){return parseFailure(e);}
}
