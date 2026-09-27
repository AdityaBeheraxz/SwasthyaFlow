import {like,inArray} from 'drizzle-orm';
import {db} from '../lib/db/index';
import {auditLogs,encounters,inputs,patients,referrals,reports,reviews,triageNotes} from './schema';

async function main(){
 const conn=await db();
 const seededEncounterIds=Array.from({length:12},(_,index)=>`encounter-P-${1001+index}`);
 const seededPatientIds=Array.from({length:12},(_,index)=>`patient-P-${1001+index}`);
 await conn.transaction(async tx=>{
  await tx.delete(referrals).where(inArray(referrals.encounterId,seededEncounterIds));
  await tx.delete(reviews).where(inArray(reviews.encounterId,seededEncounterIds));
  await tx.delete(triageNotes).where(inArray(triageNotes.encounterId,seededEncounterIds));
  await tx.delete(reports).where(inArray(reports.encounterId,seededEncounterIds));
  await tx.delete(inputs).where(inArray(inputs.encounterId,seededEncounterIds));
  await tx.delete(encounters).where(inArray(encounters.id,seededEncounterIds));
  await tx.delete(patients).where(inArray(patients.id,seededPatientIds));
  await tx.delete(auditLogs).where(like(auditLogs.encounterId,'encounter-P-%'));
 });
 console.log('Removed the legacy synthetic patient and encounter seed records.');
}
main().catch((error:unknown)=>{console.error(error);process.exitCode=1;});
