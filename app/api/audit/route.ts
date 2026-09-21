import {desc,eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {auditLogs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success} from '@/lib/api';
export async function GET(){const actor=await session();if(!allowed(actor?.role??null,['administrator','medical_officer']))return failure('FORBIDDEN','Administrator or Medical Officer role required.',403);if(!actor?.facilityId)return failure('FACILITY_REQUIRED','Your account is not assigned to a facility.',403);return success(await (await db()).select({id:auditLogs.id,userId:auditLogs.userId,encounterId:auditLogs.encounterId,action:auditLogs.action,timestamp:auditLogs.timestamp,metadata:auditLogs.metadata}).from(auditLogs).where(eq(auditLogs.facilityId,actor.facilityId)).orderBy(desc(auditLogs.timestamp)).limit(100));}
