import {eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {reports} from '@/db/schema';
import {session} from '@/lib/auth';
import {failure} from '@/lib/api';
import {encounterForActor} from '@/lib/access';
import {objectStorage,reportStorageKey} from '@/lib/storage';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){const actor=await session();if(!actor)return failure('UNAUTHORIZED','Sign in is required.',401);const {id}=await params;const [report]=await (await db()).select().from(reports).where(eq(reports.id,id)).limit(1);if(!report?.fileUrl||!await encounterForActor(report.encounterId,actor)||!(/^(reports\/)?[0-9a-f-]+\.(png|jpg|pdf)$/.test(report.fileUrl)))return failure('NOT_FOUND','Report file not found.',404);try{const object=await objectStorage().get(reportStorageKey(report.fileUrl));const disposition=object.contentType==='application/pdf'?'attachment':'inline';return new Response(object.bytes.slice().buffer as ArrayBuffer,{headers:{'content-type':object.contentType,'cache-control':'private, no-store','content-disposition':disposition,'x-content-type-options':'nosniff'}});}catch{return failure('NOT_FOUND','Report file not found.',404);}}
