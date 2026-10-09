import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import {and,desc,eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {users,auditLogs} from '@/db/schema';
export type Role='health_worker'|'nurse'|'medical_officer'|'administrator';
export type Actor={id:string;name:string;role:Role;facilityId:string|null};
const secret=()=>{const value=process.env.AUTH_SECRET;if(!value||value.length<32)throw new Error('AUTH_CONFIG_INVALID');return new TextEncoder().encode(value);};
export async function signSession(id:string,role:Role,facilityId?:string|null){return new SignJWT({role,facilityId:facilityId??null,issuedAtMs:Date.now()}).setProtectedHeader({alg:'HS256'}).setSubject(id).setIssuer('swasthyaflow').setAudience('swasthyaflow-web').setIssuedAt().setExpirationTime('30m').sign(secret());}
export async function session():Promise<Actor|null>{
 const token=(await cookies()).get('sf_session')?.value;
 if(!token)return null;
 try{
  const {payload}=await jwtVerify(token,secret(),{issuer:'swasthyaflow',audience:'swasthyaflow-web'});
  if(typeof payload.sub!=='string'||typeof payload.role!=='string')return null;
  const [user]=await (await db()).select({id:users.id,name:users.name,role:users.role,facilityId:users.facilityId,active:users.active}).from(users).where(eq(users.id,payload.sub)).limit(1);
  if(!user?.active||user.role!==payload.role||user.facilityId!==payload.facilityId||typeof payload.issuedAtMs!=='number')return null;
  const [logout]=await (await db()).select({timestamp:auditLogs.timestamp}).from(auditLogs).where(and(eq(auditLogs.userId,user.id),eq(auditLogs.action,'USER_SIGNED_OUT'))).orderBy(desc(auditLogs.timestamp)).limit(1);
  if(logout&&logout.timestamp.getTime()>=payload.issuedAtMs)return null;
  return {id:user.id,name:user.name,role:user.role as Role,facilityId:user.facilityId};
 }catch{}
 return null;
}
export function allowed(role:Role|null,roles:Role[]){return role!==null&&roles.includes(role);}
