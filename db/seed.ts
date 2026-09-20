import { db } from '../lib/db/index';
import { facilities, users, patients, encounters, inputs, reports, triageNotes, rulesConfig } from './schema';
import { evaluateRules } from '../lib/safety/rules';
import { resolvePriority } from '../lib/safety/resolve';
import rules from '../lib/safety/rules.default.json';

const examples = [
 ['P-1001',28,'or','ମୋତେ ଦୁଇ ଦିନ ଧରି ହାଲୁକା ମୁଣ୍ଡବିନ୍ଧା ହେଉଛି।',['headache'],2],
 ['P-1002',46,'hi','मुझे चार दिन से बुखार है।',['fever'],4],
 ['P-1003',62,'or','ମୋତେ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହେଉଛି।',['difficulty breathing'],1],
 ['P-1004',34,'en','I have had a mild cough for two days.',['cough'],2],
 ['P-1005',51,'hi','मुझे तेज दर्द है।',['severe pain'],1],
 ['P-1006',39,'en','I fainted this morning.',['fainting'],1],
 ['P-1007',57,'hi','सीने में दर्द है और सांस फूल रही है।',['chest discomfort','breathlessness'],1],
 ['P-1008',25,'or','ମୋତେ ଜ୍ୱର ହେଉଛି।',['fever'],2],
 ['P-1009',44,'en','I have had a mild headache.',['headache'],1],
 ['P-1010',36,'hi','तीन दिन से खांसी है।',['cough'],3],
 ['P-1011',68,'en','I have severe pain today.',['severe pain'],1],
 ['P-1012',31,'or','ମୋର କାଶ ହେଉଛି।',['cough'],2]
] as const;

async function main(){
 const conn=await db();
 await conn.insert(facilities).values({id:'F-001',name:'SwasthyaFlow Demo PHC',type:'Primary Health Centre',location:'Synthetic demonstration facility'}).onConflictDoNothing();
 for(const user of [
  {id:'U-101',name:'Health Worker',role:'health_worker'},
  {id:'U-102',name:'Nurse',role:'nurse'},
  {id:'U-104',name:'Medical Officer',role:'medical_officer'},
  {id:'U-105',name:'Administrator',role:'administrator'}
 ]) await conn.insert(users).values({...user,facilityId:'F-001'}).onConflictDoNothing();
 await conn.insert(rulesConfig).values({id:'DEFAULT-1',version:1,rules,active:true}).onConflictDoNothing();
 for(const [id,age,language,original,symptoms,days] of examples){
  const patientId=`patient-${id}`; const encounterId=`encounter-${id}`;
  const hb=id==='P-1002'?9.2:undefined;
  const fired=evaluateRules({symptoms:[...symptoms],durationDays:days,hb});
  const priority=resolvePriority({valid:true,priorities:fired.length?fired.map(rule=>rule.priority):['GREEN']});
  await conn.insert(patients).values({id:patientId,anonymousPatientId:id,age,preferredLanguage:language,consentStatus:true}).onConflictDoNothing();
  await conn.insert(encounters).values({id:encounterId,patientId,chiefComplaint:original,symptoms:[...symptoms],timeline:[`Day ${days}: patient-reported symptoms`],priority,priorityFinal:priority,prioritySource:'RULES',status:'TRIAGED',state:'TRIAGED',facilityId:'F-001',createdAt:new Date(Date.now()-(Number(id.slice(2))-1000)*7*60000)}).onConflictDoNothing();
  await conn.insert(inputs).values({id:`input-${id}`,encounterId,type:language==='en'?'text':'voice',originalText:original,transcript:original,language,source:{kind:'synthetic_transcript'}}).onConflictDoNothing();
  if(id==='P-1002'||id==='P-1003'||id==='P-1004') await conn.insert(reports).values({id:`report-${id}`,encounterId,fileUrl:null,rawOcr:id==='P-1002'?'Haemoglobin 9.2 g/dL':'Synthetic report attached',extractedData:hb?{hb:9.2}:{},qualityStatus:'GOOD',ocrTokens:hb?[{text:'9.2 g/dL',confidence:0.93,bbox:[80,110,155,130]}]:[]}).onConflictDoNothing();
  await conn.insert(triageNotes).values({id:`triage-${id}`,encounterId,summary:`Patient reports ${symptoms.join(' and ')} for ${days} day${days===1?'':'s'}.`,missingInformation:['Relevant history not provided'],followUpQuestions:['When did the concern first begin?','Has it changed since it began?'],riskSignals:fired,priority,fieldSources:{summary:`input-${id}`,riskSignals:fired.map(rule=>rule.ruleId)}}).onConflictDoNothing();
 }
 console.log('Seeded 12 synthetic encounters');
}
main().catch((error:unknown)=>{console.error(error);process.exitCode=1;});
