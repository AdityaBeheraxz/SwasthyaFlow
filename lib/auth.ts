import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
export type Role='health_worker'|'nurse'|'medical_officer'|'administrator';
const secret=()=>new TextEncoder().encode(process.env.AUTH_SECRET || 'demo-only-please-set-auth-secret-before-deployment');
export async function signSession(id:string,role:Role){return new SignJWT({role}).setProtectedHeader({alg:'HS256'}).setSubject(id).setIssuedAt().setExpirationTime('12h').sign(secret());}
export async function session():Promise<{id:string;role:Role}|null>{
 const token=(await cookies()).get('sf_session')?.value;
 if(!token)return null;
 try{const {payload}=await jwtVerify(token,secret()); if(typeof payload.sub==='string'&&typeof payload.role==='string')return {id:payload.sub,role:payload.role as Role};}catch{}
 return null;
}
export function allowed(role:Role|null,roles:Role[]){return role!==null&&roles.includes(role);}
