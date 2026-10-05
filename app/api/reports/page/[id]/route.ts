import {eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {reports} from '@/db/schema';
import {session} from '@/lib/auth';
import {encounterForActor} from '@/lib/access';
import {objectStorage,reportStorageKey} from '@/lib/storage';
import {reportPage} from '@/lib/ocr/pages';
import type {ReportMimeType} from '@/lib/file-validation';
import {failure} from '@/lib/api';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await session();if(!actor)return failure('UNAUTHORIZED','Staff sign-in required.',401);
 const {id}=await params;const [report]=await (await db()).select().from(reports).where(eq(reports.id,id)).limit(1);
 if(!report?.fileUrl||!await encounterForActor(report.encounterId,actor))return failure('NOT_FOUND','Report not found.',404);
 const page=Number(new URL(request.url).searchParams.get('page')??1);if(!Number.isInteger(page)||page<1||page>(report.pageCount??1))return failure('PAGE_NOT_FOUND','Report page not found.',404);
 try{const stored=await objectStorage().get(reportStorageKey(report.fileUrl));const bytes=await reportPage(stored.bytes,(report.fileMimeType??stored.contentType) as ReportMimeType,page);return new Response(Buffer.from(bytes),{headers:{'content-type':'image/png','cache-control':'private, no-store','x-content-type-options':'nosniff'}});}catch{return failure('PAGE_RENDER_FAILED','The report page could not be rendered. Open the original file.',422);}
}
