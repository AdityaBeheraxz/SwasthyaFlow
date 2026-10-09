import {and,asc,eq,exists,ilike,inArray,ne,notInArray,or,sql} from 'drizzle-orm';
import {z} from 'zod';
import {db} from '@/lib/db/server';
import {session} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
import {canReadClinicalCase} from '@/lib/privacy-policy';
import {encounters,patients,referrals,referralDeliveries} from '@/db/schema';

const query=z.object({view:z.enum(['ready','review','existing','all']).default('ready'),search:z.string().trim().max(80).default(''),page:z.coerce.number().int().min(0).max(10000).default(0)});
async function worklist(request:Request,fromBody:boolean){
 const actor=await session();
 if(!actor)return failure('UNAUTHORIZED','Staff sign-in required.',401);
 if(!actor.facilityId||!canReadClinicalCase(actor.role))return failure('FORBIDDEN','Clinical staff access required.',403);
 try{
  const {view,search,page}=query.parse(fromBody?await request.json():Object.fromEntries(new URL(request.url).searchParams));
  const conn=await db();
  const hasReferral=exists(conn.select({id:referrals.id}).from(referrals).where(and(eq(referrals.encounterId,encounters.id),sql`${referrals.approvedBy} is not null`)));
  const ready=['APPROVED','REFERRAL_GENERATED'];
  const rows=await conn.select({
   encounter:{id:encounters.id,state:encounters.state,priority:encounters.priorityFinal,createdAt:encounters.createdAt},
   patient:{reference:patients.anonymousPatientId,name:patients.name,age:patients.age,language:patients.preferredLanguage},
   referralCount:sql<number>`(select count(*)::int from ${referrals} where ${referrals.encounterId}=${encounters.id} and ${referrals.approvedBy} is not null)`,
   deliveryStatus:sql<string|null>`(select ${referrals.deliveryStatus} from ${referrals} where ${referrals.encounterId}=${encounters.id} and ${referrals.approvedBy} is not null order by ${referrals.createdAt} desc, ${referrals.id} desc limit 1)`,
   decision:sql<string|null>`(select ${referralDeliveries.decision} from ${referrals} left join ${referralDeliveries} on ${referralDeliveries.id}=${referrals.id} where ${referrals.encounterId}=${encounters.id} and ${referrals.approvedBy} is not null order by ${referrals.createdAt} desc, ${referrals.id} desc limit 1)`,
  }).from(encounters).innerJoin(patients,eq(patients.id,encounters.patientId)).where(and(
   eq(encounters.facilityId,actor.facilityId),eq(patients.facilityId,actor.facilityId),eq(patients.consentStatus,true),
   view==='ready'?inArray(encounters.state,ready):view==='review'?and(notInArray(encounters.state,ready),ne(encounters.state,'COMPLETED')):view==='existing'?hasReferral:ne(encounters.state,'COMPLETED'),
   search?or(ilike(patients.name,'%'+search+'%'),ilike(patients.anonymousPatientId,'%'+search+'%')):undefined,
  )).orderBy(sql`case when ${encounters.priorityFinal}='RED' then 0 when ${encounters.priorityFinal}='YELLOW' then 1 when ${encounters.priorityFinal}='GREEN' then 2 else 3 end`,asc(encounters.createdAt),asc(encounters.id)).limit(50).offset(page*50);
  return success(rows);
 }catch(error){return parseFailure(error);}
}
export async function GET(request:Request){return worklist(request,false);}
export async function POST(request:Request){return worklist(request,true);}
