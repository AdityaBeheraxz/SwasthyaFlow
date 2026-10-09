import {test,expect} from '@playwright/test';
async function login(request:import('@playwright/test').APIRequestContext,admin=false){expect((await request.post('/api/auth/credentials',{data:admin?{username:'administrator',password:'Admin!2026'}:{username:'health.worker',password:'HealthWorker!2026'}})).status()).toBe(200);}
test('clinical data is private, minimized, blocked for administrators, and stops after consent withdrawal',async({request})=>{
 await login(request);
 const patient=await (await request.post('/api/patients',{data:{age:35,name:'Private Engineering Record',language:'en',consent:true}})).json();
 const encounter=await (await request.post('/api/encounters',{data:{patientId:patient.data.id,text:'Cough for 2 days.',language:'en',inputType:'text'}})).json();const id=encounter.data.id;
 const read=await request.get('/api/encounters/'+id);expect(read.status()).toBe(200);expect(read.headers()['cache-control']).toContain('no-store');expect(read.headers()['x-robots-tag']).toContain('noindex');
 const queue=await (await request.get('/api/queue?state=INPUT_CAPTURED&sort=newest')).json();const row=queue.data.find((item:{encounter:{id:string}})=>item.encounter.id===id);expect(row).toBeTruthy();expect(row.patient.name).toBe('Private Engineering Record');expect(row.encounter).not.toHaveProperty('chiefComplaint');
 expect((await request.get('/api/referrals?encounterId='+id)).status()).toBe(403);expect((await request.post('/api/referrals',{data:{encounterId:id,content:'Private'}})).status()).toBe(403);
 await login(request,true);expect((await request.get('/api/encounters/'+id)).status()).toBe(403);expect((await request.get('/api/queue')).status()).toBe(403);
 await login(request);expect((await request.post('/api/privacy/consent',{data:{patientId:patient.data.id,withdraw:true,requestConfirmed:true}})).status()).toBe(200);
 expect((await request.get('/api/encounters/'+id)).status()).toBe(404);expect((await request.post('/api/triage/analyze',{data:{encounterId:id}})).status()).toBe(404);
 expect((await (await request.get('/api/queue')).json()).data.some((item:{encounter:{id:string}})=>item.encounter.id===id)).toBe(false);
});
test('guardian consent is mandatory and logged-out credentials cannot replay the session',async({request})=>{
 await login(request);
 expect((await request.post('/api/patients',{data:{age:12,language:'hi',consent:true}})).status()).toBe(422);
 expect((await request.post('/api/patients',{data:{age:12,language:'hi',consent:true,consentAuthority:'guardian'}})).status()).toBe(201);
 const state=await request.storageState(),cookie=state.cookies.find(item=>item.name==='sf_session')!;
 await request.post('/api/auth/logout',{maxRedirects:0});
 const replay=await request.get('/api/session',{headers:{cookie:'sf_session='+cookie.value}});expect((await replay.json()).data).toBeNull();
});
