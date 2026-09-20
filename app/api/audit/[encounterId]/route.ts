import {eq,desc} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {auditLogs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success} from '@/lib/api';
export async function GET(_req:Request,{params}:{params:Promise<{encounterId:string}>}){const actor=await session();if(!allowed(actor?.role??null,['nurse','medical_officer','administrator']))return failure('FORBIDDEN','Reviewer role required.',403);const {encounterId}=await params;return success(await (await db()).select().from(auditLogs).where(eq(auditLogs.encounterId,encounterId)).orderBy(desc(auditLogs.timestamp)));}
