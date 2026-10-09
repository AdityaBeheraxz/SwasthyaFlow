import {describe,it,expect,vi} from 'vitest';
import {PDFDocument,PDFName,PDFString} from 'pdf-lib';
import {createHash} from 'node:crypto';
const fixture=vi.hoisted(()=>({bytes:new Uint8Array(),sha:''}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/db/server',()=>({db:async()=>({select:()=>({from:()=>({where:()=>({limit:async()=>[{fileUrl:'original.pdf',fileSha256:fixture.sha}]})})})})}));
vi.mock('@/lib/storage',()=>({reportStorageKey:(s:string)=>s,objectStorage:()=>({get:async()=>({bytes:fixture.bytes,contentType:'application/pdf'})})}));
import {appendReferralDocuments} from '@/lib/referral-bundle-pdf';
describe('original PDF referral appendix',()=>{
 it('preserves source pages and removes interactive page actions',async()=>{
  const cover=await PDFDocument.create();cover.addPage();const original=await PDFDocument.create(),page=original.addPage();page.drawText('Synthetic original report');page.node.set(PDFName.of('AA'),original.context.obj({O:{S:'JavaScript',JS:PDFString.of('unwanted()')}}));
  fixture.bytes=new Uint8Array(await original.save());fixture.sha=createHash('sha256').update(fixture.bytes).digest('hex');
  const result=await PDFDocument.load(await appendReferralDocuments(await cover.save(),[{id:crypto.randomUUID(),name:'test.pdf',documentType:'report',mime:'application/pdf',sha256:fixture.sha}]));
  expect(result.getPageCount()).toBe(3);expect(result.getPage(2).node.has(PDFName.of('AA'))).toBe(false);
 });
 it('rejects changed original bytes instead of silently omitting the attachment',async()=>{
  const cover=await PDFDocument.create();cover.addPage();fixture.sha='a'.repeat(64);
  await expect(appendReferralDocuments(await cover.save(),[{id:crypto.randomUUID(),name:'test.pdf',documentType:'report',mime:'application/pdf',sha256:fixture.sha}])).rejects.toThrow('DOCUMENT_INTEGRITY_OR_SIZE');
 });
});
