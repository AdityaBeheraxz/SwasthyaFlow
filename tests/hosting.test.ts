import {afterEach,describe,expect,it,vi} from 'vitest';
import {postgresPoolConfig} from '../lib/db/postgres-config';
import {supabaseStorage} from '../lib/supabase-storage';
import {hostedDemoConfigIssues} from '../lib/runtime-config';
import {demoPassword} from '../db/demo-passwords';
import {portableReferralPdf} from '../lib/referral-pdf-portable';
import {portableReportPage} from '../lib/ocr/pages';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import sharp from 'sharp';
import type {ReferralReport} from '../lib/referral-policy';
afterEach(()=>vi.unstubAllEnvs());
describe('hosted database and storage boundaries',()=>{
 it('uses a small pool and certificate validation even when the copied URL has sslmode',()=>{
  const config=postgresPoolConfig({NODE_ENV:'test',VERCEL:'1',DATABASE_URL:'postgresql://user:pass@example.test:6543/postgres?sslmode=require',DATABASE_SSL_MODE:'verify-full',DATABASE_CA_CERT:'a\\nb'});
  expect(config.max).toBe(1);expect(config.ssl).toEqual({rejectUnauthorized:true,ca:'a\nb'});expect(config.connectionString).not.toContain('sslmode');
  expect(()=>postgresPoolConfig({NODE_ENV:'test',DEPLOYMENT_MODE:'demo',DATABASE_URL:'postgres://example.test/db'})).toThrow('DATABASE_VERIFIED_TLS_REQUIRED');
 });
 it('keeps migration connections separate',()=>expect(postgresPoolConfig({NODE_ENV:'test',DATABASE_URL:'postgres://runtime.test/db',DATABASE_MIGRATION_URL:'postgres://migration.test/db'},true)).toMatchObject({max:1,connectionString:'postgres://migration.test/db'}));
 it('fails closed on missing hosted configuration and public default passwords',()=>{
  expect(hostedDemoConfigIssues({NODE_ENV:'test',VERCEL:'1'})).toContain('DEPLOYMENT_MODE');
  expect(hostedDemoConfigIssues({NODE_ENV:'test',DEPLOYMENT_MODE:'demo'})).toContain('DEMO_TEST_DATA_ONLY');
  expect(()=>demoPassword('DEMO_DOCTOR_PASSWORD',{NODE_ENV:'test',DEMO_DOCTOR_PASSWORD:'Doctor!2026reused'})).toThrow();
 });
 it('rejects a public bucket before uploading any document',async()=>{
  const send=vi.fn().mockResolvedValue(new Response(JSON.stringify({public:true})));
  const storage=supabaseStorage({NODE_ENV:'test',SUPABASE_URL:'https://unit.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-test-key',SUPABASE_STORAGE_BUCKET:'private-test'},send);
  await expect(storage.put('reports/a1.pdf',new Uint8Array([1]),'application/pdf')).rejects.toThrow('PUBLIC_STORAGE_FORBIDDEN');expect(send).toHaveBeenCalledTimes(1);
 });
 it('uses authenticated private objects and rejects traversal',async()=>{
  const send=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({public:false}))).mockResolvedValueOnce(new Response(new Uint8Array([3,4]),{headers:{'content-type':'application/pdf'}})).mockResolvedValueOnce(new Response('{}'));
  const storage=supabaseStorage({NODE_ENV:'test',SUPABASE_URL:'https://unit.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-test-key',SUPABASE_STORAGE_BUCKET:'private-test'},send);
  expect((await storage.get('reports/a1.pdf')).bytes).toEqual(new Uint8Array([3,4]));await storage.delete('reports/a1.pdf');
  expect(send.mock.calls[1][0]).toBe('https://unit.supabase.co/storage/v1/object/private-test/reports/a1.pdf');
  expect(send.mock.calls[1][1].headers.apikey).toBe('server-test-key');expect(JSON.parse(send.mock.calls[2][1].body)).toEqual({prefixes:['reports/a1.pdf']});
  await expect(storage.get('../reports/a1.pdf')).rejects.toThrow('INVALID_STORAGE_KEY');
 });
});
describe('portable PDFs',()=>{
 it('renders a scan page without Poppler',async()=>{
  const pdf=await PDFDocument.create(),page=pdf.addPage([400,600]),font=await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('TEST REPORT Hb 12.5 g/dL',{x:30,y:500,font,size:20});
  const image=await portableReportPage(await pdf.save());expect((await sharp(image).metadata()).width).toBe(800);
  await expect(portableReportPage(await pdf.save(),2)).rejects.toThrow('PAGE_NOT_FOUND');
 },30000);
 it('embeds Hindi and Odia text and paginates long summaries',async()=>{
  const report:ReferralReport={version:1,recipient:{name:'Receiving doctor',kind:'government_hospital',institution:'TEST institution',department:'Test review',registrationNumber:''},patient:{reference:'TEST-1',name:'ପରୀକ୍ଷା परीक्षण',age:30,language:'or'},sourceFacility:'Test source',doctor:'Test doctor',createdAt:'2026-10-09',reason:'Test referral purpose',summary:'Reported concern. '.repeat(800),priority:'YELLOW',consentAuthority:'self',consentVersion:'1.0-IN',deliveryStatus:'NOT_SENT'};
  const bytes=await portableReferralPdf(report,'test-referral');const pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBeGreaterThan(1);
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:Uint8Array.from(bytes)});
  try{const loaded=await task.promise;const content=await (await loaded.getPage(1)).getTextContent();const text=content.items.map(item=>'str' in item?item.str:'').join(' ');expect(text).toContain('ପରୀକ୍ଷା');expect(text).toContain('परीक्षण');}finally{await task.destroy();}
 },30000);
});
