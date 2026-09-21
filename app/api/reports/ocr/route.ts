import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {reports,auditLogs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
import {consumeRateLimit} from '@/lib/rate-limit';
import {ocrAdapter} from '@/lib/ocr';
import {encounterForActor} from '@/lib/access';
import {objectStorage,reportStorageKey} from '@/lib/storage';
const schema=z.union([z.object({encounterId:z.string().min(1),rawText:z.string().trim().min(1)}).strict(),z.object({reportId:z.string().uuid()}).strict()]);
export async function POST(req:Request){
 const actor=await session();if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);const rate=await consumeRateLimit(`${actor!.id}:ocr`,20,60);if(!rate.ok)return failure('RATE_LIMITED','Too many processing requests. Retry shortly.',429);
 try{
  const body=schema.parse(await req.json());const conn=await db();
  if('rawText' in body){
   const encounter=await encounterForActor(body.encounterId,actor!);
   if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);
   const hb=body.rawText.match(/(?:Hb|Haemoglobin|Hemoglobin)\s*[: ]\s*(\d+(?:\.\d+)?)/i);
   const tokens=hb?[{text:hb[1],confidence:0.93,bbox:[0,0,0,0]}]:[];
   await conn.transaction(async tx=>{await tx.insert(reports).values({id:crypto.randomUUID(),encounterId:body.encounterId,rawOcr:body.rawText,extractedData:hb?{hb:Number(hb[1])}:{},qualityStatus:'TEXT_SUPPLIED',ocrTokens:tokens});await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:body.encounterId,action:'REPORT_TEXT_CAPTURED',metadata:{quality:'TEXT_SUPPLIED'}});});
   return success({rawText:body.rawText,tokens});
  }
  const [report]=await conn.select().from(reports).where(eq(reports.id,body.reportId)).limit(1);
  if(!report?.fileUrl||!(/^(reports\/)?[0-9a-f-]+\.(png|jpg|pdf)$/.test(report.fileUrl)))return failure('NOT_FOUND','Report file not found.',404);
  if(!await encounterForActor(report.encounterId,actor!))return failure('NOT_FOUND','Report file not found.',404);
  if(process.env.AI_MODE==='live'&&report.fileUrl.endsWith('.pdf'))return failure('OCR_FAILED','Live OCR currently accepts PNG or JPEG. Enter PDF report values manually.',422);
  const image=(await objectStorage().get(reportStorageKey(report.fileUrl))).bytes;
  const result=await ocrAdapter().extract(image);
  const hb=result.rawText.match(/(?:Hb|Haemoglobin|Hemoglobin)\s*[: ]\s*(\d+(?:\.\d+)?)/i);
  await conn.transaction(async tx=>{await tx.update(reports).set({rawOcr:result.rawText,ocrTokens:result.tokens,qualityStatus:result.quality,extractedData:hb?{hb:Number(hb[1])}:{}}).where(eq(reports.id,report.id));await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:report.encounterId,action:'OCR_COMPLETED',metadata:{report_id:report.id,quality:result.quality}});});
  return success(result);
 }catch(e){if(e instanceof Error&&e.message==='OCR_FAILED')return failure('OCR_FAILED','OCR failed. Retry or enter report values manually.',503);return parseFailure(e);}
}
