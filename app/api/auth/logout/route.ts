import {NextResponse} from 'next/server';
import {db} from '@/lib/db/server';
import {auditLogs} from '@/db/schema';
import {session} from '@/lib/auth';
import {appUrl} from '@/lib/runtime-config';
export async function POST(){const actor=await session();if(actor)await (await db()).insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'USER_SIGNED_OUT',metadata:{}}).catch(()=>undefined);const response=NextResponse.redirect(appUrl(),303);response.cookies.delete('sf_session');return response;}
