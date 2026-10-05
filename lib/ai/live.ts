import {assertNonDiagnostic} from '@/lib/safety/resolve';
import {structuredFactsSchema,type AiAdapter,type SourceBundle,type StructuredFacts} from './types';
const responseSchema={type:'OBJECT',properties:{patient_reported:{type:'OBJECT',properties:{symptoms:{type:'ARRAY',items:{type:'STRING'}},duration:{type:'ARRAY',items:{type:'STRING'}},history:{type:'ARRAY',items:{type:'STRING'}},medications:{type:'ARRAY',items:{type:'STRING'}}},required:['symptoms','duration','history','medications']},timeline:{type:'ARRAY',items:{type:'STRING'}},report_data:{type:'ARRAY',items:{type:'STRING'}},missing_information:{type:'ARRAY',items:{type:'STRING'}},ambiguous_information:{type:'ARRAY',items:{type:'STRING'}},follow_up_questions:{type:'ARRAY',items:{type:'STRING'}},risk_signals:{type:'ARRAY',items:{type:'STRING'}},review_priority:{type:'STRING'}},required:['patient_reported','timeline','report_data','missing_information','ambiguous_information','follow_up_questions','risk_signals','review_priority']};
async function request(source:SourceBundle,repair=false):Promise<StructuredFacts>{
 if(process.env.DEPLOYMENT_MODE==='production')throw new Error('AI_FAILED');
 if(!process.env.AI_API_KEY||!process.env.AI_API_URL)throw new Error('AI_FAILED');
 const prompt=`Organize the following anonymous source information into the required JSON fields. Keep unknowns unknown. Never diagnose, prescribe, recommend treatment, or choose a priority. Set review_priority exactly to PENDING_RULE_ENGINE. Original (${source.language}): ${source.text}\nNormalized: ${source.normalizedText??''}\nReport: ${source.reportText??''}${repair?'\nYour previous output was invalid. Return only valid JSON in the exact schema.':''}`;
 const response=await fetch(process.env.AI_API_URL,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':process.env.AI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',responseSchema}}),signal:AbortSignal.timeout(15_000)});
 if(!response.ok)throw new Error('AI_FAILED');
 const payload:unknown=await response.json();
 if(typeof payload!=='object'||payload===null||!('candidates' in payload)||!Array.isArray(payload.candidates))throw new Error('AI_PARSE_FAILED');
 const candidate=payload.candidates[0] as {content?:{parts?:{text?:string}[]}}|undefined;
 const text=candidate?.content?.parts?.[0]?.text;
 if(!text)throw new Error('AI_PARSE_FAILED');
 let json:unknown;try{json=JSON.parse(text);}catch{throw new Error('AI_PARSE_FAILED');}
 const parsed=structuredFactsSchema.safeParse(json);if(!parsed.success)throw new Error('AI_PARSE_FAILED');
 assertNonDiagnostic(JSON.stringify(parsed.data));return parsed.data;
}
export const liveAi:AiAdapter={async extract(source){try{return await request(source);}catch(error){if(error instanceof Error&&error.message==='AI_PARSE_FAILED')return request(source,true);throw error;}}};
