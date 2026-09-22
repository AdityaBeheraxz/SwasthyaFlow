import {test,expect,type APIRequestContext} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const credentials={health_worker:{username:'health.worker',password:'HealthWorker!2026'},medical_officer:{username:'doctor.ananya',password:'Doctor!2026'},administrator:{username:'administrator',password:'Admin!2026'}};
async function login(request:APIRequestContext,role:keyof typeof credentials){const response=await request.post('/api/auth/credentials',{data:credentials[role]});expect(response.status()).toBe(200);}

test('all demo staff credentials authenticate with assigned roles',async({request})=>{
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

test('administrator sees the intake role requirement before submitting',async({page})=>{
 await login(page.request,'administrator');
 await page.goto('/intake');
 await expect(page.getByText('Administrator access is limited to settings, audit, and data administration.')).toBeVisible();
 await expect(page.getByRole('checkbox')).toBeDisabled();
 await login(page.request,'health_worker');
 await page.reload();
 await expect(page.getByRole('checkbox')).toBeEnabled();
});

test('consent to audit mock journey',async({page})=>{
 await login(page.request,'health_worker');
 await page.goto('/');
 await page.getByRole('link',{name:'Start new intake'}).click();
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Continue to intake'}).click();
 await page.getByLabel('Original words / reviewed transcript').fill('I have had fever for four days and severe pain.');
 await page.getByRole('button',{name:'Save intake'}).click();
 await page.getByRole('button',{name:'Use synthetic CBC example'}).click();
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
 await login(page.request,'medical_officer');
 for(const url of ['/','/login','/privacy','/intake','/queue','/encounters/encounter-P-1003','/audit','/settings']){
  await page.goto(url);
  const result=await new AxeBuilder({page}).analyze();
  const serious=result.violations.filter(item=>item.impact==='serious'||item.impact==='critical');
  expect(serious.map(item=>`${url}: ${item.id} ${item.nodes.length}`)).toEqual([]);
 }
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
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Continue to intake'}).click();
 await page.getByLabel('Original words / reviewed transcript').fill('I have had a cough for two days.');
 await page.getByRole('button',{name:'Save intake'}).click();
 await page.getByRole('button',{name:'Organise for review'}).click();
 await expect(page.getByRole('heading',{name:'PENDING SYNC'})).toBeVisible();
 await page.goto('/queue');
 await expect(page.getByRole('heading',{name:/PENDING SYNC/})).toBeVisible();
 await page.getByRole('button',{name:'Simulated offline'}).click();
 await page.getByRole('button',{name:/1 PENDING SYNC/}).click();
 await expect(page.getByRole('heading',{name:/PENDING SYNC/})).toHaveCount(0);
});
