import {and,eq,desc,lt,or,gte,lte,ilike,ne,sql} from 'drizzle-orm';
import {z} from 'zod';
import {auditLogs,users} from '@/db/schema';
import {db} from '@/lib/db/server';
import {success} from '@/lib/api';
import {administrativeMetadata} from '@/lib/audit-privacy';
import {nextCursor,pageSize,readCursor} from './record-pagination';

export async function auditPage(req:Request,facilityId:string,encounterId?:string,detailed=false){
 const params=new URL(req.url).searchParams,limit=pageSize(params.get('limit')),cursor=readCursor(params.get('cursor'));
 const query=z.string().trim().max(100).parse(params.get('q')??'');
 const action=z.string().regex(/^[A-Z_]+$/).max(80).optional().parse(params.get('action')||undefined);
 const from=z.string().datetime({offset:true}).optional().parse(params.get('from')||undefined);
 const to=z.string().datetime({offset:true}).optional().parse(params.get('to')||undefined);
 if(from&&to&&new Date(from)>new Date(to))throw new Error('INVALID_RANGE');
 const escaped=query.replace(/[\\%_]/g,'\\$&');
 const orderTime=sql`date_trunc('milliseconds',${auditLogs.timestamp})`;
 const rows=await (await db()).select({id:auditLogs.id,userId:auditLogs.userId,actorName:users.name,encounterId:auditLogs.encounterId,action:auditLogs.action,timestamp:auditLogs.timestamp,metadata:auditLogs.metadata}).from(auditLogs).leftJoin(users,eq(users.id,auditLogs.userId)).where(and(
  eq(auditLogs.facilityId,facilityId),encounterId?eq(auditLogs.encounterId,encounterId):undefined,
  action?eq(auditLogs.action,action):undefined,
  params.get('hideAccess')==='true'?and(ne(auditLogs.action,'CASE_ACCESS_AUTHORIZED'),ne(auditLogs.action,'REFERRAL_INBOX_ACCESSED')):undefined,
  query?or(ilike(auditLogs.action,`%${escaped}%`),ilike(sql`replace(${auditLogs.action}, '_', ' ')`,`%${escaped}%`),ilike(auditLogs.userId,`%${escaped}%`),ilike(users.name,`%${escaped}%`),ilike(auditLogs.encounterId,`%${escaped}%`)):undefined,
  from?gte(auditLogs.timestamp,new Date(from)):undefined,to?lte(auditLogs.timestamp,new Date(to)):undefined,
  cursor?or(lt(orderTime,sql`${cursor.at}::timestamptz`),and(eq(orderTime,sql`${cursor.at}::timestamptz`),lt(auditLogs.id,cursor.id))):undefined
 )).orderBy(desc(orderTime),desc(auditLogs.id)).limit(limit+1);
 const page=rows.slice(0,limit),response=success(detailed?page:page.map(e=>({...e,metadata:administrativeMetadata(e.metadata)})));
 const last=page.at(-1);if(rows.length>limit&&last)response.headers.set('X-Next-Cursor',nextCursor(last.timestamp,last.id));
 return response;
}
