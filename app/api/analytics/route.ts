import {and,eq,gte,sql} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {encounters,reviews,processingMetrics} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {success,failure} from '@/lib/api';
export async function GET(){
 const actor=await session();if(!actor?.facilityId||!allowed(actor.role,['nurse','medical_officer','administrator']))return failure('FORBIDDEN','Facility reviewer authorization required.',403);
 const conn=await db(),since=new Date(Date.now()-30*86400000);
 const counts=await conn.select({state:encounters.state,priority:encounters.priorityFinal,count:sql<number>`count(*)::int`}).from(encounters).where(and(eq(encounters.facilityId,actor.facilityId),gte(encounters.createdAt,since))).groupBy(encounters.state,encounters.priorityFinal);
 const reviewCounts=await conn.select({reviewerId:reviews.reviewerId,decision:reviews.decision,count:sql<number>`count(*)::int`}).from(reviews).innerJoin(encounters,eq(reviews.encounterId,encounters.id)).where(and(eq(encounters.facilityId,actor.facilityId),gte(reviews.createdAt,since))).groupBy(reviews.reviewerId,reviews.decision);
 const timings=await conn.select({stage:processingMetrics.stage,count:sql<number>`count(*)::int`,failures:sql<number>`count(*) filter (where not succeeded)::int`,p50:sql<number>`percentile_cont(0.5) within group (order by duration_ms)`,p95:sql<number>`percentile_cont(0.95) within group (order by duration_ms)`,max:sql<number>`max(duration_ms)`}).from(processingMetrics).where(and(eq(processingMetrics.facilityId,actor.facilityId),gte(processingMetrics.createdAt,since))).groupBy(processingMetrics.stage);
 return success({since:since.toISOString(),counts,reviewCounts,timings,alerts:timings.filter(item=>item.failures>0||Number(item.p95)>(item.stage==='intake'?20000:15000)).map(item=>`${item.stage}: failures or p95 duration exceeds the configured workflow target`)});
}
