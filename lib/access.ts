import 'server-only';
import {and,eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {encounters,patients,auditLogs} from '@/db/schema';
import type {Actor} from '@/lib/auth';
import {canReadClinicalCase} from './privacy-policy';

export async function encounterForActor(id:string,actor:Actor){
 if(!actor.facilityId||!canReadClinicalCase(actor.role))return null;
 const [row]=await (await db()).select().from(encounters).where(and(eq(encounters.id,id),eq(encounters.facilityId,actor.facilityId))).limit(1);
 if(!row)return null;
 const [patient]=await (await db()).select({consent:patients.consentStatus}).from(patients).where(and(eq(patients.id,row.patientId),eq(patients.facilityId,actor.facilityId))).limit(1);
 if(!patient?.consent)return null;
 await (await db()).insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,encounterId:id,facilityId:actor.facilityId,action:'CASE_ACCESS_AUTHORIZED',metadata:{role:actor.role}});
 return row;
}

export async function patientForActor(id:string,actor:Actor){
 if(!actor.facilityId||!canReadClinicalCase(actor.role))return null;
 const [row]=await (await db()).select().from(patients).where(and(eq(patients.id,id),eq(patients.facilityId,actor.facilityId))).limit(1);
 return row??null;
}
