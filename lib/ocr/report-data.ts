import type {OcrToken} from '@/lib/ocr';

type ExtractionOptions={verified:boolean;tokens?:OcrToken[];meanConfidence?:number};

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
 const match=rawText.match(/(?:Hb|Hgb|Haemoglobin|Hemoglobin)\s*(?:[:=\-]|is)?\s*(\d{1,2}(?:\.\d+)?)\s*(g\s*\/\s*dL|g\/dL)/i);
 if(!match)return {data,warnings};
 const value=Number(match[1]);
 const confidence=confidenceFor(match[0],tokens,meanConfidence);
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
