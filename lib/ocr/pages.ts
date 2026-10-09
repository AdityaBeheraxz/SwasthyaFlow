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
 if(process.env.VERCEL==='1'||process.env.DEPLOYMENT_MODE==='demo'||process.env.PDF_RENDERER==='portable')return portableReportPage(document,page);
 const temporary=await mkdtemp(join(tmpdir(),'swasthyaflow-ocr-'));
 try{
  const input=join(temporary,'report.pdf'),prefix=join(temporary,'page');await writeFile(input,document);
  await execute(process.env.PDF_RENDERER_PATH||'pdftoppm',['-f',String(page),'-l',String(page),'-singlefile','-r','150','-scale-to','2400','-png',input,prefix],{timeout:20000,maxBuffer:1024*1024,windowsHide:true});
  return preprocessReportImage(await readFile(prefix+'.png'));
 }finally{await rm(temporary,{recursive:true,force:true});}
}

export async function portableReportPage(document:Uint8Array,page=1){
 const {createCanvas,DOMMatrix,ImageData,Path2D}=await import('@napi-rs/canvas');
 // PDF.js uses these browser drawing primitives in its Node renderer.
 Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=getDocument({data:Uint8Array.from(document),useSystemFonts:false,disableFontFace:true,useWorkerFetch:false,standardFontDataUrl:join(process.cwd(),'node_modules','pdfjs-dist','standard_fonts')+'/',cMapUrl:join(process.cwd(),'node_modules','pdfjs-dist','cmaps')+'/',cMapPacked:true,wasmUrl:join(process.cwd(),'node_modules','pdfjs-dist','wasm')+'/'});
 try{
  const pdf=await task.promise;if(pdf.numPages>10||page<1||page>pdf.numPages)throw new Error('PAGE_NOT_FOUND');
  const source=await pdf.getPage(page),base=source.getViewport({scale:1});
  const viewport=source.getViewport({scale:Math.min(2,2400/Math.max(base.width,base.height))});
  if(!Number.isFinite(viewport.width)||!Number.isFinite(viewport.height)||viewport.width<1||viewport.height<1)throw new Error('INVALID_PAGE');
  const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height)),context=canvas.getContext('2d');
  await source.render({canvas:canvas as unknown as HTMLCanvasElement,canvasContext:context as unknown as CanvasRenderingContext2D,viewport,background:'white'}).promise;
  return preprocessReportImage(canvas.toBuffer('image/png'));
 }finally{await task.destroy();}
}
