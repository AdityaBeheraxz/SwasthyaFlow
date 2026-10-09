import {test,expect} from '@playwright/test';
test('intake session can authorize a same-facility doctor, override, approve an escalation and refer',async({page})=>{
 const r=page.request;expect((await r.post('/api/auth/credentials',{data:{username:'health.worker',password:'HealthWorker!2026'}})).status()).toBe(200);
 const patient=await (await r.post('/api/patients',{data:{age:45,language:'en',consent:true}})).json();const encounter=await (await r.post('/api/encounters',{data:{patientId:patient.data.id,text:'I have difficulty breathing.',language:'en',inputType:'text'}})).json(),id=encounter.data.id;
 expect((await r.post('/api/triage/analyze',{data:{encounterId:id}})).status()).toBe(200);
 expect((await r.post('/api/reviews/override',{data:{encounterId:id,newPriority:'YELLOW',reason:'Verified original source information.'}})).status()).toBe(403);
 expect((await r.post('/api/reviews/workspace',{data:{username:'receiver.scb',password:'ReceiverTestOnly!2026'}})).status()).toBe(403);
 await page.goto(`/encounters/${id}`);await expect(page.getByRole('button',{name:'Approve',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Record override'})).toBeDisabled();
 await page.getByLabel('Reviewer username').fill('doctor.ananya');await page.getByLabel('Reviewer password').fill('Doctor!2026');await page.getByRole('button',{name:'Authorize reviewer in this case'}).click();await expect(page.getByRole('button',{name:'Close reviewer authorization'})).toBeVisible();
 expect((await (await r.get('/api/session')).json()).data.id).toBe('U-101');
 await page.getByLabel('Written reason').fill('Verified original source information.');await page.getByLabel('New priority').selectOption('RED');await expect(page.getByRole('button',{name:'Record override'})).toBeDisabled();
 const same=await (await r.post('/api/reviews/override',{data:{encounterId:id,newPriority:'RED',reason:'Verified original source information.'}})).json();expect(same.error.code).toBe('NO_PRIORITY_CHANGE');expect(same.error.message).toContain('already current');
 await page.getByLabel('New priority').selectOption('YELLOW');await page.getByRole('button',{name:'Record override'}).click();await expect(page.locator('.priority-word')).toContainText('YELLOW');
 const audit=await (await r.get(`/api/audit/${id}`)).json();expect(audit.data.some((e:{action:string;userId:string})=>e.action==='RISK_OVERRIDE'&&e.userId==='U-104')).toBe(true);
 await page.getByRole('button',{name:'Escalate',exact:true}).click();await expect(page.getByText(/Age 45.*ESCALATED/)).toBeVisible();await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByRole('link',{name:'Open referrals for this patient'}).click();await expect(page.getByLabel('Referral recipient')).toBeVisible();
 await page.getByLabel('Referral recipient').selectOption('a0010000-0000-4000-8000-000000000001');await page.getByLabel('Factual referral reason').fill('Qualified review of patient-reported breathing difficulty');await page.getByLabel('I explained this report').check();await page.getByRole('button',{name:'Create referral report'}).click();await expect(page.getByRole('button',{name:'Download referral PDF'})).toBeVisible();
 await page.getByRole('button',{name:'Close reviewer authorization'}).click();await expect(page.getByRole('button',{name:'Record override'})).toBeDisabled();expect((await (await r.get('/api/session')).json()).data.id).toBe('U-101');
});
test('nurse permissions support review without doctor approval or override',async({page})=>{
 const r=page.request;await r.post('/api/auth/credentials',{data:{username:'health.worker',password:'HealthWorker!2026'}});const patient=await (await r.post('/api/patients',{data:{age:35,language:'en',consent:true}})).json(),encounter=await (await r.post('/api/encounters',{data:{patientId:patient.data.id,text:'I have fever for two days.',language:'en',inputType:'text'}})).json(),id=encounter.data.id;await r.post('/api/triage/analyze',{data:{encounterId:id}});
 await r.post('/api/reviews/workspace',{data:{username:'nurse.meera',password:'Nurse!2026'}});await page.goto(`/encounters/${id}`);await expect(page.getByRole('button',{name:'Approve',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Record override'})).toBeDisabled();await expect(page.getByRole('button',{name:'Request info'})).toBeEnabled();
 expect((await r.post('/api/reviews',{data:{encounterId:id,decision:'APPROVE'}})).status()).toBe(403);await page.getByRole('button',{name:'Request info'}).click();await expect(page.getByRole('button',{name:'Re-evaluate corrected sources'})).toBeVisible();
});

test('unverified documents explain blocked actions and verified sources enable review at mobile width',async({page})=>{
 const r=page.request;await r.post('/api/auth/credentials',{data:{username:'health.worker',password:'HealthWorker!2026'}});
 const p=await (await r.post('/api/patients',{data:{age:38,language:'en',consent:true}})).json();
 const e=await (await r.post('/api/encounters',{data:{patientId:p.data.id,text:'I have fever for two days.',language:'en',inputType:'text'}})).json(),id=e.data.id;
 await page.setContent('<div id="document" style="width:900px;height:600px;background:white;color:black;padding:40px;font:40px Arial">TEST ONLY report. Patient reports fever for two days.</div>');
 const bytes=await page.locator('#document').screenshot();
 const upload=await (await r.post('/api/reports/upload',{multipart:{encounterId:id,documentType:'report',file:{name:'source-verification-test.png',mimeType:'image/png',buffer:bytes}}})).json();expect(upload.ok).toBe(true);
 await page.setViewportSize({width:904,height:668});await page.goto(`/encounters/${id}`);
 await expect(page.getByText('1 document needs verification.',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Re-evaluate corrected sources'})).toBeDisabled();
 const overflow=await page.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth,items:Array.from(document.querySelectorAll('body *')).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right})).filter(e=>e.right>window.innerWidth+1).slice(0,15)}));
 expect(overflow.scroll,JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
 await page.getByLabel('Reviewer username').fill('receiver.scb');await page.getByLabel('Reviewer password').fill('ReceiverTestOnly!2026');await page.getByRole('button',{name:'Authorize reviewer in this case'}).click();await expect(page.locator('p[role=alert]')).toContainText('another facility');
 await page.getByLabel('Reviewer username').fill('doctor.ananya');await page.getByLabel('Reviewer password').fill('Doctor!2026');await page.getByRole('button',{name:'Authorize reviewer in this case'}).click();await expect(page.getByRole('button',{name:'Close reviewer authorization'})).toBeVisible();
 expect((await r.post('/api/reviews',{data:{encounterId:id,decision:'APPROVE'}})).status()).toBe(409);
 expect((await r.post('/api/reports/ocr',{data:{reportId:upload.data.reportId},timeout:60000})).status()).toBe(200);
 expect((await r.post('/api/reports/ocr',{data:{reportId:upload.data.reportId,reviewedText:'Patient reports fever for two days.',confirmed:true}})).status()).toBe(200);
 await page.reload();await page.getByRole('button',{name:'Re-evaluate corrected sources'}).click();await expect(page.getByRole('button',{name:'Approve',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByRole('link',{name:'Open referrals for this patient'}).click();await expect(page.getByLabel('Referral recipient')).toBeVisible();
 const audit=await (await r.get(`/api/audit/${id}?hideAccess=true`)).json();expect(audit.data.some((e:{action:string;userId:string})=>e.action==='TRIAGE_COMPLETED'&&e.userId==='U-104')).toBe(true);expect(audit.data.some((e:{action:string;userId:string})=>e.action==='OCR_REVIEW_CONFIRMED'&&e.userId==='U-104')).toBe(true);
});
