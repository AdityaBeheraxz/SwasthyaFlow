import {and,eq,lt} from 'drizzle-orm';
import {db} from '../lib/db/index';
import {auditLogs,encounters,inputs,patients,referrals,reports,reviews,triageNotes,facilities,processingMetrics} from './schema';
import {objectStorage,reportStorageKey} from '../lib/storage';

async function removeExpired(encounter:typeof encounters.$inferSelect){
 const conn=await db();
 const [allReports,allInputs]=await Promise.all([conn.select().from(reports).where(eq(reports.encounterId,encounter.id)),conn.select().from(inputs).where(eq(inputs.encounterId,encounter.id))]);
 const keys=[...allReports.flatMap(report=>report.fileUrl?[reportStorageKey(report.fileUrl)]:[]),...allInputs.flatMap(input=>typeof input.source?.audioId==='string'?[`audio/${input.source.audioId}.webm`]:[])];
 for(const key of keys)await objectStorage().delete(key);
 await conn.transaction(async tx=>{
  await tx.delete(referrals).where(eq(referrals.encounterId,encounter.id));
  await tx.delete(reviews).where(eq(reviews.encounterId,encounter.id));
  await tx.delete(triageNotes).where(eq(triageNotes.encounterId,encounter.id));
  await tx.delete(reports).where(eq(reports.encounterId,encounter.id));
  await tx.delete(inputs).where(eq(inputs.encounterId,encounter.id));
  await tx.delete(encounters).where(eq(encounters.id,encounter.id));
  const other=await tx.select({id:encounters.id}).from(encounters).where(eq(encounters.patientId,encounter.patientId)).limit(1);
  if(!other.length)await tx.delete(patients).where(eq(patients.id,encounter.patientId));
  await tx.insert(auditLogs).values({id:crypto.randomUUID(),encounterId:encounter.id,facilityId:encounter.facilityId,action:'RETENTION_PURGE',metadata:{clinical_data_removed:true}});
 });
}

async function main(){
 const days=Number(process.env.DATA_RETENTION_DAYS);
 if(!Number.isInteger(days)||days<1)throw new Error('DATA_RETENTION_DAYS must be a positive integer');
 const conn=await db();
 const allFacilities=await conn.select().from(facilities);
 const expired:(typeof encounters.$inferSelect)[]=[];
 for(const facility of allFacilities){
  const configured=Number(facility.settings.retentionDays),effective=Number.isInteger(configured)&&configured>0?configured:days;
  const cutoff=new Date(Date.now()-effective*86400000);
  expired.push(...await conn.select().from(encounters).where(and(eq(encounters.facilityId,facility.id),lt(encounters.createdAt,cutoff))));
  await conn.delete(processingMetrics).where(and(eq(processingMetrics.facilityId,facility.id),lt(processingMetrics.createdAt,cutoff)));
 }
 let removed=0;
 for(const encounter of expired){try{await removeExpired(encounter);removed++;}catch(error){console.error(`Retention purge failed for ${encounter.id}`,error);process.exitCode=1;}}
 console.log(`Retention purge complete: ${removed}/${expired.length} encounters removed`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
