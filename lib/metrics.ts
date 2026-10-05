import {db} from '@/lib/db/server';
import {processingMetrics} from '@/db/schema';
export async function measured<T>(facilityId:string,stage:string,operation:()=>Promise<T>):Promise<T>{
 const started=performance.now();let succeeded=false;
 try{const result=await operation();succeeded=result instanceof Response?result.ok:true;return result;}finally{
  try{await (await db()).insert(processingMetrics).values({id:crypto.randomUUID(),facilityId,stage,durationMs:Math.round(performance.now()-started),succeeded});}catch{console.error('Processing metric could not be recorded',stage);}
 }
}
