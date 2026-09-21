import {and,eq,desc} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {auditLogs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success} from '@/lib/api';
export async function GET(_req:Request,{params}:{params:Promise<{encounterId:string}>}){const actor=await session();if(!allowed(actor?.role??null,['nurse','medical_officer','administrator']))return failure('FORBIDDEN','Reviewer role required.',403);if(!actor?.facilityId)return failure('FACILITY_REQUIRED','Your account is not assigned to a facility.',403);const {encounterId}=await params;const conn=await db();const events=await conn.select().from(auditLogs).where(and(eq(auditLogs.encounterId,encounterId),eq(auditLogs.facilityId,actor.facilityId))).orderBy(desc(auditLogs.timestamp));if(!events.length)return failure('NOT_FOUND','Audit events not found.',404);return success(events);}
