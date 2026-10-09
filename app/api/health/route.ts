import {and,eq,sql} from 'drizzle-orm';
import {success,failure} from '@/lib/api';
import {db} from '@/lib/db/server';
import {rulesConfig} from '@/db/schema';
import {deploymentMode,isProductionDeployment,productionConfigIssues,hostedDemoConfigIssues} from '@/lib/runtime-config';
import {validateRules} from '@/lib/safety/rules-config';
import {rulesChecksum} from '@/lib/safety/rules-approval';
import {uploadLimits} from '@/lib/upload-limits';

export async function GET(){
 const issues=[...productionConfigIssues(),...hostedDemoConfigIssues()];
 if(issues.length)return failure('NOT_READY',`Deployment configuration is incomplete (${issues.length} checks failed).`,503);
 try{
  const conn=await db();
  await conn.execute(sql`select 1`);
  if(isProductionDeployment){
   const [ruleset]=await conn.select().from(rulesConfig).where(and(eq(rulesConfig.facilityId,process.env.OIDC_FACILITY_ID!),eq(rulesConfig.active,true))).limit(1);
   if(!ruleset||ruleset.status!=='APPROVED'||ruleset.approvedBy!==process.env.CLINICAL_RULESET_APPROVER||!ruleset.approvedAt)return failure('NOT_READY','No designated, clinically approved ruleset is active.',503);
   let checksum='';try{checksum=rulesChecksum(validateRules(ruleset.rules));}catch{return failure('NOT_READY','The active clinical ruleset is invalid.',503);}
   if(checksum!==ruleset.checksum)return failure('NOT_READY','The active clinical ruleset integrity check failed.',503);
  }
  return success({status:'ready',deploymentMode,limits:uploadLimits(),aiMode:process.env.AI_MODE||'local',ocrMode:process.env.OCR_MODE||(isProductionDeployment?'unconfigured':'tesseract'),fixtureMode:[process.env.ASR_MODE,process.env.TRANSLATION_MODE,process.env.EXTRACTION_MODE,process.env.OCR_MODE,process.env.AI_MODE].includes('fixture')});
 }catch{return failure('DB_UNAVAILABLE','Database unavailable',503);}
}
