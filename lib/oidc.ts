import 'server-only';
import * as oidc from 'openid-client';
import {EncryptJWT,jwtDecrypt} from 'jose';
import {z} from 'zod';
import type {Role} from '@/lib/auth';
import {appUrl,assertProductionConfig} from '@/lib/runtime-config';

const flowSchema=z.object({verifier:z.string().min(43),state:z.string(),nonce:z.string()});
const roles=z.enum(['health_worker','nurse','medical_officer','administrator']);
type Flow=z.infer<typeof flowSchema>;

async function encryptionKey(){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(process.env.AUTH_SECRET!));
 return new Uint8Array(digest);
}

export async function sealOidcFlow(flow:Flow){return new EncryptJWT(flow).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setIssuedAt().setExpirationTime('10m').encrypt(await encryptionKey());}
export async function openOidcFlow(value:string){const {payload}=await jwtDecrypt(value,await encryptionKey());return flowSchema.parse(payload);}

let cached:Promise<oidc.Configuration>|undefined;
export function oidcConfig(){
 assertProductionConfig();
 cached??=oidc.discovery(new URL(process.env.OIDC_ISSUER!),process.env.OIDC_CLIENT_ID!,process.env.OIDC_CLIENT_SECRET!);
 return cached;
}

export function redirectUri(){return new URL('/api/auth/callback',appUrl()).toString();}

export function mappedRole(claims:Record<string,unknown>):Role|null{
 let map:unknown;try{map=JSON.parse(process.env.OIDC_ROLE_MAP??'{}');}catch{return null;}
 const parsedMap=z.record(z.string(),roles).safeParse(map);if(!parsedMap.success)return null;
 const value=claims[process.env.OIDC_ROLE_CLAIM??'roles'];
 const values=Array.isArray(value)?value:typeof value==='string'?[value]:[];
 for(const external of values){if(typeof external==='string'&&parsedMap.data[external])return parsedMap.data[external];}
 return null;
}

export {oidc};
