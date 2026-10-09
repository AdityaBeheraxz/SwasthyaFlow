import {session,allowed} from '@/lib/auth';
import {failure} from '@/lib/api';
import {auditPage} from '@/lib/audit-query';
import {queryFailure} from '@/lib/record-pagination';
export async function GET(req:Request){
 const actor=await session();
 if(!actor)return failure('UNAUTHORIZED','Sign in is required.',401);
 if(!allowed(actor?.role??null,['administrator','medical_officer','nurse','health_worker']))return failure('FORBIDDEN','Authorized staff role required.',403);
 if(!actor?.facilityId)return failure('FACILITY_REQUIRED','Your account is not assigned to a facility.',403);
 try{return await auditPage(req,actor.facilityId);}catch(e){return queryFailure(e,'audit');}
}
