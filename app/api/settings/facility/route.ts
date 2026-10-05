import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {facilities,auditLogs} from '@/db/schema';
import {session} from '@/lib/auth';
import {success,failure,parseFailure} from '@/lib/api';
const schema=z.object({name:z.string().trim().min(2).max(200),type:z.string().trim().min(2).max(100),location:z.string().trim().min(2).max(300),settings:z.object({legalIdentity:z.string().max(300),privacyContact:z.string().max(300),retentionDays:z.number().int().min(1).max(36500),processors:z.array(z.string().max(300)).max(30),consentNotice:z.string().max(5000),incidentContact:z.string().max(300)}).strict()}).strict();
export async function GET(){const actor=await session();if(!actor?.facilityId)return failure('UNAUTHORIZED','Facility staff sign-in required.',401);const [facility]=await (await db()).select().from(facilities).where(eq(facilities.id,actor.facilityId)).limit(1);return success(facility);}
export async function POST(request:Request){const actor=await session();if(actor?.role!=='administrator'||!actor.facilityId)return failure('FORBIDDEN','Facility administrator required.',403);try{const body=schema.parse(await request.json());const conn=await db();await conn.transaction(async tx=>{const [before]=await tx.select().from(facilities).where(eq(facilities.id,actor.facilityId!)).limit(1);await tx.update(facilities).set(body).where(eq(facilities.id,actor.facilityId!));await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'FACILITY_SETTINGS_UPDATED',metadata:{before:{name:before.name,type:before.type,location:before.location,settings:before.settings},after:body}});});return success(body);}catch(error){return parseFailure(error);}}
