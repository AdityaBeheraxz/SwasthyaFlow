import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {session} from '@/lib/auth';
import {failure} from '@/lib/api';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){if(!await session())return failure('UNAUTHORIZED','Select a demo role.',401);const {id}=await params;if(!/^[0-9a-f-]{36}$/.test(id))return failure('NOT_FOUND','Audio source not found.',404);try{const bytes=await readFile(join('.data/audio',`${id}.webm`));return new Response(bytes,{headers:{'content-type':'audio/webm','cache-control':'private, no-store'}});}catch{return failure('NOT_FOUND','Audio source not found.',404);}}
