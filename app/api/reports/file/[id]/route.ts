import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {eq} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {reports} from '@/db/schema';
import {session} from '@/lib/auth';
import {failure} from '@/lib/api';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){if(!await session())return failure('UNAUTHORIZED','Select a demo role.',401);const {id}=await params;const [report]=await (await db()).select().from(reports).where(eq(reports.id,id)).limit(1);if(!report?.fileUrl||!(/^[0-9a-f-]+\.(png|jpg|pdf)$/.test(report.fileUrl)))return failure('NOT_FOUND','Report file not found.',404);try{const bytes=await readFile(join('.data/reports',report.fileUrl));const type=report.fileUrl.endsWith('.pdf')?'application/pdf':report.fileUrl.endsWith('.png')?'image/png':'image/jpeg';return new Response(bytes,{headers:{'content-type':type,'cache-control':'private, no-store'}});}catch{return failure('NOT_FOUND','Report file not found.',404);}}
