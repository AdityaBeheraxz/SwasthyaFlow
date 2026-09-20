import {desc} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {auditLogs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success} from '@/lib/api';
export async function GET(){const actor=await session();if(!allowed(actor?.role??null,['administrator','medical_officer']))return failure('FORBIDDEN','Administrator or Medical Officer role required.',403);return success(await (await db()).select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(100));}
