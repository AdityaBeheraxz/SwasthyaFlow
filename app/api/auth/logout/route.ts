import {NextResponse} from 'next/server';
import {db} from '@/lib/db/server';
import {auditLogs} from '@/db/schema';
import {session} from '@/lib/auth';
import {appUrl} from '@/lib/runtime-config';
import {success} from '@/lib/api';
export async function POST(request:Request){const actor=await session();if(actor)await (await db()).insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'USER_SIGNED_OUT',metadata:{}});const response=request.headers.get('accept')?.includes('application/json')?success({signedOut:true}):NextResponse.redirect(appUrl(),303);response.cookies.delete('sf_session');response.cookies.set('sf_reviewer_session','',{path:'/api',maxAge:0,httpOnly:true,sameSite:'strict'});response.cookies.set('sf_referral_session','',{path:'/api/referrals',maxAge:0,httpOnly:true,sameSite:'strict'});response.headers.set('Clear-Site-Data','"cache", "storage"');response.headers.set('Cache-Control','no-store');return response;}


