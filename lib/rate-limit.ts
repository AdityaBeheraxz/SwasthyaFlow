import 'server-only';
import {and,count,eq,gte,lt} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {rateLimitEvents} from '@/db/schema';

export async function consumeRateLimit(key:string,limit:number,windowSeconds:number){
 const conn=await db();const cutoff=new Date(Date.now()-windowSeconds*1000);
 await conn.insert(rateLimitEvents).values({id:crypto.randomUUID(),key});
 const [{value}]=await conn.select({value:count()}).from(rateLimitEvents).where(and(eq(rateLimitEvents.key,key),gte(rateLimitEvents.createdAt,cutoff)));
 if(Math.random()<.02)await conn.delete(rateLimitEvents).where(lt(rateLimitEvents.createdAt,new Date(Date.now()-86_400_000)));
 return {ok:value<=limit,retryAfter:windowSeconds};
}
