import {createHash} from 'node:crypto';
import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {session,type Actor} from '@/lib/auth';
import {clinicalReviewerSession,signReviewer} from '@/lib/reviewer-auth';
import {db} from '@/lib/db/server';
import {users,auditLogs,facilities} from '@/db/schema';
import {failure,success,parseFailure} from '@/lib/api';
import {verifyPassword,spendPasswordCheck} from '@/lib/password';
import {consumeRateLimit,releaseRateLimit} from '@/lib/rate-limit';
import {isProductionDeployment} from '@/lib/runtime-config';
const options={httpOnly:true,sameSite:'strict' as const,secure:process.env.NODE_ENV==='production',path:'/api',maxAge:900};
export async function GET(){const owner=await session(),actor=await clinicalReviewerSession();if(!owner||!actor)return failure('UNAUTHORIZED','Staff sign-in required.',401);const [facility]=owner.facilityId?await (await db()).select({name:facilities.name}).from(facilities).where(eq(facilities.id,owner.facilityId)):[];return success({name:actor.name,role:actor.role,scoped:actor.id!==owner.id,facility:facility?.name??'Unassigned facility'});}
export async function POST(req:Request){
 const owner=await session();if(!owner?.facilityId||!['health_worker','nurse','medical_officer'].includes(owner.role))return failure('FORBIDDEN','An assigned clinical staff session is required.',403);
 if(isProductionDeployment)return failure('IDENTITY_PROVIDER_REQUIRED','Use the approved clinical identity provider for reviewer authorization.',403);
 try{const body=z.object({username:z.string().trim().toLowerCase().min(3).max(80),password:z.string().min(8).max(128)}).strict().parse(await req.json());
 const limit=await consumeRateLimit('reviewer-login:'+createHash('sha256').update(owner.id+':'+body.username).digest('hex'),5,900);if(!limit.ok)return failure('RATE_LIMITED','Too many attempts. Retry in 15 minutes.',429);
 const conn=await db(),[user]=await conn.select().from(users).where(eq(users.username,body.username));
 if(!user?.passwordHash){await spendPasswordCheck(body.password);return failure('INVALID_CREDENTIALS','Reviewer credentials are incorrect.',401);}
 if(!user.active||!await verifyPassword(body.password,user.passwordHash)||!['nurse','medical_officer'].includes(user.role))return failure('INVALID_CREDENTIALS','Authorized reviewer credentials are required.',401);
 if(user.facilityId!==owner.facilityId){const [facility]=await conn.select({name:facilities.name}).from(facilities).where(eq(facilities.id,owner.facilityId));return failure('FACILITY_MISMATCH',`This account belongs to another facility. Ask a nurse or Medical Officer assigned to ${facility?.name??'the source facility'} to authorize this review. Use receiving-hospital credentials in the Referral inbox after a referral has been sent.`,403);}
 await releaseRateLimit(limit.eventId);await conn.insert(auditLogs).values({id:crypto.randomUUID(),userId:user.id,facilityId:user.facilityId,action:'REVIEWER_WORKSPACE_OPENED',metadata:{ownerId:owner.id}});
 const response=success({role:user.role});response.cookies.set('sf_reviewer_session',await signReviewer(user as Actor,owner),options);return response;
 }catch(e){return parseFailure(e);}
}
export async function DELETE(){const owner=await session(),actor=await clinicalReviewerSession();if(owner&&actor&&actor.id!==owner.id)await (await db()).insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'REVIEWER_WORKSPACE_CLOSED',metadata:{}});const response=success({closed:true});response.cookies.set('sf_reviewer_session','',{...options,maxAge:0});return response;}
