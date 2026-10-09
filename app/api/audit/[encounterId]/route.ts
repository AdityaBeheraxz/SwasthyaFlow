import {encounterForActor} from '@/lib/access';
import {allowed} from '@/lib/auth';
import {clinicalReviewerSession} from '@/lib/reviewer-auth';
import {failure} from '@/lib/api';
import {auditPage} from '@/lib/audit-query';
import {queryFailure} from '@/lib/record-pagination';
import {NextResponse} from 'next/server';
export async function GET(req:Request,{params}:{params:Promise<{encounterId:string}>}){
 const actor=await clinicalReviewerSession();
 if(!actor)return failure('UNAUTHORIZED','Sign in is required.',401);
 if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer','administrator']))return failure('FORBIDDEN','Authorized staff role required.',403);
 if(!actor?.facilityId)return failure('FACILITY_REQUIRED','Your account is not assigned to a facility.',403);
 const {encounterId}=await params;
 try{
  const encounter=actor.role==='administrator'?null:await encounterForActor(encounterId,actor);
  if(actor.role!=='administrator'&&!encounter)return failure('NOT_FOUND','Consented case audit unavailable.',404);
  const response=await auditPage(req,actor.facilityId,encounterId,actor.role==='medical_officer');
  // Use the same authorized case read for the audit and its current status.
  // Administrators receive the redacted governance trail without clinical context.
  return NextResponse.json({...await response.json(),case:encounter?{id:encounter.id,state:encounter.state,priorityFinal:encounter.priorityFinal}:null},{headers:response.headers});
 }catch(e){return queryFailure(e,'audit');}
}
