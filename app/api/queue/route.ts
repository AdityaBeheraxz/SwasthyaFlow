import { db } from '@/lib/db/server';
import { encounters, patients } from '@/db/schema';
import { eq,sql } from 'drizzle-orm';
import { session } from '@/lib/auth';
import { failure, success } from '@/lib/api';
export async function GET(){
 const actor=await session(); if(!actor)return failure('UNAUTHORIZED','Select a demo role.',401);
 const order=sql<number>`case when ${encounters.priorityFinal}='RED' then 0 when ${encounters.priorityFinal}='YELLOW' then 1 when ${encounters.priorityFinal}='GREEN' then 2 else 3 end`;
 const rows=await (await db()).select({encounter:encounters,patient:patients}).from(encounters).innerJoin(patients,eq(encounters.patientId,patients.id)).orderBy(order,encounters.createdAt).limit(100);
 return success(rows);
}
