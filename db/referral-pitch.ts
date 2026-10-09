import {randomBytes,createHash} from 'node:crypto';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {db} from '../lib/db/index';
import {facilities,users,referralRecipients,rulesConfig} from './schema';
import {hashPassword} from '../lib/password';
import rules from '../lib/safety/rules.default.json';
import {rulesChecksum} from '../lib/safety/rules-approval';
import {validateRules} from '../lib/safety/rules-config';
import {demoPassword} from './demo-passwords';
async function main(){
 if(process.env.DEPLOYMENT_MODE==='production')throw new Error('Pitch workspaces cannot be provisioned in production.');
 const accessFile=process.env.PGLITE_DATA_DIR?.includes('e2e')?'.data/referral-pitch-test-access.txt':'.data/referral-pitch-access.txt';
 const existing=await readFile(accessFile,'utf8').catch(()=>'');
 const savedPassword=existing.split(/\r?\n/).find(line=>line.startsWith('receiver.scb | '))?.split(' | ')[1];
 const password=process.env.DEPLOYMENT_MODE==='demo'?demoPassword('REFERRAL_PITCH_PASSWORD'):process.env.REFERRAL_PITCH_PASSWORD||savedPassword||randomBytes(18).toString('base64url')+'!9';
 const conn=await db();
 const colleges=[{id:'PITCH-SCB',name:'S.C.B. Medical College & Hospital',location:'Cuttack',username:'receiver.scb',recipientId:'a0010000-0000-4000-8000-000000000001'},{id:'PITCH-MKCG',name:'M.K.C.G. Medical College & Hospital',location:'Berhampur',username:'receiver.mkcg',recipientId:'a0010000-0000-4000-8000-000000000002'},{id:'PITCH-VIMSAR',name:'VIMSAR',location:'Burla',username:'receiver.vimsar',recipientId:'a0010000-0000-4000-8000-000000000003'}];
 for(const college of colleges){
  await conn.insert(facilities).values({id:college.id,name:college.name+' · prototype workspace',type:'Prototype receiving facility',location:college.location,settings:{prototypeOnly:true}}).onConflictDoNothing();
  const passwordHash=await hashPassword(password);
  await conn.insert(users).values({id:college.id+'-DOCTOR',name:'Prototype receiving Medical Officer · '+college.location,username:college.username,passwordHash,role:'medical_officer',facilityId:college.id,active:true}).onConflictDoUpdate({target:users.id,set:{passwordHash}});
  await conn.insert(referralRecipients).values({id:college.recipientId,facilityId:'F-001',receivingFacilityId:college.id,name:college.name+' · prototype',kind:'government_hospital',institution:college.name,department:'Referral review (prototype)',verificationReference:'Identity: https://dmet.odisha.gov.in/en/light/page/medical-colleges; checked 2026-10-08. Prototype workspace only; no institutional onboarding or approval.',verifiedBy:'U-105'}).onConflictDoNothing();
 }
 const validated=validateRules(rules);
 for(const source of colleges){
  await conn.insert(rulesConfig).values({id:source.id+'-RULES',facilityId:source.id,version:1,rules,status:'APPROVED',active:true,checksum:rulesChecksum(validated),createdBy:source.id+'-DOCTOR',approvedBy:source.id+'-DOCTOR',approvedAt:new Date()}).onConflictDoNothing();
  for(const target of colleges.filter(c=>c.id!==source.id)){
   const hex=createHash('sha256').update(source.id+':'+target.id).digest('hex');const id=hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32);
   await conn.insert(referralRecipients).values({id,facilityId:source.id,receivingFacilityId:target.id,name:target.name+' · prototype',kind:'government_hospital',institution:target.name,department:'Referral review (prototype)',verificationReference:'Odisha DMET identity reference: https://dmet.odisha.gov.in/en/light/page/medical-colleges. Prototype route only; not institutional approval.',verifiedBy:source.id+'-DOCTOR'}).onConflictDoNothing();
  }
 }
 await mkdir('.data',{recursive:true});await writeFile(accessFile,'LOCAL PROTOTYPE ACCOUNTS ONLY. These are not hospital staff accounts.\n'+colleges.map(c=>c.username+' | '+password).join('\n')+'\nOpen Referral inbox inside your signed-in dashboard and enter these credentials. Your main session stays active.\n',{mode:0o600});
 console.log('Provisioned three labelled Odisha pitch workspaces. Credentials saved in ignored .data/referral-pitch-access.txt. No patient records created.');process.exit(0);
}
main().catch(()=>{console.error('Pitch provisioning failed. Check facility/staff provisioning and database migration.');process.exit(1);});

