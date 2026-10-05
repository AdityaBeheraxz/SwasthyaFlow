import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PDFDocument} from 'pdf-lib';
import {preprocessReportImage,type ReportMimeType} from '../file-validation';
const execute=promisify(execFile);
export async function reportPage(document:Uint8Array,mimeType:ReportMimeType,page=1){
 if(mimeType!=='application/pdf'){if(page!==1)throw new Error('PAGE_NOT_FOUND');return preprocessReportImage(document);}
 const pdf=await PDFDocument.load(document);if(page<1||page>pdf.getPageCount()||pdf.getPageCount()>10)throw new Error('PAGE_NOT_FOUND');
 const temporary=await mkdtemp(join(tmpdir(),'swasthyaflow-ocr-'));
 try{
  const input=join(temporary,'report.pdf'),prefix=join(temporary,'page');await writeFile(input,document);
  await execute(process.env.PDF_RENDERER_PATH||'pdftoppm',['-f',String(page),'-l',String(page),'-singlefile','-r','150','-scale-to','2400','-png',input,prefix],{timeout:20000,maxBuffer:1024*1024,windowsHide:true});
  return preprocessReportImage(await readFile(prefix+'.png'));
 }finally{await rm(temporary,{recursive:true,force:true});}
}
