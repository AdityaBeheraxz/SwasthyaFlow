import {session} from '@/lib/auth';
import {failure} from '@/lib/api';
import {sql} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {inputs} from '@/db/schema';
import {encounterForActor} from '@/lib/access';
import {objectStorage} from '@/lib/storage';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){const actor=await session();if(!actor)return failure('UNAUTHORIZED','Sign in is required.',401);const {id}=await params;if(!/^[0-9a-f-]{36}$/.test(id))return failure('NOT_FOUND','Audio source not found.',404);const [source]=await (await db()).select({encounterId:inputs.encounterId}).from(inputs).where(sql`${inputs.source}->>'audioId'=${id}`).limit(1);if(!source||!await encounterForActor(source.encounterId,actor))return failure('NOT_FOUND','Audio source not found.',404);try{const object=await objectStorage().get(`audio/${id}.webm`);return new Response(object.bytes.slice().buffer as ArrayBuffer,{headers:{'content-type':object.contentType,'cache-control':'private, no-store'}});}catch{return failure('NOT_FOUND','Audio source not found.',404);}}
