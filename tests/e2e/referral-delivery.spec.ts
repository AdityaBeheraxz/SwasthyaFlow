import {test,expect,type APIRequestContext} from '@playwright/test';
import {PDFDocument} from 'pdf-lib';
const recipientId='a0010000-0000-4000-8000-000000000001';
async function login(r:APIRequestContext,username:string,password:string){expect((await r.post('/api/auth/credentials',{data:{username,password}})).status()).toBe(200);}
test('cross-facility referral, original documents, acceptance, print bundle and withdrawal',async({page})=>{
 page.on('pageerror',e=>console.log('Browser error: '+e.message));
 const r=page.request;await login(r,'health.worker','HealthWorker!2026');
 const patient=await (await r.post('/api/patients',{data:{name:'Synthetic referral test only',age:40,language:'en',consent:true}})).json();
 const encounter=await (await r.post('/api/encounters',{data:{patientId:patient.data.id,text:'Patient reports tiredness for two days.',language:'en',inputType:'text'}})).json(),encounterId=encounter.data.id;
 const docs:{id:string;bytes:Buffer}[]=[];
 for(const type of ['prescription','report']){
  await page.setContent(`<div id="original" style="width:900px;height:600px;background:white;color:black;padding:40px;font:40px Arial"><h1>TEST ONLY ${type}</h1><p>Patient reports tiredness.</p><p>Document date: 08 October 2026</p></div>`);
  const bytes=await page.locator('#original').screenshot();
  const uploaded=await (await r.post('/api/reports/upload',{multipart:{encounterId,documentType:type,file:{name:type+'-test.png',mimeType:'image/png',buffer:bytes}}})).json();expect(uploaded.ok).toBe(true);
  const ocr=await (await r.post('/api/reports/ocr',{data:{reportId:uploaded.data.reportId},timeout:60000})).json();expect(ocr.ok).toBe(true);
  expect((await r.post('/api/reports/ocr',{data:{reportId:uploaded.data.reportId,reviewedText:'Patient reports tiredness. Document date: 08 October 2026.',confirmed:true}})).status()).toBe(200);
  docs.push({id:uploaded.data.reportId,bytes});
 }
 expect((await r.post('/api/triage/analyze',{data:{encounterId}})).status()).toBe(200);
 await login(r,'doctor.ananya','Doctor!2026');expect((await r.post('/api/reviews',{data:{encounterId,decision:'APPROVE'}})).status()).toBe(200);
 const created=await (await r.post('/api/referrals',{data:{encounterId,recipientId,reason:'Qualified review of reported tiredness',consentConfirmed:true,consentAuthority:'self',includeName:false}})).json();expect(created.ok).toBe(true);const id=created.data.id;
 expect((await r.post(`/api/referrals/${id}/send`,{data:{electronicConsentConfirmed:false,includeAttachments:true,consentAuthority:'self'}})).status()).toBe(422);
 await page.goto(`/referrals?case=${encounterId}`);await page.getByLabel('I explained the named recipient and recorded').check();await page.getByRole('button',{name:'Send referral with documents'}).click();await expect(page.getByText('Received by local prototype inbox',{exact:false})).toBeVisible();
 // Lost acknowledgements / repeated clicks never create a second delivery.
 const duplicate=await (await r.post(`/api/referrals/${id}/send`,{data:{electronicConsentConfirmed:true,includeAttachments:true,consentAuthority:'self'}})).json();expect(duplicate.data.attempts).toBe(1);
 expect((await r.post('/api/referrals/workspace',{data:{username:'receiver.mkcg',password:'ReceiverTestOnly!2026'}})).status()).toBe(200);expect((await r.get(`/api/referrals/${id}/download?workspace=receiving`)).status()).toBe(404);expect((await r.get(`/api/referrals/${id}/attachments/${docs[0].id}?workspace=receiving`)).status()).toBe(404);
 expect((await r.post('/api/referrals/workspace',{data:{username:'receiver.scb',password:'ReceiverTestOnly!2026'}})).status()).toBe(200);await page.goto('/referrals/inbox');const card=page.locator('[data-referral-id="'+id+'"]');await expect(card.getByRole('link',{name:'prescription · prescription-test.png'})).toBeVisible();await expect(card.getByRole('link',{name:'report · report-test.png'})).toBeVisible();
 for(const doc of docs){const original=await r.get(`/api/referrals/${id}/attachments/${doc.id}?workspace=receiving`);expect(original.status()).toBe(200);expect(await original.body()).toEqual(doc.bytes);}
 expect((await r.get(`/api/encounters/${encounterId}`)).status()).toBe(200);
 await card.getByRole('button',{name:'Accept referral',exact:true}).click();await expect(card.getByText(/ACCEPTED/)).toBeVisible();
 const pending=await (await r.get('/api/referrals/inbox?status=pending')).json();expect(pending.data.some((v:{id:string})=>v.id===id)).toBe(false);
 const accepted=await (await r.get('/api/referrals/inbox?status=accepted')).json();expect(accepted.data.some((v:{id:string})=>v.id===id)).toBe(true);
 expect((await r.get('/api/referrals/inbox?cursor=invalid')).status()).toBe(400);
 const printable=await r.get(`/api/referrals/${id}/download?print=1&workspace=receiving`);expect(printable.status()).toBe(200);expect(printable.headers()['content-disposition']).toContain('inline');expect((await PDFDocument.load(await printable.body())).getPageCount()).toBeGreaterThanOrEqual(5);
 await login(r,'doctor.ananya','Doctor!2026');const saved=await (await r.get(`/api/referrals?encounterId=${encounterId}`)).json();expect(saved.data[0].decision).toBe('ACCEPTED');
 await r.post('/api/privacy/consent',{data:{patientId:patient.data.id,withdraw:true,requestConfirmed:true}});
 expect((await r.post('/api/referrals/workspace',{data:{username:'receiver.scb',password:'ReceiverTestOnly!2026'}})).status()).toBe(200);expect((await r.get(`/api/referrals/${id}/download?workspace=receiving`)).status()).toBe(404);expect((await r.get(`/api/referrals/${id}/attachments/${docs[0].id}?workspace=receiving`)).status()).toBe(404);const inbox=await (await r.get('/api/referrals/inbox')).json();expect(inbox.data.some((x:{id:string})=>x.id===id)).toBe(false);
 await login(r,'administrator','Admin!2026');expect((await r.get('/api/referrals/inbox')).status()).toBe(403);
});


