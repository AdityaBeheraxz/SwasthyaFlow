import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { encounters, patients, inputs, reports, triageNotes, reviews, referrals } from '@/db/schema';
import { session } from '@/lib/auth';
import { failure, success } from '@/lib/api';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 if(!await session())return failure('UNAUTHORIZED','Select a demo role.',401);
 const {id}=await params; const conn=await db();
 const [encounter]=await conn.select().from(encounters).where(eq(encounters.id,id)).limit(1);
 if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);
 const [[patient],allInputs,allReports,[note],allReviews,allReferrals]=await Promise.all([
  conn.select().from(patients).where(eq(patients.id,encounter.patientId)).limit(1),
  conn.select().from(inputs).where(eq(inputs.encounterId,id)),
  conn.select().from(reports).where(eq(reports.encounterId,id)),
  conn.select().from(triageNotes).where(eq(triageNotes.encounterId,id)).limit(1),
  conn.select().from(reviews).where(eq(reviews.encounterId,id)),
  conn.select().from(referrals).where(eq(referrals.encounterId,id))
 ]);
 return success({encounter,patient,inputs:allInputs,reports:allReports,note:note??null,reviews:allReviews,referrals:allReferrals});
}
