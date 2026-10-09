import {test,expect} from '@playwright/test';
test('in-dashboard receiving credentials preserve the main session and close independently',async({page})=>{
 const r=page.request;expect((await r.post('/api/auth/credentials',{data:{username:'health.worker',password:'HealthWorker!2026'}})).status()).toBe(200);
 await page.goto('/');await expect(page.getByRole('heading',{name:'Review, audit and refer'})).toHaveCount(0);await page.getByRole('link',{name:'Referrals',exact:true}).click();await page.getByRole('link',{name:'Acceptance inbox',exact:true}).click();
 await expect(page.getByLabel('Receiving doctor username')).toBeVisible();
 expect((await r.get('/api/referrals/inbox')).status()).toBe(403);
 await page.getByLabel('Receiving doctor username').fill('receiver.mkcg');await page.getByLabel('Receiving doctor password').fill('IncorrectPassword!2026');await page.getByRole('button',{name:'Open receiving workspace'}).click();await expect(page.locator('p[role=alert]')).toContainText('credentials are incorrect');
 await page.getByLabel('Receiving doctor password').fill('ReceiverTestOnly!2026');await page.getByRole('button',{name:'Open receiving workspace'}).click();await expect(page.getByRole('button',{name:'Close receiving workspace'})).toBeVisible();
 expect((await (await r.get('/api/session')).json()).data.id).toBe('U-101');
 expect((await r.get('/api/audit')).status()).toBe(200);
 await page.getByRole('button',{name:'Close receiving workspace'}).click();await expect(page.getByLabel('Receiving doctor username')).toBeVisible();expect((await r.get('/api/referrals/inbox')).status()).toBe(403);expect((await (await r.get('/api/session')).json()).data.id).toBe('U-101');
});
test('MKCG source risk case has an audit and consented referral to another college',async({page})=>{
 const r=page.request;expect((await r.post('/api/auth/credentials',{data:{username:'receiver.mkcg',password:'ReceiverTestOnly!2026'}})).status()).toBe(200);
 const patient=await (await r.post('/api/patients',{data:{age:40,language:'en',consent:true}})).json();expect(patient.ok).toBe(true);
 const encounter=await (await r.post('/api/encounters',{data:{patientId:patient.data.id,text:'I have difficulty breathing.',language:'en',inputType:'text'}})).json();expect(encounter.ok).toBe(true);const id=encounter.data.id;
 expect((await r.post('/api/triage/analyze',{data:{encounterId:id}})).status()).toBe(200);
 const audit=await (await r.get(`/api/audit/${id}`)).json();expect(audit.ok).toBe(true);expect(audit.data.some((e:{action:string})=>e.action==='TRIAGE_COMPLETED')).toBe(true);
 await page.goto(`/audit?encounterId=${id}`);await expect(page.getByText('RED',{exact:true})).toBeVisible();await page.getByRole('link',{name:'Review risk and refer'}).click();await expect(page.getByText('Approve the reviewed case before creating a referral.')).toBeVisible();
 await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByRole('link',{name:'Open referrals for this patient'}).click();await expect(page.getByLabel('Referral recipient')).toBeVisible();
 const recipients=await (await r.get('/api/referral-recipients')).json(),scb=recipients.data.find((v:{receivingFacilityId:string})=>v.receivingFacilityId==='PITCH-SCB');expect(scb).toBeTruthy();
 await page.getByLabel('Referral recipient').selectOption(scb.id);await page.getByLabel('Factual referral reason').fill('Qualified review of patient-reported breathing difficulty');await page.getByLabel('I explained this report').check();await page.getByRole('button',{name:'Create referral report'}).click();await expect(page.getByRole('button',{name:'Download referral PDF'})).toBeVisible();
});

