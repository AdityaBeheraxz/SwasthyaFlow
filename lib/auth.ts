import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import {isProductionDeployment} from '@/lib/runtime-config';
export type Role='health_worker'|'nurse'|'medical_officer'|'administrator';
export type Actor={id:string;role:Role;facilityId:string|null};
const secret=()=>{const value=process.env.AUTH_SECRET;if(isProductionDeployment&&(!value||value.length<32))throw new Error('PRODUCTION_CONFIG_INVALID');return new TextEncoder().encode(value||'demo-only-please-set-auth-secret-before-deployment');};
export async function signSession(id:string,role:Role,facilityId?:string|null){return new SignJWT({role,facilityId:facilityId??null}).setProtectedHeader({alg:'HS256'}).setSubject(id).setIssuer('swasthyaflow').setAudience('swasthyaflow-web').setIssuedAt().setExpirationTime(isProductionDeployment?'8h':'12h').sign(secret());}
export async function session():Promise<Actor|null>{
 const token=(await cookies()).get('sf_session')?.value;
 if(!token)return null;
 try{const {payload}=await jwtVerify(token,secret(),{issuer:'swasthyaflow',audience:'swasthyaflow-web'}); if(typeof payload.sub==='string'&&typeof payload.role==='string')return {id:payload.sub,role:payload.role as Role,facilityId:typeof payload.facilityId==='string'?payload.facilityId:null};}catch{}
 return null;
}
export function allowed(role:Role|null,roles:Role[]){return role!==null&&roles.includes(role);}
