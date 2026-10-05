import type {OcrToken} from '@/lib/ocr';

type ExtractionOptions={verified:boolean;tokens?:OcrToken[];meanConfidence?:number};
export type ReportField={key:string;label:string;value:number;unit:string;sourceText:string;confidence:number;state:'CANDIDATE'|'HUMAN_VERIFIED'|'UNCLEAR';referenceRange?:string};
const laboratoryFields=[
 {key:'hb',label:'Haemoglobin',names:'Hb|Hgb|Haemoglobin|Hemoglobin|हीमोग्लोबिन|ହିମୋଗ୍ଲୋବିନ',units:'g\\s*\\/\\s*dL',min:2,max:25},
 {key:'wbc',label:'White blood cells',names:'WBC|White blood cells?|Total leukocyte count',units:'(?:x\\s*10\\^?3\\s*\\/\\s*[uµ]L|cells\\s*\\/\\s*[uµ]L|\\/\\s*cumm)',min:0,max:200000},
 {key:'platelets',label:'Platelets',names:'Platelets?|Platelet count',units:'(?:x\\s*10\\^?3\\s*\\/\\s*[uµ]L|cells\\s*\\/\\s*[uµ]L|\\/\\s*cumm)',min:0,max:2000000},
 {key:'glucose',label:'Glucose',names:'(?:Fasting |Random |Blood )?glucose|FBS|RBS',units:'(?:mg\\s*\\/\\s*dL|mmol\\s*\\/\\s*L)',min:0,max:1500},
 {key:'creatinine',label:'Creatinine',names:'(?:Serum )?creatinine',units:'(?:mg\\s*\\/\\s*dL|[uµ]mol\\s*\\/\\s*L)',min:0,max:2000},
 {key:'sodium',label:'Sodium',names:'(?:Serum )?sodium',units:'(?:mmol\\s*\\/\\s*L|mEq\\s*\\/\\s*L)',min:0,max:250},
 {key:'potassium',label:'Potassium',names:'(?:Serum )?potassium',units:'(?:mmol\\s*\\/\\s*L|mEq\\s*\\/\\s*L)',min:0,max:20},
 {key:'hba1c',label:'HbA1c',names:'HbA1c|Glycated haemoglobin|Glycated hemoglobin',units:'%',min:0,max:30},
] as const;

function confidenceFor(source:string,tokens:OcrToken[]|undefined,fallback:number){
 if(!tokens?.length)return fallback;
 const normalized=source.toLowerCase();
 const relevant=tokens.filter(token=>normalized.includes(token.text.toLowerCase()));
 const pool=relevant.length?relevant:tokens;
 return pool.reduce((total,token)=>total+token.confidence,0)/pool.length;
}

export function extractReportData(rawText:string,{verified,tokens,meanConfidence=1}:ExtractionOptions){
 const warnings:string[]=[];
 const data:Record<string,unknown>={reviewStatus:verified?'HUMAN_VERIFIED':'REQUIRES_HUMAN_VERIFICATION'};
 const fields:ReportField[]=[];
 for(const definition of laboratoryFields){
  const pattern=new RegExp(`(?<![\\p{L}\\p{N}])(?:${definition.names})\\s*(?:[:=\\-]|is)?\\s*(\\d+(?:\\.\\d+)?)\\s*(${definition.units})(?![A-Za-z])(?:[ \\t]+(?:ref(?:erence)?(?: range)?[: ]*)?(\\d+(?:\\.\\d+)?\\s*[-–]\\s*\\d+(?:\\.\\d+)?))?`,'giu');
  const matches=[...rawText.matchAll(pattern)];
  for(const found of matches){
   const value=Number(found[1]);
   const valid=value>=definition.min&&value<=definition.max&&new Set(matches.map(item=>`${item[1]} ${item[2]}`)).size===1;
   fields.push({key:definition.key,label:definition.label,value,unit:found[2].replace(/\s/g,''),sourceText:found[0],confidence:Number(confidenceFor(found[0],tokens,meanConfidence).toFixed(3)),state:valid?(verified?'HUMAN_VERIFIED':'CANDIDATE'):'UNCLEAR',...(found[3]?{referenceRange:found[3]}:{})});
   if(!valid)warnings.push(`${definition.label} has conflicting values or an unsupported range. Verify the source; it was excluded from rules.`);
  }
 }
 data.fields=fields;
 data.sections=rawText.split(/\n/).filter(line=>/^[A-Z][A-Z /&-]{4,}$/.test(line.trim()));
 data.medicationMentions=rawText.split(/\n/).filter(line=>/\b(?:medication|medicine|tablet|capsule|syrup)\b/i.test(line)).map(sourceText=>({sourceText,state:verified?'HUMAN_VERIFIED':'CANDIDATE'}));
 const match=rawText.match(/(?<![\p{L}\p{N}])(?:Hb|Hgb|Haemoglobin|Hemoglobin|हीमोग्लोबिन|ହିମୋଗ୍ଲୋବିନ)\s*(?:[:=\-]|is)?\s*(\d{1,2}(?:\.\d+)?)\s*(g\s*\/\s*dL)(?![A-Za-z])/iu);
 if(!match)return {data,warnings};
 const value=Number(match[1]);
 const confidence=confidenceFor(match[0],tokens,meanConfidence);
 if(fields.some(field=>field.key==='hb'&&field.state==='UNCLEAR'))return {data,warnings};
 if(!Number.isFinite(value)||value<2||value>25){
  warnings.push('A possible haemoglobin value was found outside the supported validation range and was not accepted.');
  data.candidateHemoglobin={sourceText:match[0],confidence,reason:'OUT_OF_RANGE'};
  return {data,warnings};
 }
 const candidate={value,unit:'g/dL',sourceText:match[0],confidence:Number(confidence.toFixed(3))};
 if(!verified){
  data.candidateHemoglobin=candidate;
  warnings.push('Confirm the haemoglobin value against the original report before it can affect safety rules.');
  return {data,warnings};
 }
 data.hb=value;
 data.hbUnit='g/dL';
 data.hbSourceText=match[0];
 data.hbConfidence=1;
 return {data,warnings};
}
