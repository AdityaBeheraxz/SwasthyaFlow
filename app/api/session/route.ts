import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { users } from '@/db/schema';
import { failure, success, parseFailure } from '@/lib/api';
import { signSession, session, type Role } from '@/lib/auth';
import {isProductionDeployment} from '@/lib/runtime-config';
const roles:Record<string,Role>={'U-101':'health_worker','U-102':'nurse','U-104':'medical_officer','U-105':'administrator'};
export async function GET(){return success(await session());}
export async function POST(req:Request){try{
 if(isProductionDeployment)return failure('DEMO_LOGIN_DISABLED','Demo role switching is disabled in production.',404);
 const {userId}=z.object({userId:z.enum(['U-101','U-102','U-104','U-105'])}).parse(await req.json());
 const [user]=await (await db()).select().from(users).where(eq(users.id,userId)).limit(1);
 if(!user)return failure('USER_NOT_FOUND','Run pnpm seed to create demo users.',404);
 const token=await signSession(userId,roles[userId],user.facilityId);
 const response=success({id:user.id,role:user.role,name:user.name});
 response.cookies.set('sf_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:43200});
 return response;
}catch(e){return parseFailure(e);}}
