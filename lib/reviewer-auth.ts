import 'server-only';
import {SignJWT,jwtVerify} from 'jose';
import {cookies} from 'next/headers';
import {and,eq,desc} from 'drizzle-orm';
import {db} from './db/server';
import {session,type Actor} from './auth';
import {users,auditLogs} from '@/db/schema';
const secret=()=>{const value=process.env.AUTH_SECRET;if(!value||value.length<32)throw new Error('AUTH_CONFIG_INVALID');return new TextEncoder().encode(value);};
export async function signReviewer(actor:Actor,owner:Actor){return new SignJWT({facilityId:actor.facilityId,role:actor.role,ownerId:owner.id,ownerRole:owner.role,issuedAtMs:Date.now()}).setProtectedHeader({alg:'HS256'}).setSubject(actor.id).setIssuer('swasthyaflow').setAudience('swasthyaflow-clinical-review').setIssuedAt().setExpirationTime('15m').sign(secret());}
export async function clinicalReviewerSession():Promise<Actor|null>{
 const owner=await session();if(!owner)return null;
 const token=(await cookies()).get('sf_reviewer_session')?.value;
 if(!owner.facilityId||owner.role==='administrator'||!token)return owner;
 try{const {payload}=await jwtVerify(token,secret(),{issuer:'swasthyaflow',audience:'swasthyaflow-clinical-review'});
 if(payload.ownerId!==owner.id||payload.ownerRole!==owner.role||payload.facilityId!==owner.facilityId||typeof payload.sub!=='string'||typeof payload.issuedAtMs!=='number')return owner;
 const conn=await db(),[user]=await conn.select().from(users).where(eq(users.id,payload.sub));
 if(!user?.active||!['nurse','medical_officer'].includes(user.role)||user.role!==payload.role||user.facilityId!==owner.facilityId)return owner;
 const [closed]=await conn.select({timestamp:auditLogs.timestamp}).from(auditLogs).where(and(eq(auditLogs.userId,user.id),eq(auditLogs.action,'REVIEWER_WORKSPACE_CLOSED'))).orderBy(desc(auditLogs.timestamp)).limit(1);
 const [logout]=await conn.select({timestamp:auditLogs.timestamp}).from(auditLogs).where(and(eq(auditLogs.userId,user.id),eq(auditLogs.action,'USER_SIGNED_OUT'))).orderBy(desc(auditLogs.timestamp)).limit(1);
 if([closed,logout].some(e=>e&&e.timestamp.getTime()>=Number(payload.issuedAtMs)))return owner;
 return {id:user.id,name:user.name,role:user.role as Actor['role'],facilityId:user.facilityId};
 }catch{return owner;}
}
