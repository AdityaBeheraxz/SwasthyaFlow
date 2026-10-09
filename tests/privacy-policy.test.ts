import {afterEach,describe,expect,it,vi} from 'vitest';
import {assertNonDiagnostic} from '../lib/safety/resolve';
import {assertPrivateProvider,canReadClinicalCase,privateProviderFetch} from '../lib/privacy-policy';
import {enforceFactsPolicy} from '../lib/ai/output-policy';
import {localExtract} from '../lib/ai/local';
import {administrativeMetadata} from '../lib/audit-privacy';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('confidentiality and non-treatment policy',()=>{
 for(const text of ['Take paracetamol twice daily.','You should use insulin.','Recommended treatment: antibiotics.','दवा लें','पैरासिटामोल शुरू करें','औषधि नहीं, दवा लीजिए','ଔଷଧ ନିଅନ୍ତୁ','ବଟିକା ଖାଆନ୍ତୁ','dawai lo','Start taking ibuprofen.','Take ५०० mg','Take para\u200bcetamol tablets.'])it('rejects '+text,()=>expect(()=>assertNonDiagnostic(text)).toThrow('AI_PARSE_FAILED'));
 it('retains a reported medication as evidence rather than advice',()=>expect(()=>assertNonDiagnostic('Patient reports taking insulin.')).not.toThrow());
 it('blocks remote transport before fetch when approval is absent',async()=>{const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);vi.stubEnv('EXTERNAL_PROCESSING_APPROVED','');await expect(privateProviderFetch('https://provider.example.test',{method:'POST',body:'private'})).rejects.toThrow('EXTERNAL_PROCESSING_BLOCKED');expect(fetchMock).not.toHaveBeenCalled();});
 it('requires approved Indian processing and exact HTTPS origin',()=>{
  const env:NodeJS.ProcessEnv={NODE_ENV:'test',EXTERNAL_PROCESSING_APPROVED:'true',PROVIDER_NO_TRAINING_APPROVED:'true',PROVIDER_NO_RETENTION_APPROVED:'true',PROVIDER_DATA_REGION:'IN',ALLOWED_PROVIDER_ORIGINS:'https://approved.example.test'};
  expect(()=>assertPrivateProvider('https://approved.example.test/extract',env)).not.toThrow();
  for(const url of ['http://approved.example.test','https://approved.example.test.evil.test','https://other.example.test'])expect(()=>assertPrivateProvider(url,env)).toThrow();
  expect(()=>assertPrivateProvider('https://approved.example.test',{...env,PROVIDER_DATA_REGION:'US'})).toThrow();
 });
 it('does not give administrators clinical case access',()=>{expect(canReadClinicalCase('administrator')).toBe(false);expect(canReadClinicalCase('medical_officer')).toBe(true);expect(canReadClinicalCase('guest')).toBe(false);});
 it('does not disclose narrative override reasons in administrative audit metadata',()=>expect(administrativeMetadata({reason:'Patient name and history',new_priority:'YELLOW',symptoms:'fever',policy_version:'2.0-IN'})).toEqual({new_priority:'YELLOW',policy_version:'2.0-IN'}));
 it('rejects advice hidden in model follow-up questions',()=>{const source={text:'Cough for 2 days.',language:'en'};expect(()=>enforceFactsPolicy({...localExtract(source),follow_up_questions:['Should the patient take antibiotics?']},source)).toThrow('AI_PARSE_FAILED');});
 it('rejects invented medication history',()=>{const source={text:'Cough for 2 days.',language:'en'};const facts=localExtract(source);facts.patient_reported.medications=['insulin'];expect(()=>enforceFactsPolicy(facts,source)).toThrow('AI_PARSE_FAILED');});
 it('rejects disease labels invented from symptoms',()=>{const source={text:'Cough for 2 days.',language:'en'};const facts=localExtract(source);facts.patient_reported.symptoms=['pneumonia'];expect(()=>enforceFactsPolicy(facts,source)).toThrow('AI_PARSE_FAILED');});
 it('preserves Hinglish negation and recognizes a limited reported symptom',()=>{expect(localExtract({text:'Bukhar nahi hai. Khansi hai.',language:'hi'}).patient_reported.symptoms).toEqual(['cough']);});
 it('replaces model report inventions with linked original evidence',()=>{const source={text:'Cough for 2 days.',language:'en',reportText:'Hb 12 g/dL'};const facts=localExtract(source);facts.report_data=['invented result'];expect(enforceFactsPolicy(facts,source).report_data).toEqual(['Hb 12 g/dL']);});
});
