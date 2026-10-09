import {referralRequestActor} from '@/lib/referral-workspace-auth';
import {db} from '@/lib/db/server';
import {auditLogs} from '@/db/schema';
import {referralForDoctor} from '@/lib/referral-access';
import {failure} from '@/lib/api';
import {consumeRateLimit} from '@/lib/rate-limit';
import {renderReferralPdf} from '@/lib/referral-pdf';
import {appendReferralDocuments} from '@/lib/referral-bundle-pdf';
import type {ReferralReport} from '@/lib/referral-policy';
export const runtime='nodejs';
export const maxDuration=300;
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await referralRequestActor(req);if(actor?.role!=='medical_officer'||!actor.facilityId)return failure('FORBIDDEN','Medical Officer role required.',403);
 const {id}=await params,access=await referralForDoctor(id,actor);if(!access)return failure('NOT_FOUND','Referral not available, consent withdrawn or recipient inactive.',404);
 if(!(await consumeRateLimit(`referral-pdf:${actor.id}`,10,60)).ok)return failure('RATE_LIMITED','Please wait before downloading another report.',429);
 try{
  const report=JSON.parse(access.referral.content) as ReferralReport;if(report.version!==1)return failure('INVALID_REFERRAL','Legacy report unavailable.',409);
  const cover=await renderReferralPdf(report,id,access.referral.deliveryStatus);
  const attachments=access.delivery?.attachments??[];
  const pdf=await appendReferralDocuments(cover,attachments);
  if(!await referralForDoctor(id,actor))return failure('NOT_FOUND','Referral no longer available.',404);
  await (await db()).insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,facilityId:actor.facilityId,action:'REFERRAL_PDF_DOWNLOADED',encounterId:access.sender?access.encounter.id:undefined,metadata:{referralId:id,attachmentCount:attachments.length,deliveryStatus:access.referral.deliveryStatus}});
  let offset=0;const body=new ReadableStream<Uint8Array>({pull(controller){if(offset>=pdf.length){controller.close();return;}controller.enqueue(Uint8Array.from(pdf.subarray(offset,offset+65536)));offset+=65536;}});
  return new Response(body,{headers:{'Content-Type':'application/pdf','Content-Disposition':`${new URL(req.url).searchParams.get('print')==='1'?'inline':'attachment'}; filename="referral-${id}.pdf"`,'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive'}});
 }catch{return failure('PDF_UNAVAILABLE','The complete PDF could not be generated. Check original document availability, size limits and PDF configuration. No attachment was silently omitted.',503);}
}

