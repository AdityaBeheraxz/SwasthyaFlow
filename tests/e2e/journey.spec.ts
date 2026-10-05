import {test,expect,type APIRequestContext} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
const credentials={health_worker:{username:'health.worker',password:'HealthWorker!2026'},medical_officer:{username:'doctor.ananya',password:'Doctor!2026'},administrator:{username:'administrator',password:'Admin!2026'}};
async function login(request:APIRequestContext,role:keyof typeof credentials){const response=await request.post('/api/auth/credentials',{data:credentials[role]});expect(response.status()).toBe(200);}

test('all provisioned staff credentials authenticate with assigned roles',async({request})=>{
 const accounts=[
  {username:'health.worker',password:'HealthWorker!2026',role:'health_worker'},
  {username:'nurse.meera',password:'Nurse!2026',role:'nurse'},
  {username:'doctor.ananya',password:'Doctor!2026',role:'medical_officer'},
  {username:'doctor.vikram',password:'Doctor!2026',role:'medical_officer'},
  {username:'administrator',password:'Admin!2026',role:'administrator'},
 ];
 expect((await request.post('/api/auth/credentials',{data:{username:'administrator',password:'incorrect-password'}})).status()).toBe(401);
 for(const account of accounts){expect((await request.post('/api/auth/credentials',{data:{username:account.username,password:account.password}})).status()).toBe(200);const session=await (await request.get('/api/session')).json();expect(session.data.role).toBe(account.role);}
 expect((await request.post('/api/session',{data:{userId:'U-105'}})).status()).toBe(405);
});

test('navbar collapses into an accessible sheet at the commented viewport',async({page})=>{
 await page.setViewportSize({width:1119,height:872});
 await page.goto('/');
 await expect(page.getByRole('button',{name:'Open navigation'})).toBeVisible();
 await page.getByRole('button',{name:'Open navigation'}).click();
 await expect(page.getByRole('navigation',{name:'Mobile main navigation'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Privacy',exact:true}).first()).toBeVisible();
});

test('administrator sees the intake role requirement before submitting',async({page})=>{
 await login(page.request,'administrator');
 await page.goto('/intake');
 await expect(page.getByText('Administrator access is limited to settings, audit, and data administration.')).toBeVisible();
 await expect(page.getByRole('checkbox')).toBeDisabled();
 await login(page.request,'health_worker');
 await page.reload();
 await expect(page.getByRole('checkbox')).toBeEnabled();
});

test('consent to audit review journey',async({page})=>{
 await login(page.request,'health_worker');
 await page.goto('/');
 await page.getByRole('link',{name:'Start new intake'}).click();
 await page.getByRole('spinbutton',{name:'Age',exact:true}).fill('46');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Continue to intake'}).click();
 await page.getByLabel('Original words / reviewed transcript').fill('I have had fever for four days and severe pain.');
 await page.getByRole('button',{name:'Save intake'}).click();
 await page.getByLabel('Staff-entered report text').fill('Haemoglobin: 9.2 g/dL');
 await page.getByRole('button',{name:'Organise for review'}).click();
 await expect(page.getByText('Ready for review')).toBeVisible();
 await page.getByRole('link',{name:'Open triage card'}).click();
 await expect(page).toHaveURL(/\/encounters\//);
 await expect(page.locator('.priority-word')).toContainText('YELLOW');
 await login(page.request,'medical_officer');
 await page.reload();
 await page.getByLabel('Summary').fill('Patient reports fever and severe pain for four days.');
 await page.getByRole('button',{name:'Save reviewer edit'}).click();
 await page.getByRole('button',{name:'Approve',exact:true}).click();
 await page.getByRole('button',{name:'Prepare referral draft'}).click();
 await page.getByRole('button',{name:'Save referral'}).click();
 await page.getByRole('button',{name:'Complete encounter'}).click();
 await page.getByRole('link',{name:'View encounter audit'}).click();
 await expect(page.getByText('REFERRAL_GENERATED').first()).toBeVisible();
 await expect(page.getByText('ENCOUNTER_COMPLETED').first()).toBeVisible();
});

test('key screens have no serious axe findings',async({page})=>{
 await login(page.request,'health_worker');
 const patient=await (await page.request.post('/api/patients',{data:{age:41,language:'en',consent:true}})).json();
 const encounter=await (await page.request.post('/api/encounters',{data:{patientId:patient.data.id,text:'I have had a cough for two days.',language:'en',inputType:'text'}})).json();
 await page.request.post('/api/triage/analyze',{data:{encounterId:encounter.data.id}});
 await login(page.request,'medical_officer');
 for(const url of ['/','/login','/privacy','/intake','/queue',`/encounters/${encounter.data.id}`,'/audit','/settings']){
  await page.goto(url);
  const result=await new AxeBuilder({page}).analyze();
  const serious=result.violations.filter(item=>item.impact==='serious'||item.impact==='critical');
  expect(serious.map(item=>`${url}: ${item.id} ${item.nodes.length}`)).toEqual([]);
 }
});

test('real OCR requires staff verification before a report value affects priority',async({request})=>{
 await login(request,'health_worker');
 const patient=await (await request.post('/api/patients',{data:{age:52,language:'en',consent:true}})).json();
 const encounter=await (await request.post('/api/encounters',{data:{patientId:patient.data.id,text:'I have felt tired for three days.',language:'en',inputType:'text'}})).json();
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900"><rect width="100%" height="100%" fill="white"/><text x="100" y="180" font-family="Arial" font-size="64">Laboratory Report</text><text x="100" y="330" font-family="Arial" font-size="58">Haemoglobin: 9.2 g/dL</text></svg>';
 const image=await sharp(Buffer.from(svg)).png().toBuffer();
 const uploaded=await (await request.post('/api/reports/upload',{multipart:{encounterId:encounter.data.id,file:{name:'report.png',mimeType:'image/png',buffer:image}}})).json();
 expect(uploaded.ok).toBe(true);
 const ocr=await (await request.post('/api/reports/ocr',{data:{reportId:uploaded.data.reportId}})).json();
 expect(ocr.data.rawText).toContain('9.2 g/dL');
 const blocked=await request.post('/api/triage/analyze',{data:{encounterId:encounter.data.id}});
 expect(blocked.status()).toBe(409);
 const confirmed=await (await request.post('/api/reports/ocr',{data:{reportId:uploaded.data.reportId,reviewedText:ocr.data.rawText,confirmed:true}})).json();
 expect(confirmed).toMatchObject({ok:true,data:{extractedData:{hb:9.2,reviewStatus:'HUMAN_VERIFIED'}}});
 const triage=await (await request.post('/api/triage/analyze',{data:{encounterId:encounter.data.id}})).json();
 expect(triage.data.note.priority).toBe('YELLOW');
 const stored=await (await request.get(`/api/encounters/${encounter.data.id}`)).json();
 expect(stored.data.reports[0]).toMatchObject({qualityStatus:'HUMAN_VERIFIED',rawOcr:expect.stringContaining('9.2 g/dL'),reviewedText:expect.stringContaining('9.2 g/dL'),extractedData:{hb:9.2,reviewStatus:'HUMAN_VERIFIED'}});
});

test('RED override requires reason and writes audit',async({request})=>{
 await login(request,'health_worker');
 const patient=await (await request.post('/api/patients',{data:{age:62,language:'en',consent:true}})).json();
 const encounter=await (await request.post('/api/encounters',{data:{patientId:patient.data.id,text:'I fainted this morning.',language:'en',inputType:'text'}})).json();
 const id=encounter.data.id as string;
 const triage=await (await request.post('/api/triage/analyze',{data:{encounterId:id}})).json();
 expect(triage.data.note.priority).toBe('RED');
 await login(request,'medical_officer');
 const rejected=await request.post('/api/reviews/override',{data:{encounterId:id,newPriority:'YELLOW',reason:''}});
 expect(rejected.status()).toBe(422);
 const accepted=await request.post('/api/reviews/override',{data:{encounterId:id,newPriority:'YELLOW',reason:'Verified original source information.'}});
 expect(accepted.status()).toBe(200);
 const audit=await (await request.get(`/api/audit/${id}`)).json();
 expect(audit.data.some((item:{action:string})=>item.action==='RISK_OVERRIDE')).toBe(true);
});

test('required rules stay protected and purge leaves tombstone',async({request})=>{
 await login(request,'administrator');
 const versions=await (await request.get('/api/settings/rules')).json();
 const active=versions.data.find((item:{active:boolean})=>item.active);
 const weakened=active.rules.map((rule:{rule_id:string})=>rule.rule_id==='R001'?{...rule,priority:'GREEN'}:rule);
 expect((await request.post('/api/settings/rules',{data:{rules:weakened}})).status()).toBe(422);
 expect((await request.post('/api/settings/rules',{data:{rules:active.rules}})).status()).toBe(201);
 await login(request,'health_worker');
 const patient=await (await request.post('/api/patients',{data:{age:30,language:'en',consent:true}})).json();
 const encounter=await (await request.post('/api/encounters',{data:{patientId:patient.data.id,text:'I have had a cough.',language:'en',inputType:'text'}})).json();
 const id=encounter.data.id as string;
 await login(request,'administrator');
 expect((await request.post('/api/privacy/purge',{data:{encounterId:id}})).status()).toBe(200);
 expect((await request.get(`/api/encounters/${id}`)).status()).toBe(404);
 const audit=await (await request.get(`/api/audit/${id}`)).json();
 expect(audit.data.some((item:{action:string})=>item.action==='ENCOUNTER_PURGED')).toBe(true);
});

test('offline intake stays pending until confirmed sync',async({page})=>{
 await login(page.request,'health_worker');
 await page.goto('/intake');
 await page.getByRole('button',{name:'Simulate offline'}).click();
 await page.getByRole('spinbutton',{name:'Age',exact:true}).fill('35');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Continue to intake'}).click();
 await page.getByLabel('Original words / reviewed transcript').fill('I have had a cough for two days.');
 await page.getByRole('button',{name:'Save intake'}).click();
 await page.getByRole('button',{name:'Save encrypted draft for sync'}).click();
 await expect(page.getByRole('heading',{name:'PENDING SYNC'})).toBeVisible();
 await page.goto('/queue');
 await expect(page.getByRole('heading',{name:/PENDING SYNC/})).toBeVisible();
 await page.getByRole('button',{name:'Simulated offline'}).click();
 await page.getByRole('button',{name:/1 PENDING SYNC/}).click();
 await expect(page.getByRole('heading',{name:/PENDING SYNC/})).toHaveCount(0);
});
