import {z} from 'zod';
import {and,desc,eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {rulesConfig,auditLogs} from '@/db/schema';
import {session} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
import {validateRules} from '@/lib/safety/rules-config';
import {rulesChecksum} from '@/lib/safety/rules-approval';
import {isProductionDeployment} from '@/lib/runtime-config';

export async function GET(){
 const actor=await session();
 if(!actor)return failure('UNAUTHORIZED','Sign in to continue.',401);
 if(!actor.facilityId)return failure('FACILITY_REQUIRED','Your account is not assigned to a facility.',403);
 const versions=await (await db()).select().from(rulesConfig).where(eq(rulesConfig.facilityId,actor.facilityId)).orderBy(desc(rulesConfig.version));
 return success(versions);
}

export async function POST(req:Request){
 const actor=await session();
 if(actor?.role!=='administrator')return failure('FORBIDDEN','Administrator role required.',403);
 if(!actor.facilityId)return failure('FACILITY_REQUIRED','Your account is not assigned to a facility.',403);
 try{
  const body=z.object({rules:z.unknown()}).strict().parse(await req.json());
  const rules=validateRules(body.rules),conn=await db();
  const [latest]=await conn.select().from(rulesConfig).where(eq(rulesConfig.facilityId,actor.facilityId)).orderBy(desc(rulesConfig.version)).limit(1);
  const version=(latest?.version??0)+1,id=crypto.randomUUID(),activate=!isProductionDeployment;
  await conn.transaction(async tx=>{
   if(activate)await tx.update(rulesConfig).set({active:false}).where(and(eq(rulesConfig.facilityId,actor.facilityId!),eq(rulesConfig.active,true)));
   await tx.insert(rulesConfig).values({id,facilityId:actor.facilityId!,version,rules,status:activate?'APPROVED':'DRAFT',active:activate,checksum:activate?rulesChecksum(rules):null,createdBy:actor.id,approvedBy:activate?actor.id:null,approvedAt:activate?new Date():null});
   await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:activate?'RULES_CONFIG_ACTIVATED':'RULES_CONFIG_DRAFTED',metadata:{rules_config_id:id,version,rule_count:rules.length}});
  });
  return success({id,version,status:activate?'APPROVED':'DRAFT'},201);
 }catch(e){
  if(e instanceof Error&&['REQUIRED_RULE_WEAKENED','DUPLICATE_RULE_ID','AI_PARSE_FAILED'].includes(e.message))return failure(e.message,'Required safety rules cannot be weakened; messages must remain non-diagnostic.',422);
  return parseFailure(e);
 }
}
