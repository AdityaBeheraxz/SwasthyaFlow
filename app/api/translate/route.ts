import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {encounters,patients,inputs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
import {translationAdapter} from '@/lib/translation';
const schema=z.object({encounterId:z.string().min(1)}).strict();
export async function POST(req:Request){const actor=await session();if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);try{const {encounterId}=schema.parse(await req.json());const conn=await db();const [encounter]=await conn.select().from(encounters).where(eq(encounters.id,encounterId)).limit(1);if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);const [patient]=await conn.select().from(patients).where(eq(patients.id,encounter.patientId)).limit(1);if(!patient?.consentStatus)return failure('CONSENT_REQUIRED','Consent is required.',422);const [input]=await conn.select().from(inputs).where(eq(inputs.encounterId,encounterId)).limit(1);if(!input?.originalText)return failure('INPUT_MISSING','Original text is missing.',422);const result=await translationAdapter().normalize(input.originalText,(input.language==='hi'||input.language==='or')?input.language:'en');await conn.update(inputs).set({source:{...(input.source??{}),normalized:result.normalized,ambiguousSpans:result.ambiguousSpans}}).where(eq(inputs.id,input.id));return success(result);}catch(e){if(e instanceof Error&&e.message==='TRANSLATION_FAILED')return failure('TRANSLATION_FAILED','Translation unavailable. Keep the original text and request manual review.',503);return parseFailure(e);}}
