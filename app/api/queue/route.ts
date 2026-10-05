import { db } from '@/lib/db/server';
import { encounters, patients,inputs } from '@/db/schema';
import { and,asc,desc,eq,exists,sql } from 'drizzle-orm';
import { session } from '@/lib/auth';
import { failure, success } from '@/lib/api';
export async function GET(request:Request){
 const actor=await session(); if(!actor)return failure('UNAUTHORIZED','Sign in with an authorized staff account.',401);
 if(!actor.facilityId)return failure('FACILITY_REQUIRED','Your account is not assigned to a facility.',403);
 const order=sql<number>`case when ${encounters.priorityFinal}='RED' then 0 when ${encounters.priorityFinal}='YELLOW' then 1 when ${encounters.priorityFinal}='GREEN' then 2 else 3 end`;
 const parameters=new URL(request.url).searchParams;const conn=await db();
 const priority=parameters.get('priority'),language=parameters.get('language'),state=parameters.get('state'),inputType=parameters.get('inputType');
 const page=Math.max(0,Math.min(10000,Math.floor(Number(parameters.get('page')))||0));
 const rows=await conn.select({encounter:encounters,patient:patients,inputType:sql<string>`(select type from inputs where encounter_id = ${encounters.id} order by created_at limit 1)`}).from(encounters).innerJoin(patients,eq(encounters.patientId,patients.id)).where(and(eq(encounters.facilityId,actor.facilityId),priority&&priority!=='ALL'?eq(encounters.priorityFinal,priority):undefined,language&&language!=='ALL'?eq(patients.preferredLanguage,language):undefined,state&&state!=='ALL'?eq(encounters.state,state):undefined,inputType&&inputType!=='ALL'?exists(conn.select({id:inputs.id}).from(inputs).where(and(eq(inputs.encounterId,encounters.id),eq(inputs.type,inputType)))):undefined)).orderBy(order,parameters.get('sort')==='newest'?desc(encounters.createdAt):asc(encounters.createdAt)).limit(50).offset(page*50);
 return success(rows);
}
