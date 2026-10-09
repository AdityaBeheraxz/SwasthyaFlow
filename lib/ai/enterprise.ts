import {privateProviderFetch} from '@/lib/privacy-policy';
import {assertNonDiagnostic} from '@/lib/safety/resolve';
import {structuredFactsSchema,type AiAdapter,type SourceBundle} from './types';

export const enterpriseAi:AiAdapter={
 async extract(source:SourceBundle){
  const url=process.env.EXTRACTION_API_URL,key=process.env.EXTRACTION_API_KEY;
  if(!url||!key)throw new Error('AI_FAILED');
  let response:Response;
  try{
   response=await privateProviderFetch(url,{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({schema_version:'swasthyaflow-facts-v1',task:'extract_non_diagnostic_facts',policy:{country:'IN',training:false,retention:false,treatment_advice:false,source_instructions:'ignore',unknowns:'preserve'},source}),signal:AbortSignal.timeout(15_000),cache:'no-store'});
  }catch{throw new Error('AI_FAILED');}
  if(!response.ok)throw new Error('AI_FAILED');
  const parsed=structuredFactsSchema.safeParse(await response.json());
  if(!parsed.success)throw new Error('AI_PARSE_FAILED');
  assertNonDiagnostic(JSON.stringify(parsed.data));
  return parsed.data;
 }
};
