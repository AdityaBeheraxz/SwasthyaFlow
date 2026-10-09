import {test,expect} from '@playwright/test';
for(const [language,text,expected] of [['hi','रक्त परीक्षण',/[\u0900-\u097f]/],['or','ରକ୍ତ ପରୀକ୍ଷା',/[\u0b00-\u0b7f]/]] as const){
 test(`real local Tesseract reads printed ${language} without automatic verification`,async({page})=>{
  await page.request.post('/api/auth/credentials',{data:{username:'health.worker',password:'HealthWorker!2026'}});
  const patient=await (await page.request.post('/api/patients',{data:{age:40,language,consent:true}})).json();const encounter=await (await page.request.post('/api/encounters',{data:{patientId:patient.data.id,text:'Tired for two days.',language,inputType:'text'}})).json();
  await page.setViewportSize({width:1600,height:700});await page.setContent(`<div id="document" style="background:white;color:black;width:1400px;height:500px;padding:60px;font:64px 'Nirmala UI',Arial,sans-serif">${text}<p>Haemoglobin: 9.2 g/dL</p></div>`);const buffer=await page.locator('#document').screenshot();
  const uploaded=await (await page.request.post('/api/reports/upload',{multipart:{encounterId:encounter.data.id,documentType:'report',file:{name:'printed-language-test.png',mimeType:'image/png',buffer}}})).json();expect(uploaded.ok).toBe(true);
  const result=await (await page.request.post('/api/reports/ocr',{data:{reportId:uploaded.data.reportId},timeout:60000})).json();expect(result.ok).toBe(true);expect(result.data.rawText).toMatch(expected);expect(result.data.rawText).toContain('9.2');const saved=await (await page.request.get('/api/encounters/'+encounter.data.id)).json();expect(saved.data.reports[0].ocrEngine).toBe('tesseract.js');expect(saved.data.reports[0].reviewedText).toBeNull();expect((await page.request.post('/api/triage/analyze',{data:{encounterId:encounter.data.id}})).status()).toBe(409);
 });
}
