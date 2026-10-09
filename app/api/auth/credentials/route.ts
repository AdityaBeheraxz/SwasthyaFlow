import {createHash} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {z} from 'zod';
import {db} from '@/lib/db/server';
import {auditLogs,users} from '@/db/schema';
import {failure,parseFailure,success} from '@/lib/api';
import {signSession,type Role} from '@/lib/auth';
import {consumeRateLimit,releaseRateLimit} from '@/lib/rate-limit';
import {spendPasswordCheck,verifyPassword} from '@/lib/password';
import {isProductionDeployment} from '@/lib/runtime-config';

const schema=z.object({username:z.string().trim().toLowerCase().min(3).max(80),password:z.string().min(8).max(128)}).strict();
const roles=new Set<Role>(['health_worker','nurse','medical_officer','administrator']);

export async function POST(req:Request){
 if(isProductionDeployment)return failure('CREDENTIAL_LOGIN_DISABLED','Use the hospital identity provider.',404);
 try{
  const body=schema.parse(await req.json());
  const ip=(req.headers.get('x-forwarded-for')?.split(',')[0]??req.headers.get('x-real-ip')??'local').trim();
  const identity=createHash('sha256').update(`${ip}:${body.username}`).digest('hex');
  const limit=await consumeRateLimit(`login:${identity}`,5,900);
  if(!limit.ok)return failure('LOGIN_RATE_LIMITED','Too many sign-in attempts. Try again in 15 minutes.',429);
  const conn=await db();
  const [user]=await conn.select().from(users).where(eq(users.username,body.username)).limit(1);
  if(!user?.passwordHash){await spendPasswordCheck(body.password);return failure('INVALID_CREDENTIALS','Username or password is incorrect.',401);}
  if(!user.active||!roles.has(user.role as Role)||!await verifyPassword(body.password,user.passwordHash))return failure('INVALID_CREDENTIALS','Username or password is incorrect.',401);
  await releaseRateLimit(limit.eventId);
  const loginAt=new Date();
  await conn.transaction(async tx=>{
   await tx.update(users).set({lastLoginAt:loginAt}).where(eq(users.id,user.id));
   await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:user.id,facilityId:user.facilityId,action:'USER_SIGNED_IN',metadata:{provider:'local_credentials'}});
  });
  const response=success({id:user.id,name:user.name,role:user.role});
  response.cookies.set('sf_session',await signSession(user.id,user.role as Role,user.facilityId),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:1800});
  return response;
 }catch(error){return parseFailure(error);}
}
