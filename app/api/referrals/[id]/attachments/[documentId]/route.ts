import {eq} from 'drizzle-orm';
import {createHash} from 'node:crypto';
import {referralRequestActor} from '@/lib/referral-workspace-auth';
import {db} from '@/lib/db/server';
import {reports,auditLogs} from '@/db/schema';
import {referralForDoctor} from '@/lib/referral-access';
import {objectStorage,reportStorageKey} from '@/lib/storage';
import {failure} from '@/lib/api';
export async function GET(req:Request,{params}:{params:Promise<{id:string;documentId:string}>}){
 const actor=await referralRequestActor(req);if(!actor)return failure('UNAUTHORIZED','Sign in required.',401);
 const {id,documentId}=await params,access=await referralForDoctor(id,actor);
 const attached=access?.delivery?.attachments.find(a=>a.id===documentId);if(!access||!attached)return failure('NOT_FOUND','Attachment unavailable.',404);
 const conn=await db(),[doc]=await conn.select().from(reports).where(eq(reports.id,documentId)).limit(1);
 if(!doc?.fileUrl||doc.encounterId!==access.encounter.id||doc.fileSha256!==attached.sha256)return failure('NOT_FOUND','Attachment unavailable.',404);
 try{const object=await objectStorage().get(reportStorageKey(doc.fileUrl));if(createHash('sha256').update(object.bytes).digest('hex')!==attached.sha256)return failure('INTEGRITY_FAILED','Document integrity check failed.',409);
 if(!await referralForDoctor(id,actor))return failure('NOT_FOUND','Attachment unavailable.',404);
 await conn.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'REFERRAL_ATTACHMENT_READ',metadata:{referralId:id,documentId}});
 return new Response(new Uint8Array(object.bytes),{headers:{'content-type':object.contentType,'content-disposition':`inline; filename="document-${documentId}.${object.contentType==='application/pdf'?'pdf':object.contentType==='image/png'?'png':'jpg'}"`,'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 }catch{return failure('NOT_FOUND','Original document unavailable.',404);}
}

