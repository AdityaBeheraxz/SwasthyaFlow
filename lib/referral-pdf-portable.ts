import 'regenerator-runtime/runtime.js';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {PDFDocument,rgb,type PDFFont} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {ReferralReport} from './referral-policy';
import {deliveryLabels} from './referral-delivery-config';

// Embedded fonts keep patient and source text intact without a system browser.
export async function portableReferralPdf(r:ReferralReport,id:string,status=r.deliveryStatus as string){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const fonts=await Promise.all(['NotoSans','NotoSansDevanagari','NotoSansOriya'].map(async name=>doc.embedFont(await readFile(join(process.cwd(),'assets','fonts',name+'.ttf')),{subset:true})));
 const choose=(value:string):PDFFont=>fonts[/[\u0b00-\u0b7f]/.test(value)?2:/[\u0900-\u097f]/.test(value)?1:0];
 const runs=(text:string)=>{const parts:{text:string;font:PDFFont}[]=[];for(const character of text){const font=choose(character),last=parts.at(-1);if(last?.font===font)last.text+=character;else parts.push({text:character,font});}return parts;};
 const width=(text:string,size:number)=>runs(text).reduce((sum,part)=>sum+part.font.widthOfTextAtSize(part.text,size),0);
 let page=doc.addPage([595.28,841.89]),y=786;
 const draw=(text:string,size:number,green=false)=>{if(y<65){page=doc.addPage([595.28,841.89]);y=786;}let x=54;for(const part of runs(text)){page.drawText(part.text,{x,y,size,font:part.font,color:green?rgb(.14,.36,.30):rgb(.09,.14,.12)});x+=part.font.widthOfTextAtSize(part.text,size);}y-=size*1.6;};
 const paragraph=(text:string,size=10)=>{for(const original of text.replace(/\r/g,'').split('\n')){let line='';for(const word of original.split(/\s+/)){const proposed=line?line+' '+word:word;if(width(proposed,size)<=487){line=proposed;continue;}if(line)draw(line,size);line='';// Break unusually long identifiers without dropping source characters.
 for(const char of word){if(width(line+char,size)>487){draw(line,size);line='';}line+=char;}}draw(line,size);}y-=7;};
 const section=(label:string,value:string)=>{if(y<105){page=doc.addPage([595.28,841.89]);y=786;}draw(label,11,true);paragraph(value);};
 paragraph('SwasthyaFlow · Referral report',19);
 paragraph('Confidential · Recipient-specific · '+(deliveryLabels[status]??status).toUpperCase());
 section('Reference',id);
 section('Recipient',`${r.recipient.name}\n${r.recipient.institution} · ${r.recipient.department}${r.recipient.registrationNumber?'\nRegistration: '+r.recipient.registrationNumber:''}`);
 section('Patient',`${r.patient.reference}${r.patient.name?' · '+r.patient.name:''}\nAge: ${r.patient.age} · Language: ${r.patient.language}`);
 section('Referring facility / approving doctor',`${r.sourceFacility}\n${r.doctor} · ${r.createdAt}`);
 section('Referral purpose',r.reason);section('Doctor-reviewed concerns',r.summary);section('Review priority',r.priority);
 paragraph('This report records source-based concerns for qualified staff review. It provides no diagnosis, treatment advice or prescription. Review priority does not determine treatment. Original documents appear in an appendix only after explicit document-sharing consent. Audio is excluded.',9);
 paragraph(`Separate recipient-specific consent recorded (${r.consentAuthority}; ${r.consentVersion}). PDF generation or printing alone does not transmit this report. Delivery status records software receipt only, not clinical acceptance or an appointment. Share only through the facility’s approved confidential handover process. Do not publish or redistribute.`,9);
 doc.getPages().forEach((item,index)=>item.drawText(`Confidential · ${index+1} / ${doc.getPageCount()}`,{x:54,y:30,size:8,font:fonts[0],color:rgb(.35,.4,.38)}));
 return Buffer.from(await doc.save());
}
