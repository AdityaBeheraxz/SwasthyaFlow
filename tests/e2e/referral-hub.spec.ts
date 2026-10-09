import {test,expect,type APIRequestContext} from '@playwright/test';
async function login(r:APIRequestContext,username:string,password:string){expect((await r.post('/api/auth/credentials',{data:{username,password}})).status()).toBe(200);}

test('refer patients and acceptance inbox work inside the referrals hub without replacing staff identity',async({page})=>{
 const r=page.request;await login(r,'health.worker','HealthWorker!2026');
 const name='Referral hub test '+crypto.randomUUID().slice(0,8),reason='Qualified review of reported tiredness '+name;
 const p=(await (await r.post('/api/patients',{data:{name,age:35,language:'en',consent:true}})).json()).data;
 const e=(await (await r.post('/api/encounters',{data:{patientId:p.id,text:'Patient reports tiredness for two days.',language:'en',inputType:'text'}})).json()).data;
 expect((await r.post('/api/triage/analyze',{data:{encounterId:e.id}})).status()).toBe(200);
 expect((await r.post('/api/reviews/workspace',{data:{username:'doctor.ananya',password:'Doctor!2026'}})).status()).toBe(200);
 expect((await r.post('/api/reviews',{data:{encounterId:e.id,decision:'APPROVE'}})).status()).toBe(200);
 await page.goto('/referrals');await expect(page.getByRole('heading',{name:'Referrals',exact:true})).toBeVisible();
 await expect(page.getByLabel('Receiving doctor username')).toHaveCount(0);
 await page.getByLabel('Find a patient').fill(p.anonymousPatientId);await page.getByRole('button',{name:'Search',exact:true}).click();
 const patient=page.locator('tbody tr').filter({hasText:name});await expect(patient).toContainText('Ready to refer');await patient.getByRole('button',{name:'Refer patient',exact:true}).click();
 await expect(page.getByLabel('Referral recipient')).toBeVisible();expect(new URL(page.url()).pathname).toBe('/referrals');
 const directory=(await (await r.get('/api/referral-recipients')).json()).data,recipient=directory.find((v:{receivingFacilityId:string})=>v.receivingFacilityId==='PITCH-SCB');expect(recipient).toBeTruthy();
 await page.getByLabel('Referral recipient').selectOption(recipient.id);await page.getByLabel('Factual referral reason').fill(reason);await page.getByLabel('Include recorded patient name').check();await page.getByLabel('I explained this report').check();
 await page.getByRole('button',{name:'Create referral report'}).click();await expect(page.getByRole('button',{name:'Download referral PDF'})).toBeVisible();
 await page.getByLabel('I explained the named recipient and recorded').check();await page.getByRole('button',{name:'Send referral with documents'}).click();await expect(page.getByText('Received by local prototype inbox',{exact:false})).toBeVisible();
 await page.getByRole('link',{name:'Acceptance inbox',exact:true}).click();await page.getByLabel('Receiving doctor username').fill('receiver.scb');await page.getByLabel('Receiving doctor password').fill('ReceiverTestOnly!2026');await page.getByRole('button',{name:'Open receiving workspace'}).click();
 const received=page.locator('article').filter({hasText:reason});await expect(received).toContainText(name);await received.getByRole('button',{name:'Accept referral',exact:true}).click();await expect(received).toContainText('ACCEPTED');
 expect((await (await r.get('/api/session')).json()).data.id).toBe('U-101');
 await page.getByRole('link',{name:'Refer patients',exact:true}).click();await page.getByLabel('Find a patient').fill(p.anonymousPatientId);await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.locator('tbody tr').filter({hasText:name})).toContainText('ACCEPTED');
 await page.setViewportSize({width:390,height:844});await page.locator('.language-switcher select').selectOption('or');await expect(page.getByRole('link',{name:'ରୋଗୀଙ୍କୁ ରେଫର୍ କରନ୍ତୁ',exact:true})).toHaveAttribute('aria-current','page');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('referral worklist keeps facility, consent, role and approval boundaries',async({request:r})=>{
 await login(r,'health.worker','HealthWorker!2026');
 const p=(await (await r.post('/api/patients',{data:{name:'Hub privacy test',age:40,language:'en',consent:true}})).json()).data;
 const e=(await (await r.post('/api/encounters',{data:{patientId:p.id,text:'I have difficulty breathing.',language:'en',inputType:'text'}})).json()).data;
 expect((await r.post('/api/triage/analyze',{data:{encounterId:e.id}})).status()).toBe(200);
 const url='/api/referrals/worklist?search='+p.anonymousPatientId;
 const ready=(await (await r.get(url+'&view=ready')).json()).data;expect(ready).toHaveLength(0);
 const response=await r.get(url+'&view=review'),review=(await response.json()).data;
 expect(response.headers()['cache-control']).toContain('no-store');expect(review).toHaveLength(1);expect(review[0].encounter.priority).toBe('RED');expect(review[0].encounter).not.toHaveProperty('chiefComplaint');expect(review[0]).not.toHaveProperty('note');
 expect((await r.get(url+'&view=invalid')).status()).toBe(422);
 await login(r,'receiver.mkcg','ReceiverTestOnly!2026');expect((await (await r.get(url+'&view=all')).json()).data).toHaveLength(0);
 await login(r,'health.worker','HealthWorker!2026');expect((await r.post('/api/privacy/consent',{data:{patientId:p.id,withdraw:true,requestConfirmed:true}})).status()).toBe(200);expect((await (await r.get(url+'&view=all')).json()).data).toHaveLength(0);
 await login(r,'administrator','Admin!2026');expect((await r.get(url)).status()).toBe(403);
 await r.post('/api/auth/logout',{maxRedirects:0});expect((await r.get(url)).status()).toBe(401);
});
