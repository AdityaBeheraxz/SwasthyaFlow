import {db} from '../lib/db/index';
import {facilities,users,patientIdCounters,rulesConfig,rateLimitEvents} from './schema';
import {like} from 'drizzle-orm';
import rules from '../lib/safety/rules.default.json';
import {hashPassword} from '../lib/password';
import {rulesChecksum} from '../lib/safety/rules-approval';
import {validateRules} from '../lib/safety/rules-config';

async function main(){
 const conn=await db();
 await conn.delete(rateLimitEvents).where(like(rateLimitEvents.key,'login:%'));
 await conn.insert(facilities).values({id:'F-001',name:'SwasthyaFlow Primary Health Centre',type:'Primary Health Centre',location:'Configured deployment facility'}).onConflictDoUpdate({target:facilities.id,set:{name:'SwasthyaFlow Primary Health Centre',type:'Primary Health Centre',location:'Configured deployment facility'}});
 await conn.insert(patientIdCounters).values({id:'global',nextValue:1001}).onConflictDoNothing();
 for(const user of [
  {id:'U-101',name:'Asha Patnaik',username:'health.worker',password:'HealthWorker!2026',role:'health_worker'},
  {id:'U-102',name:'Nurse Meera Singh',username:'nurse.meera',password:'Nurse!2026',role:'nurse'},
  {id:'U-104',name:'Dr. Ananya Rao',username:'doctor.ananya',password:'Doctor!2026',role:'medical_officer'},
  {id:'U-106',name:'Dr. Vikram Das',username:'doctor.vikram',password:'Doctor!2026',role:'medical_officer'},
  {id:'U-105',name:'System Administrator',username:'administrator',password:'Admin!2026',role:'administrator'}
 ]){
  const {password,...record}=user,passwordHash=await hashPassword(password);
  await conn.insert(users).values({...record,passwordHash,active:true,facilityId:'F-001'}).onConflictDoUpdate({target:users.id,set:{...record,passwordHash,active:true,facilityId:'F-001'}});
 }
 const validated=validateRules(rules);
 await conn.insert(rulesConfig).values({id:'DEFAULT-1',facilityId:'F-001',version:1,rules,status:'APPROVED',active:true,checksum:rulesChecksum(validated),createdBy:'U-105',approvedBy:'U-104',approvedAt:new Date()}).onConflictDoUpdate({target:rulesConfig.id,set:{rules,status:'APPROVED',active:true,checksum:rulesChecksum(validated),approvedBy:'U-104',approvedAt:new Date()}});
 console.log('Provisioned facility, staff accounts, and the approved baseline ruleset. No patient or encounter records were created.');
}
main().catch((error:unknown)=>{console.error(error);process.exitCode=1;});
