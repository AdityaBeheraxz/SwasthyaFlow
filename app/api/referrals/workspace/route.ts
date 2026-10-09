import {createHash} from 'node:crypto';
import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {session,type Actor} from '@/lib/auth';
import {signReferralWorkspace,referralWorkspaceSession} from '@/lib/referral-workspace-auth';
import {db} from '@/lib/db/server';
import {users,facilities,auditLogs} from '@/db/schema';
import {failure,success,parseFailure} from '@/lib/api';
import {consumeRateLimit,releaseRateLimit} from '@/lib/rate-limit';
import {verifyPassword,spendPasswordCheck} from '@/lib/password';
import {isProductionDeployment} from '@/lib/runtime-config';
const cookie={httpOnly:true,sameSite:'strict' as const,secure:process.env.NODE_ENV==='production',path:'/api/referrals',maxAge:900};
export async function GET(){const owner=await session();if(!owner?.facilityId)return failure('UNAUTHORIZED','Sign into your main staff dashboard first.',401);const actor=await referralWorkspaceSession();if(!actor)return success({authenticated:false});const [facility]=await (await db()).select({name:facilities.name}).from(facilities).where(eq(facilities.id,actor.facilityId!));return success({authenticated:true,name:actor.name,facility:facility?.name});}
export async function POST(req:Request){
 const owner=await session();if(!owner?.facilityId)return failure('UNAUTHORIZED','Sign into your main staff dashboard first.',401);
 if(isProductionDeployment)return failure('IDENTITY_PROVIDER_REQUIRED','Receiving workspace authentication requires the approved hospital identity provider in production.',403);
 try{const {username,password}=z.object({username:z.string().trim().toLowerCase().min(3).max(80),password:z.string().min(8).max(128)}).strict().parse(await req.json());
 const limit=await consumeRateLimit('referral-workspace-login:'+createHash('sha256').update(owner.id+':'+username).digest('hex'),5,900);if(!limit.ok)return failure('RATE_LIMITED','Too many attempts. Try again in 15 minutes.',429);
 const conn=await db(),[user]=await conn.select().from(users).where(eq(users.username,username));
 if(!user?.passwordHash){await spendPasswordCheck(password);return failure('INVALID_CREDENTIALS','Receiving doctor credentials are incorrect.',401);}
 if(!await verifyPassword(password,user.passwordHash)||!user.active||user.role!=='medical_officer'||!user.facilityId)return failure('INVALID_CREDENTIALS','Receiving doctor credentials are incorrect.',401);
 await releaseRateLimit(limit.eventId);await conn.insert(auditLogs).values({id:crypto.randomUUID(),userId:user.id,facilityId:user.facilityId,action:'REFERRAL_WORKSPACE_OPENED',metadata:{ownerId:owner.id}});
 const response=success({authenticated:true});response.cookies.set('sf_referral_session',await signReferralWorkspace(user as Actor,owner),cookie);return response;
 }catch(e){return parseFailure(e);}
}
export async function DELETE(){const actor=await referralWorkspaceSession();if(actor)await (await db()).insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'REFERRAL_WORKSPACE_CLOSED',metadata:{}});const response=success({authenticated:false});response.cookies.set('sf_referral_session','',{...cookie,maxAge:0});return response;}

