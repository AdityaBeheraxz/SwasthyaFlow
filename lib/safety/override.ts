import { z } from 'zod';
import type {Priority} from './resolve';
export const overrideSchema = z.object({encounterId:z.string().min(1), newPriority:z.enum(['RED','YELLOW','GREEN']), reason:z.string().trim().min(10)});
export function authorizeOverride(role:string, previous:Priority, next:Priority, reason:string):{ok:true}|{ok:false;status:403|422;code:string} {
  if (role!=='medical_officer') return {ok:false,status:403,code:'FORBIDDEN'};
  if (previous===next) return {ok:false,status:422,code:'NO_PRIORITY_CHANGE'};

  if (reason.trim().length<10) return {ok:false,status:422,code:'OVERRIDE_REASON_REQUIRED'};
  return {ok:true};
}
export function makeOverrideAudit(previous:Priority,next:Priority,reviewerId:string,reason:string,timestamp:Date){
 return {action:'RISK_OVERRIDE' as const,metadata:{previous_priority:previous,new_priority:next,reviewer_id:reviewerId,reason:reason.trim(),timestamp:timestamp.toISOString()}};
}

