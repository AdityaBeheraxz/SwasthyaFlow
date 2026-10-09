export type OfflineActor={id:string;facilityId:string;role:string;name?:string;cachedAt:number};
let pending:Promise<OfflineActor|null>|null=null;
let generation=0;
export function cachedOfflineActor():OfflineActor|null{
 try{const actor=JSON.parse(sessionStorage.getItem('sf_offline_actor')??'null');return actor&&Date.now()-actor.cachedAt<1800000?actor:null;}catch{return null;}
}
export function invalidateOfflineActor(){generation++;pending=null;sessionStorage.removeItem('sf_offline_actor');}
export function intakeActor():Promise<OfflineActor|null>{
 if(!navigator.onLine)return Promise.resolve(cachedOfflineActor());
 // Share only concurrent checks. Every later check still reaches the server.
 if(pending)return pending;
 const current=generation;
 const request=(async()=>{
  const response=await fetch('/api/session',{cache:'no-store'});
  const value=await response.json(),actor=value.data;
  if(current!==generation)return null;
  if(!response.ok||!actor?.facilityId){sessionStorage.removeItem('sf_offline_actor');return null;}
  const cached={id:actor.id,facilityId:actor.facilityId,role:actor.role,name:actor.name,cachedAt:Date.now()};
  sessionStorage.setItem('sf_offline_actor',JSON.stringify(cached));return cached;
 })();
 pending=request;
 const clear=()=>{if(pending===request)pending=null;};
 void request.then(clear,clear);
 return request;
}
