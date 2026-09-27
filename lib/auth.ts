import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import {isProductionDeployment} from '@/lib/runtime-config';
import {eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {users} from '@/db/schema';
export type Role='health_worker'|'nurse'|'medical_officer'|'administrator';
export type Actor={id:string;name:string;role:Role;facilityId:string|null};
const secret=()=>{const value=process.env.AUTH_SECRET;if(isProductionDeployment&&(!value||value.length<32))throw new Error('PRODUCTION_CONFIG_INVALID');return new TextEncoder().encode(value||'local-development-only-set-a-real-secret');};
export async function signSession(id:string,role:Role,facilityId?:string|null){return new SignJWT({role,facilityId:facilityId??null}).setProtectedHeader({alg:'HS256'}).setSubject(id).setIssuer('swasthyaflow').setAudience('swasthyaflow-web').setIssuedAt().setExpirationTime(isProductionDeployment?'8h':'12h').sign(secret());}
export async function session():Promise<Actor|null>{
 const token=(await cookies()).get('sf_session')?.value;
 if(!token)return null;
 try{
  const {payload}=await jwtVerify(token,secret(),{issuer:'swasthyaflow',audience:'swasthyaflow-web'});
  if(typeof payload.sub!=='string'||typeof payload.role!=='string')return null;
  const [user]=await (await db()).select({id:users.id,name:users.name,role:users.role,facilityId:users.facilityId,active:users.active}).from(users).where(eq(users.id,payload.sub)).limit(1);
  if(!user?.active||user.role!==payload.role)return null;
  return {id:user.id,name:user.name,role:user.role as Role,facilityId:user.facilityId};
 }catch{}
 return null;
}
export function allowed(role:Role|null,roles:Role[]){return role!==null&&roles.includes(role);}
