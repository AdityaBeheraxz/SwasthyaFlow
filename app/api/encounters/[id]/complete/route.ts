import {eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {encounters,reviews,auditLogs} from '@/db/schema';
import {session} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
import {transition,type EncounterState} from '@/lib/state';
import {encounterForActor} from '@/lib/access';
export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){const actor=await session();if(actor?.role!=='medical_officer')return failure('FORBIDDEN','Medical Officer role required.',403);try{const {id}=await params;const conn=await db();const encounter=await encounterForActor(id,actor);if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);const [review]=await conn.select().from(reviews).where(eq(reviews.encounterId,id)).limit(1);try{transition(encounter.state as EncounterState,'COMPLETED',true,Boolean(review));}catch{return failure('REVIEW_REQUIRED','A prior review action and approved or escalated state are required.',422);}await conn.transaction(async tx=>{await tx.update(encounters).set({state:'COMPLETED',status:'COMPLETED'}).where(eq(encounters.id,id));await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,encounterId:id,action:'ENCOUNTER_COMPLETED',metadata:{previous_state:encounter.state}});});return success({state:'COMPLETED'});}catch(e){return parseFailure(e);}}
