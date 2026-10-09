import {test,expect,type APIRequestContext} from '@playwright/test';
import {referralHtml,type ReferralReport} from '../../lib/referral-policy';
async function login(r:APIRequestContext,role:'admin'|'doctor'|'worker'){const creds={admin:['administrator','Admin!2026'],doctor:['doctor.ananya','Doctor!2026'],worker:['health.worker','HealthWorker!2026']}[role];expect((await r.post('/api/auth/credentials',{data:{username:creds[0],password:creds[1]}})).status()).toBe(200);}
test('verified directory, consent, approval, PDF download and withdrawal',async({page})=>{
 const r=page.request;await login(r,'worker');expect((await r.get('/api/referral-recipients')).status()).toBe(403);
 const patient=await (await r.post('/api/patients',{data:{name:'Test-only patient',age:45,language:'en',consent:true}})).json();
 const encounter=await (await r.post('/api/encounters',{data:{patientId:patient.data.id,text:'I have had fever for three days.',language:'en',inputType:'text'}})).json();const encounterId=encounter.data.id;
 await r.post('/api/triage/analyze',{data:{encounterId}});
 await login(r,'admin');expect((await r.get(`/api/referrals?encounterId=${encounterId}`)).status()).toBe(403);
 await page.goto('/settings');await page.getByLabel('Recipient name').fill('TEST ONLY recipient '+crypto.randomUUID().slice(0,8));await page.getByLabel('Hospital / institution').fill('TEST ONLY institution');await page.getByLabel('Department / specialty').fill('General review');await page.getByLabel('Verification reference').fill('Test fixture only; not a real receiving hospital');await page.getByLabel('I verified the recipient').check();await page.getByRole('button',{name:'Add verified recipient'}).click();await expect(page.getByText('TEST ONLY institution · General review · Active').last()).toBeVisible();
 const directory=await (await r.get('/api/referral-recipients')).json();const recipientId=directory.data.at(-1).id;
 await login(r,'doctor');const body={encounterId,recipientId,reason:'Qualified review of patient-reported fever',consentConfirmed:true,consentAuthority:'self',includeName:false};expect((await r.post('/api/referrals',{data:body})).status()).toBe(409);
 expect((await r.post('/api/reviews',{data:{encounterId,decision:'APPROVE'}})).status()).toBe(200);
 expect((await r.post('/api/referrals',{data:{...body,consentConfirmed:false}})).status()).toBe(422);
 expect((await r.post('/api/referrals',{data:{...body,reason:'Take paracetamol twice daily'}})).status()).toBe(422);
 await page.goto(`/referrals?case=${encounterId}`);await page.getByLabel('Referral recipient').selectOption(recipientId);await page.getByLabel('Factual referral reason').fill(body.reason);await page.getByLabel('I explained this report').check();await page.getByRole('button',{name:'Create referral report'}).click();await expect(page.getByRole('button',{name:'Download referral PDF'})).toBeVisible();
 const saved=await (await r.get(`/api/referrals?encounterId=${encounterId}`)).json();const referral=saved.data[0];expect(JSON.parse(referral.content)).toMatchObject({patient:{name:null},deliveryStatus:'NOT_SENT'});
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download referral PDF'}).click()]);expect(download.suggestedFilename()).toBe(`referral-${referral.id}.pdf`);const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));expect(Buffer.concat(chunks).subarray(0,4).toString()).toBe('%PDF');
 await login(r,'worker');expect((await r.get(`/api/referrals/${referral.id}/download`)).status()).toBe(403);
 await login(r,'admin');await r.patch('/api/referral-recipients',{data:{id:recipientId,active:false}});await login(r,'doctor');expect((await r.get(`/api/referrals/${referral.id}/download`)).status()).toBe(404);
 await login(r,'admin');await r.patch('/api/referral-recipients',{data:{id:recipientId,active:true}});await login(r,'doctor');await r.post('/api/privacy/consent',{data:{patientId:patient.data.id,withdraw:true,requestConfirmed:true}});expect((await r.get(`/api/referrals/${referral.id}/download`)).status()).toBe(404);
});
test('child referrals require guardian consent and preserve Hindi/Odia text',async({page},testInfo)=>{
 const r=page.request;await login(r,'admin');const recipient=await (await r.post('/api/referral-recipients',{data:{name:'TEST ONLY language recipient',kind:'specialist',institution:'TEST ONLY institution',department:'General review',registrationNumber:'TEST-ONLY-001',verificationReference:'Synthetic test evidence; not a real doctor',verified:true}})).json();expect(recipient.ok).toBe(true);
 await login(r,'worker');const patient=await (await r.post('/api/patients',{data:{name:'परीक्षण · ପରୀକ୍ଷା',age:12,language:'hi',consent:true,consentAuthority:'guardian'}})).json();const encounter=await (await r.post('/api/encounters',{data:{patientId:patient.data.id,text:'Fever for three days.',language:'hi',inputType:'text'}})).json();const encounterId=encounter.data.id;expect((await r.post('/api/triage/analyze',{data:{encounterId}})).status()).toBe(200);
 await login(r,'doctor');expect((await r.post('/api/reviews',{data:{encounterId,decision:'APPROVE'}})).status()).toBe(200);const body={encounterId,recipientId:recipient.data.id,reason:'समीक्षा के लिए · ସମୀକ୍ଷା ପାଇଁ',consentConfirmed:true,consentAuthority:'self',includeName:true};expect((await r.post('/api/referrals',{data:body})).status()).toBe(422);const created=await (await r.post('/api/referrals',{data:{...body,consentAuthority:'guardian'}})).json();expect(created.ok).toBe(true);expect(created.data.report.patient.name).toBe('परीक्षण · ପରୀକ୍ଷା');const pdf=await r.get(`/api/referrals/${created.data.id}/download`);expect(pdf.status()).toBe(200);expect(pdf.headers()['cache-control']).toContain('no-store');expect((await pdf.body()).subarray(0,4).toString()).toBe('%PDF');
 await page.setContent(referralHtml(created.data.report as ReferralReport,created.data.id));await page.screenshot({path:testInfo.outputPath('indic-referral.png'),fullPage:true});
 const audit=await (await r.get(`/api/audit/${encounterId}`)).json();expect(audit.data.some((item:{action:string})=>item.action==='REFERRAL_PDF_DOWNLOADED')).toBe(true);
});



