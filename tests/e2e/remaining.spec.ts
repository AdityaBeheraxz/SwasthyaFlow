import {test,expect,type APIRequestContext} from '@playwright/test';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {readFile} from 'node:fs/promises';
async function login(request:APIRequestContext,role='health_worker'){const data=role==='administrator'?{username:'administrator',password:'Admin!2026'}:role==='medical_officer'?{username:'doctor.ananya',password:'Doctor!2026'}:{username:'health.worker',password:'HealthWorker!2026'};expect((await request.post('/api/auth/credentials',{data})).status()).toBe(200);}
async function intake(request:APIRequestContext,text='I fainted today.'){const patient=await (await request.post('/api/patients',{data:{age:40,language:'en',consent:true}})).json();const encounter=await (await request.post('/api/encounters',{data:{patientId:patient.data.id,text,language:'en',inputType:'text'}})).json();return encounter.data.id as string;}
test('sync identifiers are idempotent and conflicts do not overwrite patient data',async({request})=>{
 await login(request);const clientRequestId=crypto.randomUUID(),data={clientRequestId,age:38,language:'en',consent:true};
 const first=await (await request.post('/api/patients',{data})).json();const second=await (await request.post('/api/patients',{data})).json();expect(second.data).toEqual(first.data);
 expect((await request.post('/api/patients',{data:{...data,age:39}})).status()).toBe(409);
 const payload={clientRequestId:crypto.randomUUID(),patientId:first.data.id,text:'Cough for 2 days.',language:'en',inputType:'text'};
 const encounter=await (await request.post('/api/encounters',{data:payload})).json();expect((await (await request.post('/api/encounters',{data:payload})).json()).data).toEqual(encounter.data);
 expect((await request.post('/api/encounters',{data:{...payload,text:'Different source'}})).status()).toBe(409);
 const report={clientRequestId:crypto.randomUUID(),encounterId:encounter.data.id,rawText:'Hb 12 g/dL'};
 expect((await (await request.post('/api/reports/ocr',{data:report})).json()).data.reportId).toBe(report.clientRequestId);expect((await request.post('/api/reports/ocr',{data:report})).status()).toBe(200);
 expect((await (await request.get('/api/encounters/'+encounter.data.id)).json()).data.reports).toHaveLength(1);
});
test('offline report media syncs as an unverified source and can resume OCR',async({page})=>{
 await login(page.request);await page.goto('/intake');await page.getByRole('button',{name:'Simulate offline'}).click();await page.getByRole('spinbutton',{name:'Age',exact:true}).fill('45');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Continue to intake'}).click();
 const marker='MEDIA-'+crypto.randomUUID();await page.getByLabel('Original words / reviewed transcript').fill('Cough today. '+marker);await page.getByRole('button',{name:'Save intake'}).click();
 await expect(page.getByLabel('Capture report with camera')).toHaveAttribute('capture','environment');
 await page.getByLabel('Report document',{exact:true}).setInputFiles({name:'engineering-report.png',mimeType:'image/png',buffer:await readFile('fixtures/report-hi.png')});
 await page.getByRole('button',{name:'Save encrypted draft for sync'}).click();await expect(page.getByRole('heading',{name:'PENDING SYNC'})).toBeVisible();await page.getByRole('button',{name:'Simulated offline'}).click();await page.getByRole('button',{name:/1 PENDING SYNC/}).click();await expect(page.getByText('1 intake synced.',{exact:true})).toBeVisible();
 const queue=await (await page.request.get('/api/queue?state=INPUT_CAPTURED&sort=newest')).json();const row=queue.data.find((item:{encounter:{chiefComplaint:string}})=>item.encounter.chiefComplaint.includes(marker));expect(row).toBeTruthy();
 const stored=await (await page.request.get('/api/encounters/'+row.encounter.id)).json();expect(stored.data.reports[0]).toMatchObject({rawOcr:null,reviewedText:null});expect((await page.request.post('/api/triage/analyze',{data:{encounterId:row.encounter.id}})).status()).toBe(409);
 await page.goto('/encounters/'+row.encounter.id);await page.getByRole('button',{name:'Extract saved report text'}).click();await expect(page.getByRole('heading',{name:'Original OCR output'})).toBeVisible();
});
test('an actual network outage permits capture with a cached staff session',async({page,context})=>{
 await login(page.request);await page.goto('/intake');await page.getByRole('spinbutton',{name:'Age',exact:true}).fill('50');await page.getByRole('checkbox').check();await context.setOffline(true);
 await page.getByRole('button',{name:'Continue to intake'}).click();await page.getByLabel('Original words / reviewed transcript').fill('Fever for 3 days.');await page.getByRole('button',{name:'Save intake'}).click();await page.getByRole('button',{name:'Save encrypted draft for sync'}).click();await expect(page.getByRole('heading',{name:'PENDING SYNC'})).toBeVisible();
 await context.setOffline(false);
});
test('all structured corrections are audited and cannot silently lower RED',async({request})=>{
 await login(request);const id=await intake(request);expect((await (await request.post('/api/triage/analyze',{data:{encounterId:id}})).json()).data.note.priority).toBe('RED');
 await login(request,'medical_officer');const fields={symptoms:['cough'],duration:['2 hours'],timeline:['Today: Cough started.'],history:['No relevant history reported'],medications:['No medicines reported'],missingInformation:['Temperature'],ambiguousInformation:['Onset uncertain'],followUpQuestions:['What is the measured temperature?'],evidence:[{field:'temperature',value:'Not measured',state:'UNKNOWN',source:'not_supplied',quote:''}]};
 expect((await request.post('/api/reviews',{data:{encounterId:id,decision:'EDIT',fields}})).status()).toBe(200);
 const stored=await (await request.get('/api/encounters/'+id)).json();expect(stored.data.encounter.priorityFinal).toBe('RED');expect(stored.data.note.fieldSources.facts.patient_reported).toMatchObject({symptoms:['cough'],duration:['2 hours']});
 const audit=await (await request.get('/api/audit/'+id)).json();expect(audit.data.some((entry:{action:string})=>entry.action==='TRIAGE_EDITED')).toBe(true);
 expect((await request.get('/api/queue?priority=RED&state=IN_REVIEW&inputType=text&sort=waiting')).status()).toBe(200);
});
test('facility governance is administrator-only and analytics expose measured stages',async({request})=>{
 await login(request);expect((await request.post('/api/settings/facility',{data:{}})).status()).toBe(403);expect((await request.get('/api/analytics')).status()).toBe(403);
 await login(request,'administrator');const current=await (await request.get('/api/settings/facility')).json();const settings={legalIdentity:'Engineering test facility',privacyContact:'privacy@example.test',incidentContact:'security@example.test',consentNotice:'Record with informed consent.',processors:[],retentionDays:30};
 expect((await request.post('/api/settings/facility',{data:{name:current.data.name,type:current.data.type,location:current.data.location,settings}})).status()).toBe(200);
 expect((await (await request.get('/api/settings/facility')).json()).data.settings).toEqual(settings);
 const analytics=await (await request.get('/api/analytics')).json();expect(analytics.ok).toBe(true);expect(analytics.data.timings).toEqual(expect.arrayContaining([expect.objectContaining({stage:'triage',p95:expect.any(Number)})]));
});
test('local PDF OCR retains page coordinates and corrections require re-evaluation',async({request})=>{
 await login(request);const id=await intake(request,'I feel tired today.');const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 for(const line of ['Haemoglobin: 9.2 g/dL','Glucose: 90 mg/dL']){const page=pdf.addPage([600,800]);page.drawText(line,{x:60,y:600,size:28,font});}
 const upload=await (await request.post('/api/reports/upload',{multipart:{encounterId:id,file:{name:'two-pages.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save({useObjectStreams:false}))}}})).json();expect(upload.ok).toBe(true);
 const ocr=await (await request.post('/api/reports/ocr',{data:{reportId:upload.data.reportId}})).json();expect(ocr.ok).toBe(true);expect(ocr.data.pages).toHaveLength(2);expect(ocr.data.tokens.some((token:{page:number})=>token.page===2)).toBe(true);expect(ocr.data.rawText).toContain('9.2');
 expect((await request.get('/api/reports/page/'+upload.data.reportId+'?page=2')).status()).toBe(200);
 const confirm={reportId:upload.data.reportId,reviewedText:'Haemoglobin 9.2 g/dL\nGlucose 90 mg/dL',confirmed:true};
 expect((await request.post('/api/reports/ocr',{data:confirm})).status()).toBe(200);await request.post('/api/triage/analyze',{data:{encounterId:id}});
 expect((await request.post('/api/reports/ocr',{data:{...confirm,reviewedText:'Haemoglobin 12 g/dL\nGlucose 90 mg/dL'}})).status()).toBe(200);
 const stored=await (await request.get('/api/encounters/'+id)).json();expect(stored.data.encounter.state).toBe('INPUT_CAPTURED');expect(stored.data.reports[0].rawOcr).toContain('9.2');expect(stored.data.reports[0].reviewedText).toContain('12');
});
test('encrypted offline draft resumes after partial sync without creating duplicates',async({page})=>{
 const marker='PRIVATE-OFFLINE-'+crypto.randomUUID();await login(page.request);await page.goto('/intake');await page.getByRole('button',{name:'Simulate offline'}).click();await page.getByRole('spinbutton',{name:'Age',exact:true}).fill('35');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Continue to intake'}).click();await page.getByLabel('Original words / reviewed transcript').fill('I have cough for 2 days. '+marker);await page.getByRole('button',{name:'Save intake'}).click();await page.getByRole('button',{name:'Save encrypted draft for sync'}).click();await expect(page.getByRole('heading',{name:'PENDING SYNC'})).toBeVisible();
 const record=await page.evaluate(async()=>{const database=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('SwasthyaFlowOffline');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return await new Promise<Record<string,unknown>>((resolve,reject)=>{const r=database.transaction('pending').objectStore('pending').getAll();r.onsuccess=()=>{resolve(r.result[0]);database.close();};r.onerror=()=>reject(r.error);});});expect(record).toHaveProperty('cipher');expect(record).not.toHaveProperty('text');expect(record).not.toHaveProperty('age');expect(JSON.stringify(record)).not.toContain('PRIVATE-OFFLINE-MARKER');
 await page.route('**/api/encounters',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:{code:'INJECTED_FAILURE'}})}));
 await page.getByRole('button',{name:'Simulated offline'}).click();await page.getByRole('button',{name:/1 PENDING SYNC/}).click();await expect(page.getByText(/sync failed; retry available/)).toBeVisible();
 await page.unroute('**/api/encounters');await page.reload();await page.getByRole('button',{name:/1 PENDING SYNC/}).click();await expect(page.getByText('1 intake synced.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/1 PENDING SYNC/})).toHaveCount(0);
 const queue=await (await page.request.get('/api/queue?priority=GREEN&sort=newest')).json();expect(queue.data.filter((item:{encounter:{chiefComplaint:string}})=>item.encounter.chiefComplaint?.includes(marker))).toHaveLength(1);
});
