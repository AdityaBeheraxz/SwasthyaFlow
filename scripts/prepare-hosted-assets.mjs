import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const manifest=JSON.parse(await readFile(new URL('../assets/ocr/manifest.json',import.meta.url),'utf8'));
if(process.env.VERCEL==='1'||process.argv.includes('--force')){
 const directory=new URL('../assets/ocr/',import.meta.url);await mkdir(directory,{recursive:true});
 for(const model of manifest){
  const destination=new URL(model.file,directory);
  const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');
  const existing=await readFile(destination).catch(()=>null);
  if(existing&&checksum(existing)===model.sha256)continue;
  const response=await fetch(model.url,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error('OCR model download failed: '+model.file);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>20_000_000||checksum(bytes)!==model.sha256)throw new Error('OCR model integrity check failed: '+model.file);
  await writeFile(destination,bytes);console.log('Prepared '+model.file+' at '+fileURLToPath(directory));
 }
}
