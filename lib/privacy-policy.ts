export const privacyPolicyVersion='2.2-IN-2026-10-08';
export const clinicalRoles=['health_worker','nurse','medical_officer'] as const;
export function canReadClinicalCase(role:string){return clinicalRoles.some(item=>item===role);}
export function externalProcessingIssues(env:NodeJS.ProcessEnv=process.env){
 const issues:string[]=[];
 for(const name of ['EXTERNAL_PROCESSING_APPROVED','PROVIDER_NO_TRAINING_APPROVED','PROVIDER_NO_RETENTION_APPROVED'])if(env[name]!=='true')issues.push(name);
 if(env.PROVIDER_DATA_REGION!=='IN')issues.push('PROVIDER_DATA_REGION');
 if(!env.ALLOWED_PROVIDER_ORIGINS)issues.push('ALLOWED_PROVIDER_ORIGINS');
 return issues;
}
export function assertPrivateProvider(url:string,env:NodeJS.ProcessEnv=process.env){
 if(externalProcessingIssues(env).length)throw new Error('EXTERNAL_PROCESSING_BLOCKED');
 let endpoint:URL;try{endpoint=new URL(url);}catch{throw new Error('EXTERNAL_PROCESSING_BLOCKED');}
 const allowed=(env.ALLOWED_PROVIDER_ORIGINS??'').split(',').map(item=>item.trim()).filter(Boolean);
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||!allowed.includes(endpoint.origin))throw new Error('EXTERNAL_PROCESSING_BLOCKED');
}
export async function privateProviderFetch(url:string,init:RequestInit){
 assertPrivateProvider(url);
 return fetch(url,{...init,cache:'no-store',redirect:'error',referrerPolicy:'no-referrer'});
}

