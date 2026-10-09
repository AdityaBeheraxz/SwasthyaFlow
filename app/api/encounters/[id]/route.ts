import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { patients, inputs, reports, triageNotes, reviews } from '@/db/schema';
import { session } from '@/lib/auth';
import { failure, success } from '@/lib/api';
import {encounterForActor} from '@/lib/access';
import {canReadClinicalCase} from '@/lib/privacy-policy';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await session();if(!actor)return failure('UNAUTHORIZED','Sign in is required.',401);if(!actor.facilityId)return failure('FACILITY_REQUIRED','Your account is not assigned to a facility.',403);
 if(!canReadClinicalCase(actor.role))return failure('FORBIDDEN','Clinical staff access required.',403);
 const {id}=await params; const conn=await db();
 const encounter=await encounterForActor(id,actor);
 if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);
 const [[patient],allInputs,allReports,[note],allReviews]=await Promise.all([
  conn.select().from(patients).where(eq(patients.id,encounter.patientId)).limit(1),
  conn.select().from(inputs).where(eq(inputs.encounterId,id)),
  conn.select().from(reports).where(eq(reports.encounterId,id)),
  conn.select().from(triageNotes).where(eq(triageNotes.encounterId,id)).limit(1),
  conn.select().from(reviews).where(eq(reviews.encounterId,id))
 ]);
 return success({encounter,patient,inputs:allInputs,reports:allReports,note:note??null,reviews:allReviews,referrals:[]});
}
