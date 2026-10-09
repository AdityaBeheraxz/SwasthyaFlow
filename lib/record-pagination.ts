import {z} from 'zod';
import {failure} from '@/lib/api';

const cursorSchema=z.object({at:z.string().datetime({offset:true}),id:z.string().min(1).max(100)}).strict();
export function readCursor(value:string|null){
 if(!value)return null;
 if(value.length>512)throw new Error('INVALID_CURSOR');
 try{return cursorSchema.parse(JSON.parse(Buffer.from(value,'base64url').toString('utf8')));}catch{throw new Error('INVALID_CURSOR');}
}
export function nextCursor(at:Date,id:string){return Buffer.from(JSON.stringify({at:at.toISOString(),id})).toString('base64url');}
export function pageSize(value:string|null){return z.coerce.number().int().min(1).max(100).parse(value??50);}
export function queryFailure(error:unknown,subject:string){
 const invalid=error instanceof z.ZodError||error instanceof Error&&['INVALID_CURSOR','INVALID_RANGE'].includes(error.message);
 return invalid?failure('INVALID_FILTER',`Check the ${subject} filters and retry.`,400):failure('QUERY_UNAVAILABLE',`${subject} is temporarily unavailable. Retry shortly.`,503);
}
