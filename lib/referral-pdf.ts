import 'server-only';
import {referralHtml,type ReferralReport} from './referral-policy';
let rendering=false;
export async function renderReferralPdf(report:ReferralReport,id:string,deliveryStatus?:string){
 if(rendering)throw new Error('PDF_BUSY');
 rendering=true;
 try{
  if(process.env.VERCEL==='1'||process.env.DEPLOYMENT_MODE==='demo'||process.env.REFERRAL_PDF_RENDERER==='portable')return await (await import('./referral-pdf-portable')).portableReferralPdf(report,id,deliveryStatus);
  const {chromium}=await import('playwright');
  const browser=await chromium.launch({...(process.env.REFERRAL_PDF_CHROME_PATH?{executablePath:process.env.REFERRAL_PDF_CHROME_PATH}:{channel:'chrome'}),headless:true,timeout:15000});
  try{const context=await browser.newContext({javaScriptEnabled:false});await context.route('**/*',route=>route.abort());const page=await context.newPage();await page.setContent(referralHtml(report,id,deliveryStatus),{timeout:10000});let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([page.pdf({format:'A4',printBackground:true}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('PDF_TIMEOUT')),15000);})]);}finally{clearTimeout(timer);}}finally{await browser.close();}
 }finally{rendering=false;}
}

