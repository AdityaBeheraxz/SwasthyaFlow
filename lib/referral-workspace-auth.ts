import {clinicalReviewerSession} from './reviewer-auth';
import 'server-only';
import {SignJWT,jwtVerify} from 'jose';
import {cookies} from 'next/headers';
import {and,eq,desc} from 'drizzle-orm';
import {session,type Actor} from './auth';
import {db} from './db/server';
import {users,auditLogs} from '@/db/schema';
const secret=()=>{const key=process.env.AUTH_SECRET;if(!key||key.length<32)throw new Error('AUTH_CONFIG_INVALID');return new TextEncoder().encode(key);};
export async function signReferralWorkspace(actor:Actor,owner:Actor){return new SignJWT({role:actor.role,facilityId:actor.facilityId,ownerId:owner.id,ownerFacilityId:owner.facilityId,issuedAtMs:Date.now()}).setProtectedHeader({alg:'HS256'}).setSubject(actor.id).setIssuer('swasthyaflow').setAudience('swasthyaflow-referral-workspace').setIssuedAt().setExpirationTime('15m').sign(secret());}
export async function referralWorkspaceSession():Promise<Actor|null>{
 const owner=await session(),token=(await cookies()).get('sf_referral_session')?.value;if(!owner?.facilityId||!token)return null;
 try{const {payload}=await jwtVerify(token,secret(),{issuer:'swasthyaflow',audience:'swasthyaflow-referral-workspace'});if(payload.ownerId!==owner.id||payload.ownerFacilityId!==owner.facilityId||typeof payload.sub!=='string'||typeof payload.issuedAtMs!=='number')return null;
 const conn=await db(),[user]=await conn.select().from(users).where(eq(users.id,payload.sub)).limit(1);
 if(!user?.active||user.role!=='medical_officer'||user.role!==payload.role||user.facilityId!==payload.facilityId)return null;
 const [closed]=await conn.select({timestamp:auditLogs.timestamp}).from(auditLogs).where(and(eq(auditLogs.userId,user.id),eq(auditLogs.action,'REFERRAL_WORKSPACE_CLOSED'))).orderBy(desc(auditLogs.timestamp)).limit(1);
 if(closed&&closed.timestamp.getTime()>=payload.issuedAtMs)return null;
 return {id:user.id,name:user.name,role:'medical_officer',facilityId:user.facilityId};
 }catch{return null;}
}
export async function referralRequestActor(req:Request){return new URL(req.url).searchParams.get('workspace')==='receiving'?referralWorkspaceSession():clinicalReviewerSession();}


