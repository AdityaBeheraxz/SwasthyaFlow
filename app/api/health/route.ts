import { success, failure } from '@/lib/api';
import { db } from '@/lib/db/server';
export async function GET(){try{await db();return success({status:'ok',mode:process.env.AI_MODE||'mock'});}catch{return failure('DB_UNAVAILABLE','Database unavailable',503);}}
