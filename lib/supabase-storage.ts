import type {ObjectStorage} from './storage';
export function supabaseStorage(env:NodeJS.ProcessEnv=process.env,send:typeof fetch=fetch):ObjectStorage{
 const base=env.SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY,bucket=env.SUPABASE_STORAGE_BUCKET;
 if(!base||!key||!bucket||!/^[a-z0-9][a-z0-9_-]{2,62}$/.test(bucket))throw new Error('SUPABASE_STORAGE_CONFIG_INVALID');
 const origin=new URL(base);
 if(origin.protocol!=='https:'||!origin.hostname.endsWith('.supabase.co')||origin.username||origin.password||origin.search||origin.hash||!['','/'].includes(origin.pathname))throw new Error('SUPABASE_STORAGE_CONFIG_INVALID');
 const headers={'apikey':key,...(key.split('.').length===3?{authorization:'Bearer '+key}:{})};
 const endpoint=origin.origin+'/storage/v1';
 let checkedAt=0;
 async function call(path:string,init:RequestInit={}){
  const response=await send(endpoint+path,{...init,headers:{...headers,...init.headers},cache:'no-store',signal:AbortSignal.timeout(30_000)});
  if(!response.ok)throw new Error('PRIVATE_STORAGE_UNAVAILABLE');
  return response;
 }
 async function privateBucket(){
  if(Date.now()-checkedAt<60_000)return;
  const value=await (await call('/bucket/'+bucket)).json();
  if(value.public!==false)throw new Error('PUBLIC_STORAGE_FORBIDDEN');
  checkedAt=Date.now();
 }
 function objectPath(name:string){
  if(!/^(reports|audio)\/[0-9a-f-]+\.(png|jpg|pdf|webm)$/.test(name))throw new Error('INVALID_STORAGE_KEY');
  return '/object/'+bucket+'/'+name;
 }
 return {
  async put(name,bytes,contentType){const path=objectPath(name);await privateBucket();await call(path,{method:'POST',headers:{'content-type':contentType,'x-upsert':'false'},body:bytes as BodyInit});},
  async get(name){const path=objectPath(name);await privateBucket();const response=await call(path);return {bytes:new Uint8Array(await response.arrayBuffer()),contentType:response.headers.get('content-type')??'application/octet-stream'};},
  async delete(name){objectPath(name);await privateBucket();await call('/object/'+bucket,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({prefixes:[name]})});}
 };
}
