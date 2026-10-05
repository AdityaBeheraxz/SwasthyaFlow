import {z} from 'zod';

export const evidenceSchema=z.object({field:z.string(),value:z.string(),state:z.enum(['KNOWN','UNKNOWN','UNCLEAR']),source:z.string(),quote:z.string(),start:z.number().int().nonnegative().optional(),end:z.number().int().nonnegative().optional()}).strict();
export type Evidence=z.infer<typeof evidenceSchema>;
const fields=[['temperature','Current temperature',/\b(?:temperature|temp)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?\s*°?\s*[CF])\b/i,'What is the measured temperature and unit?'],['bloodPressure','Blood pressure',/\b(?:BP|blood pressure)\s*(?:is|of|:)?\s*(\d{2,3}\s*\/\s*\d{2,3})\b/i,'What is the measured blood pressure?'],['pulse','Pulse',/\b(?:pulse|heart rate)\s*(?:is|of|:)?\s*(\d{2,3}(?:\s*bpm)?)\b/i,'What is the measured pulse?'],['duration','Symptom duration',/((?:\d+|one|two|three|four|five|six|seven)\s*(?:hours?|days?|weeks?|months?)\b|(?:चार|तीन|दो|ଚାରି|ତିନି|ଦୁଇ)\s*(?:दिन|ଦିନ))/i,'When did the concern begin?'],['medications','Current medications',/\b(?:taking|takes|medications?\s*[:=]|on medication\s*[:=])\s*([^.;\n]+)/i,'Which medicines are currently being taken?'],['history','Relevant history',/\b(?:history of|previously had|medical history\s*[:=])\s*([^.;\n]+)/i,'What relevant medical history has been reported?']] as const;

export function inspectEvidence(text:string):Evidence[]{
 return fields.map(([field,label,pattern])=>{
  const match=pattern.exec(text);
  if(match)return {field,value:match[1].trim(),state:'KNOWN',source:'patient_input',quote:match[0],start:match.index,end:match.index+match[0].length};
  const mention=new RegExp(field==='bloodPressure'?'\\b(?:BP|blood pressure)\\b':field==='medications'?'\\b(?:medicine|medication|taking)\\b':field==='duration'?'\\b(?:recently|some time|a while|since)\\b':`\\b${label.split(' ').at(-1)}\\b`,'i').exec(text);
  return {field,value:label,state:mention?'UNCLEAR':'UNKNOWN',source:mention?'patient_input':'not_supplied',quote:mention?.[0]??'',...(mention?{start:mention.index,end:mention.index+mention[0].length}:{})};
 });
}

export function questionsFor(evidence:Evidence[],symptoms:string[]){
 const questions:string[]=evidence.filter(item=>item.state!=='KNOWN').flatMap(item=>{const question=fields.find(([field])=>field===item.field)?.[3];return question?[question]:[];});
 if(symptoms.includes('chest discomfort'))questions.push('Where is the discomfort located?','Is there difficulty breathing or fainting?');
 if(symptoms.some(item=>item.includes('pain')))questions.push('Is the pain continuous or intermittent, and has it worsened?');
 return [...new Set(questions)];
}

export function timelineFrom(text:string){
 const events=text.split(/(?<=[.!?;])\s+|\n/).map((quote,index)=>{
  const duration=quote.match(/\b(\d+)\s*(hours?|days?|weeks?)\b/i);
  const days=duration?Number(duration[1])*(/week/i.test(duration[2])?7:/hour/i.test(duration[2])?1/24:1):/yesterday/i.test(quote)?1:/today|this morning/i.test(quote)?0:null;
  return {quote:quote.trim(),days,index};
 }).filter(item=>item.quote&&item.days!==null).sort((a,b)=>(b.days??0)-(a.days??0)||a.index-b.index);
 return events.map(item=>`${item.days===0?'Today':`${item.days} days before intake`}: ${item.quote}`);
}
