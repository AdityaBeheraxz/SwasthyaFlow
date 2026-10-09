import {db} from '@/lib/db/server';
import {eq} from 'drizzle-orm';
import {z} from 'zod';
import {reports,auditLogs} from '@/db/schema';
import {session,allowed} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
import {encounterForActor} from '@/lib/access';
import {objectStorage} from '@/lib/storage';
import {inspectReportFile,ReportFileValidationError} from '@/lib/file-validation';
export async function POST(req:Request){
 const actor=await session();
 if(!allowed(actor?.role??null,['health_worker','nurse','medical_officer']))return failure('FORBIDDEN','Intake role required.',403);
 let storedKey:string|undefined;
 try{
  const form=await req.formData(),encounterId=form.get('encounterId'),file=form.get('file');
  if(typeof encounterId!=='string'||!(file instanceof File))return failure('VALIDATION_FAILED','Encounter and file are required.',422);
  const conn=await db(),encounter=await encounterForActor(encounterId,actor!);
  if(!encounter)return failure('NOT_FOUND','Encounter not found.',404);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const inspection=await inspectReportFile(bytes,file.type);
  const documentType=z.enum(['report','prescription']).parse(form.get('documentType')||'report');
  const id=form.has('reportId')?z.string().uuid().parse(form.get('reportId')):crypto.randomUUID();
  const [existing]=await conn.select().from(reports).where(eq(reports.id,id)).limit(1);
  if(existing){if(existing.encounterId!==encounterId||existing.fileSha256!==inspection.sha256||existing.documentType!==documentType)return failure('SYNC_CONFLICT','A different report is already saved.',409);return success({reportId:id,inspection});}
  if(['COMPLETED','APPROVED','ESCALATED','REFERRAL_GENERATED','PROCESSING'].includes(encounter.state))return failure('ENCOUNTER_LOCKED','This encounter cannot accept report files.',409);
  storedKey=`reports/${id}.${inspection.extension}`;
  await objectStorage().put(storedKey,bytes,file.type);
  const safeName=file.name.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,120)||`report.${inspection.extension}`;
  await conn.transaction(async tx=>{await tx.insert(reports).values({id,encounterId,documentType,fileUrl:storedKey,fileName:safeName,fileMimeType:inspection.mimeType,fileSize:inspection.byteLength,fileSha256:inspection.sha256,pageCount:inspection.pageCount,qualityWarnings:inspection.warnings,qualityStatus:inspection.qualityStatus});await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor!.id,encounterId,action:'REPORT_UPLOADED',metadata:{report_id:id,document_type:documentType,file_type:inspection.mimeType,file_size:inspection.byteLength,file_sha256:inspection.sha256,page_count:inspection.pageCount,quality_status:inspection.qualityStatus,warnings:inspection.warnings}});});
  return success({reportId:id,inspection:{pageCount:inspection.pageCount,width:inspection.width,height:inspection.height,qualityStatus:inspection.qualityStatus,warnings:inspection.warnings}},201);
 }catch(e){if(storedKey)await objectStorage().delete(storedKey).catch(()=>undefined);if(e instanceof ReportFileValidationError)return failure(e.code,e.message,422);return parseFailure(e);}
}
