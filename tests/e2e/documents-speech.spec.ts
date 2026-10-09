import {test,expect} from '@playwright/test';
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
async function image(text:string){return sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="white"/><text x="80" y="200" font-family="Arial" font-size="54">'+text+'</text></svg>')).png().toBuffer();}
test('patient name persists and prescription/report files are independently extracted and verified',async({page})=>{
 await page.request.post('/api/auth/credentials',{data:{username:'health.worker',password:'HealthWorker!2026'}});
 await page.goto('/intake');await page.getByLabel('Patient name',{exact:true}).fill('Engineering Test Patient');await page.getByRole('spinbutton',{name:'Age',exact:true}).fill('42');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Continue to intake'}).click();await page.getByLabel('Original words / reviewed transcript').fill('I have a cough.');await page.getByRole('button',{name:'Save intake'}).click();
 await page.getByLabel('Prescription document',{exact:true}).setInputFiles({name:'prescription.png',mimeType:'image/png',buffer:await image('Tab Paracetamol 500 mg BD 3 days')});
 await page.getByLabel('Report document',{exact:true}).setInputFiles([{name:'lab-one.png',mimeType:'image/png',buffer:await image('Haemoglobin: 9.2 g/dL')},{name:'lab-two.png',mimeType:'image/png',buffer:await image('Glucose: 90 mg/dL')}]);
 await expect(page.getByLabel('Capture report with camera')).toHaveCount(0);
 await expect(page.getByLabel('Camera document type')).toHaveCount(0);
 await expect(page.getByRole('heading',{name:/Prescription · prescription.png/})).toBeVisible();
 await expect(page.getByRole('heading',{name:/Lab \/ clinical report · lab-one.png/})).toBeVisible();
 await expect(page.getByRole('heading',{name:/Lab \/ clinical report · lab-two.png/})).toBeVisible();
 await expect(page.locator('[data-document-picker="prescription"] [role="status"]')).toContainText('prescription.png');
 await expect(page.locator('[data-document-picker="prescription"] [role="status"]')).not.toContainText('lab-one.png');
 await expect(page.locator('[data-document-picker="report"] [role="status"]')).toContainText('lab-one.png');
 await expect(page.locator('[data-document-picker="report"] [role="status"]')).toContainText('lab-two.png');
 await expect(page.locator('[data-document-picker="report"] [role="status"]')).not.toContainText('prescription.png');
 for(const name of ['prescription.png','lab-one.png','lab-two.png']){const card=page.locator('article').filter({has:page.getByRole('heading',{name:new RegExp(name.replace('.', '\\.'))})});await card.getByRole('button',{name:name==='prescription.png'?'Extract prescription':'Extract report',exact:true}).click();await expect(page.getByLabel('Reviewed text · '+name)).not.toHaveValue('');}
 await expect(page.getByLabel('Reviewed text · prescription.png')).toHaveValue(/Paracetamol/);
 for(const name of ['prescription.png','lab-one.png'])await page.getByRole('button',{name:'Confirm '+name,exact:true}).click();
 await expect(page.getByRole('button',{name:'Confirm every document first'})).toBeDisabled();
 await page.getByRole('button',{name:'Confirm lab-two.png',exact:true}).click();await page.getByRole('button',{name:'Organise for review'}).click();await expect(page.getByText('Ready for review',{exact:true})).toBeVisible();await page.getByRole('link',{name:'Open triage card'}).click();
 await expect(page.getByText('Patient: Engineering Test Patient',{exact:true})).toBeVisible();
 const id=page.url().split('/').at(-1);const stored=await (await page.request.get('/api/encounters/'+id)).json();expect(stored.data.reports).toHaveLength(3);expect(stored.data.reports.every((item:{ocrEngine:string})=>item.ocrEngine==='tesseract.js')).toBe(true);
 const prescription=stored.data.reports.find((item:{documentType:string})=>item.documentType==='prescription');
 expect(prescription.extractedData).not.toHaveProperty('hb');expect(prescription.extractedData.prescriptionItems).toMatchObject([{medicine:'Paracetamol',strength:'500 mg',frequency:'BD',duration:'3 days',state:'HUMAN_VERIFIED'}]);
 expect(stored.data.note.fieldSources.facts.report_data.join('\n')).toContain('Glucose');expect(stored.data.encounter.priorityFinal).toBe('YELLOW');
});
test('WebM codec parameters reach local ASR and transcribe the actual test recording',async({request})=>{
 test.skip(process.env.ASR_MODE!=='local','Requires the installed local model and the generated local reference recording.');
 test.setTimeout(150000);await request.post('/api/auth/credentials',{data:{username:'health.worker',password:'HealthWorker!2026'}});
 const patient=await (await request.post('/api/patients',{data:{age:30,language:'en',consent:true}})).json();
 const response=await request.post('/api/speech/transcribe',{multipart:{patientId:patient.data.id,langHint:'en',audio:{name:'speech.webm',mimeType:'audio/webm;codecs=opus',buffer:await readFile('.data/asr-reference.webm')}},timeout:130000});
 const result=await response.json();expect(result,{message:JSON.stringify(result)}).toMatchObject({ok:true,data:{text:expect.stringMatching(/cough/i),language:'en'}});expect(result.data.segments.length).toBeGreaterThan(0);
});
