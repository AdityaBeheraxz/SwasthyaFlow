import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {createHash} from 'node:crypto';
import {db} from '@/lib/db/server';
import {reports,auditLogs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
import {consumeRateLimit} from '@/lib/rate-limit';
import {ocrAdapter,OcrError} from '@/lib/ocr';
import {extractReportData} from '@/lib/ocr/report-data';
import {encounterForActor} from '@/lib/access';
import {objectStorage,reportStorageKey} from '@/lib/storage';
import {reportMimeTypes,type ReportMimeType} from '@/lib/file-validation';

const schema=z.union([
 z.object({encounterId:z.string().min(1),rawText:z.string().trim().min(3).max(50_000)}).strict(),
 z.object({reportId:z.string().uuid()}).strict(),
 z.object({reportId:z.string().uuid(),reviewedText:z.string().trim().min(3).max(50_000),confirmed:z.literal(true)}).strict()
]);

async function accessibleReport(reportId:string,actor:NonNullable<Awaited<ReturnType<typeof session>>>){
 const conn=await db();
 const [report]=await conn.select().from(reports).where(eq(reports.id,reportId)).limit(1);
 if(!report||!await encounterForActor(report.encounterId,actor))return null;
 return report;
}

export async function POST(req:Request){
 const actor=await session();
 if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);
 const rate=await consumeRateLimit(`${actor!.id}:ocr`,12,60);
 if(!rate.ok)return failure('RATE_LIMITED','Too many OCR requests. Retry shortly.',429);
 try{
  const body=schema.parse(await req.json());
  const conn=await db();
  if('rawText' in body){
   const encounter=await encounterForActor(body.encounterId,actor!);
   if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);
   const extracted=extractReportData(body.rawText,{verified:true});
   const reportId=crypto.randomUUID();
   await conn.transaction(async tx=>{
    await tx.insert(reports).values({id:reportId,encounterId:body.encounterId,reviewedText:body.rawText,reviewedBy:actor!.id,reviewedAt:new Date(),extractedData:extracted.data,qualityStatus:'TEXT_SUPPLIED',qualityWarnings:extracted.warnings});
    await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:body.encounterId,action:'REPORT_TEXT_CAPTURED',metadata:{report_id:reportId,quality:'TEXT_SUPPLIED',text_sha256:createHash('sha256').update(body.rawText).digest('hex'),warnings:extracted.warnings}});
   });
   return success({reportId,reviewedText:body.rawText,extractedData:extracted.data,warnings:extracted.warnings});
  }

  const report=await accessibleReport(body.reportId,actor!);
  if(!report)return failure('NOT_FOUND','Report not found.',404);

  if('reviewedText' in body){
   if(!report.rawOcr)return failure('OCR_REQUIRED','Run OCR before confirming extracted text.',409);
   const rawOcr=report.rawOcr;
   const extracted=extractReportData(body.reviewedText,{verified:true});
   await conn.transaction(async tx=>{
    await tx.update(reports).set({reviewedText:body.reviewedText,reviewedBy:actor!.id,reviewedAt:new Date(),extractedData:extracted.data,qualityStatus:'HUMAN_VERIFIED',qualityWarnings:[...(report.qualityWarnings??[]),...extracted.warnings]}).where(eq(reports.id,report.id));
    await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:report.encounterId,action:'OCR_REVIEW_CONFIRMED',metadata:{report_id:report.id,raw_ocr_sha256:createHash('sha256').update(rawOcr).digest('hex'),reviewed_text_sha256:createHash('sha256').update(body.reviewedText).digest('hex'),changed:rawOcr!==body.reviewedText,warnings:extracted.warnings}});
   });
   return success({reportId:report.id,reviewedText:body.reviewedText,extractedData:extracted.data,warnings:extracted.warnings});
  }

  if(!report.fileUrl||!(/^(reports\/)?[0-9a-f-]+\.(png|jpg|pdf)$/.test(report.fileUrl)))return failure('NOT_FOUND','Report file not found.',404);
  const stored=await objectStorage().get(reportStorageKey(report.fileUrl));
  const mimeType=(report.fileMimeType??stored.contentType) as ReportMimeType;
  if(!reportMimeTypes.includes(mimeType))return failure('OCR_FORMAT_UNSUPPORTED','Stored report type is not supported.',422);
  await conn.update(reports).set({qualityStatus:'OCR_PROCESSING',ocrError:null}).where(eq(reports.id,report.id));
  try{
   const result=await ocrAdapter().extract(stored.bytes,mimeType);
   const extracted=extractReportData(result.rawText,{verified:false,tokens:result.tokens,meanConfidence:result.meanConfidence});
   const warnings=[...(report.qualityWarnings??[]),...result.warnings,...extracted.warnings];
   await conn.transaction(async tx=>{
    await tx.update(reports).set({rawOcr:result.rawText,reviewedText:null,reviewedBy:null,reviewedAt:null,ocrTokens:result.tokens,qualityStatus:result.quality,extractedData:extracted.data,qualityWarnings:[...new Set(warnings)],ocrEngine:result.engine,ocrConfidencePermille:Math.round(result.meanConfidence*1000),ocrCompletedAt:new Date(),ocrError:null}).where(eq(reports.id,report.id));
    await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:report.encounterId,action:'OCR_COMPLETED',metadata:{report_id:report.id,quality:result.quality,engine:result.engine,mean_confidence:result.meanConfidence,low_confidence_tokens:result.tokens.filter(token=>token.confidence<0.8).length,warnings}});
   });
   return success({...result,reportId:report.id,extractedData:extracted.data,warnings:[...new Set(warnings)]});
  }catch(error){
   const code=error instanceof OcrError?error.code:'OCR_PROVIDER_FAILED';
   const message=error instanceof OcrError?error.message:'OCR failed. Retry or enter report text manually.';
   await conn.transaction(async tx=>{
    await tx.update(reports).set({qualityStatus:'OCR_FAILED',ocrError:code}).where(eq(reports.id,report.id));
    await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId:report.encounterId,action:'OCR_FAILED',metadata:{report_id:report.id,error_code:code}});
   });
   return failure(code,message,code==='OCR_NOT_CONFIGURED'||code==='OCR_PROVIDER_FAILED'?503:422);
  }
 }catch(error){return parseFailure(error);}
}
