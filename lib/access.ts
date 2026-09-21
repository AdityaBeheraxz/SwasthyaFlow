import 'server-only';
import {and,eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {encounters,patients} from '@/db/schema';
import type {Actor} from '@/lib/auth';

export async function encounterForActor(id:string,actor:Actor){
 if(!actor.facilityId)return null;
 const [row]=await (await db()).select().from(encounters).where(and(eq(encounters.id,id),eq(encounters.facilityId,actor.facilityId))).limit(1);
 return row??null;
}

export async function patientForActor(id:string,actor:Actor){
 if(!actor.facilityId)return null;
 const [row]=await (await db()).select().from(patients).where(and(eq(patients.id,id),eq(patients.facilityId,actor.facilityId))).limit(1);
 return row??null;
}
