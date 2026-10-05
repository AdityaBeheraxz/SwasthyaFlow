export function providerMode(key:string,fallback:string,allowed:string[]):string{
 const mode=process.env[key]||fallback;
 if(!allowed.includes(mode))throw new Error(key+'_INVALID');
 if(process.env.DEPLOYMENT_MODE==='production'&&mode!=='enterprise')throw new Error(key+'_FORBIDDEN');
 return mode;
}
