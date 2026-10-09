import {NextRequest,NextResponse} from 'next/server';
import {eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {users,facilities,auditLogs} from '@/db/schema';
import {signSession} from '@/lib/auth';
import {appUrl,isProductionDeployment} from '@/lib/runtime-config';
import {mappedRole,oidc,oidcConfig,openOidcFlow,redirectUri} from '@/lib/oidc';
import {failure} from '@/lib/api';

export async function GET(request:NextRequest){
 if(!isProductionDeployment)return failure('OIDC_DISABLED','OIDC sign-in is enabled only in production mode.',404);
 try{
  const sealed=request.cookies.get('sf_oidc_flow')?.value;if(!sealed)return failure('AUTH_FLOW_EXPIRED','Sign-in expired. Start again.',401);
  const flow=await openOidcFlow(sealed);
  const current=new URL(redirectUri());current.search=request.nextUrl.search;
  const tokens=await oidc.authorizationCodeGrant(await oidcConfig(),current,{pkceCodeVerifier:flow.verifier,expectedState:flow.state,expectedNonce:flow.nonce,idTokenExpected:true});
  const claims=tokens.claims();if(!claims?.sub)return failure('AUTH_CLAIMS_INVALID','Identity claims are incomplete.',403);
  const role=mappedRole(claims as Record<string,unknown>);if(!role)return failure('AUTH_ROLE_DENIED','No authorized clinical role was assigned.',403);
  const facilityId=process.env.OIDC_FACILITY_ID!;
  const conn=await db();const [facility]=await conn.select({id:facilities.id}).from(facilities).where(eq(facilities.id,facilityId)).limit(1);if(!facility)return failure('AUTH_FACILITY_DENIED','The assigned facility is not configured.',403);
  const id=`oidc:${claims.sub}`;const name=typeof claims.name==='string'?claims.name:'Authorized user';
  await conn.transaction(async tx=>{await tx.insert(users).values({id,name,role,facilityId}).onConflictDoUpdate({target:users.id,set:{name,role,facilityId}});await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:id,action:'USER_SIGNED_IN',metadata:{provider:'oidc'}});});
  const response=NextResponse.redirect(appUrl());response.cookies.set('sf_session',await signSession(id,role,facilityId),{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:1800});response.cookies.delete('sf_oidc_flow');return response;
 }catch{return failure('AUTH_FAILED','Secure sign-in failed. Start again.',401);}
}
