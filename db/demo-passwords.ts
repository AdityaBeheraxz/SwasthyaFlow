export function demoPassword(name:string,env:NodeJS.ProcessEnv=process.env){
 const value=env[name];
 if(!value||value.length<16||['HealthWorker!2026','Nurse!2026','Doctor!2026','Admin!2026','ReceiverTestOnly'].some(example=>value.includes(example)))throw new Error('Set a unique password of at least 16 characters in '+name+'.');
 return value;
}
