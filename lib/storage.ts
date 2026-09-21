import 'server-only';
import {mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {DeleteObjectCommand,GetObjectCommand,PutObjectCommand,S3Client} from '@aws-sdk/client-s3';
import {isProductionDeployment} from '@/lib/runtime-config';

export type StoredObject={bytes:Uint8Array;contentType:string};
export interface ObjectStorage{put(key:string,bytes:Uint8Array,contentType:string):Promise<void>;get(key:string):Promise<StoredObject>;delete(key:string):Promise<void>}
const safe=(key:string)=>{if(!/^(reports|audio)\/[0-9a-f-]+\.(png|jpg|pdf|webm)$/.test(key))throw new Error('INVALID_STORAGE_KEY');return key;};

const local:ObjectStorage={
 async put(key,bytes){const path=join('.data',safe(key));await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);},
 async get(key){const valid=safe(key);const bytes=await readFile(join('.data',valid));const contentType=valid.endsWith('.pdf')?'application/pdf':valid.endsWith('.png')?'image/png':valid.endsWith('.jpg')?'image/jpeg':'audio/webm';return {bytes,contentType};},
 async delete(key){await rm(join('.data',safe(key)),{force:true});},
};

let s3:S3Client|undefined;
function s3Client(){return s3??=new S3Client({region:process.env.S3_REGION!,endpoint:process.env.S3_ENDPOINT,forcePathStyle:process.env.S3_FORCE_PATH_STYLE==='true',credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID!,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY!}});}
const remote:ObjectStorage={
 async put(key,bytes,contentType){await s3Client().send(new PutObjectCommand({Bucket:process.env.S3_BUCKET!,Key:safe(key),Body:bytes,ContentType:contentType,ServerSideEncryption:'aws:kms',SSEKMSKeyId:process.env.S3_KMS_KEY_ID}));},
 async get(key){const response=await s3Client().send(new GetObjectCommand({Bucket:process.env.S3_BUCKET!,Key:safe(key)}));if(!response.Body)throw new Error('OBJECT_NOT_FOUND');return {bytes:await response.Body.transformToByteArray(),contentType:response.ContentType??'application/octet-stream'};},
 async delete(key){await s3Client().send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET!,Key:safe(key)}));},
};

export function objectStorage():ObjectStorage{return isProductionDeployment?remote:local;}
export function reportStorageKey(fileName:string){return fileName.startsWith('reports/')?fileName:`reports/${fileName}`;}
