import {describe,it,expect,vi,afterEach} from 'vitest';
import {readFile} from 'node:fs/promises';
import {speechAdapter,liveSpeech} from '../lib/speech';
import {translationAdapter,liveTranslation} from '../lib/translation';
import {aiAdapter} from '../lib/ai';
import {enterpriseAi} from '../lib/ai/enterprise';
import {ocrAdapter,enterpriseOcr} from '../lib/ocr';
import {structuredFactsSchema} from '../lib/ai/types';
import {productionConfigIssues} from '../lib/runtime-config';
import manifest from '../fixtures/providers.json';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('registered Hindi and Odia provider fixtures',()=>{
 for(const language of ['hi','or'] as const){
  it(language+' runs the speech, IndicTrans2 contract, extraction and OCR boundaries',async()=>{
   vi.stubEnv('DEPLOYMENT_MODE','development');for(const name of ['ASR_MODE','TRANSLATION_MODE','EXTRACTION_MODE','OCR_MODE'])vi.stubEnv(name,'fixture');
   const audio=await readFile('fixtures/speech-'+language+'.bin');
   const speech=await speechAdapter().transcribe(new Blob([audio]),language);
   expect(speech.text).toBe(manifest.translation.find(item=>item.language===language)!.original);
   expect(speech.segments[0].confidence).toBe(language==='or'?0.65:0.96);
   const translation=await translationAdapter().normalize(speech.text,language);
   const facts=await aiAdapter().extract({text:speech.text,language,normalizedText:translation.normalized});
   expect(structuredFactsSchema.safeParse(facts).success).toBe(true);expect(facts.patient_reported).toMatchObject({symptoms:['fever'],duration:['4 days']});
   expect(facts.review_priority).toBe('PENDING_RULE_ENGINE');
   const ocr=await ocrAdapter().extract(await readFile('fixtures/report-'+language+'.png'),'image/png');
   expect(ocr.engine).toBe('fixture-ocr');expect(ocr.rawText).toContain('9.2 g/dL');
  });
 }
 it('rejects unknown inputs instead of returning a plausible transcript or report',async()=>{
  for(const name of ['ASR_MODE','TRANSLATION_MODE','EXTRACTION_MODE','OCR_MODE'])vi.stubEnv(name,'fixture');
  await expect(speechAdapter().transcribe(new Blob(['unknown']),'hi')).rejects.toThrow('FIXTURE_INPUT_NOT_REGISTERED');
  await expect(translationAdapter().normalize('कुछ और','hi')).rejects.toThrow('FIXTURE_INPUT_NOT_REGISTERED');
  await expect(aiAdapter().extract({text:'unregistered',language:'or'})).rejects.toThrow('FIXTURE_INPUT_NOT_REGISTERED');
  await expect(ocrAdapter().extract(new Uint8Array([1,2,3]),'image/png')).rejects.toThrow('not registered');
 });
 it('rejects fixture selection at production entry points',()=>{
  vi.stubEnv('DEPLOYMENT_MODE','production');for(const name of ['ASR_MODE','TRANSLATION_MODE','EXTRACTION_MODE','OCR_MODE'])vi.stubEnv(name,'fixture');
  for(const selector of [speechAdapter,translationAdapter,aiAdapter,ocrAdapter])expect(selector).toThrow('FORBIDDEN');
  const issues=productionConfigIssues();for(const name of ['ASR_MODE','TRANSLATION_MODE','EXTRACTION_MODE','OCR_MODE'])expect(issues).toContain(name);
 });
 it('rejects a misspelled mode',()=>{vi.stubEnv('TRANSLATION_MODE','fixtur');expect(translationAdapter).toThrow('INVALID');});
});
describe('live provider contracts with injected transport',()=>{
 it('sends the IndicTrans2 language pair and preserves uncertainty',async()=>{
  vi.stubEnv('TRANSLATION_API_URL','https://translation.example.test');vi.stubEnv('TRANSLATION_API_KEY','test-only');
  const fetchMock=vi.fn().mockResolvedValue(Response.json({normalized:'fever',ambiguousSpans:[{original:'x',normalized:'fever',reason:'uncertain'}]}));vi.stubGlobal('fetch',fetchMock);
  const result=await liveTranslation.normalize('x','or');expect(result.original).toBe('x');expect(result.ambiguousSpans).toHaveLength(1);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({source_language:'or',target_language:'en',model:'IndicTrans2'});
 });
 it('does not accept invented provider confidence or malformed facts',async()=>{
  vi.stubEnv('EXTRACTION_API_URL','https://extract.example.test');vi.stubEnv('EXTRACTION_API_KEY','test-only');
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({diagnosis:'anything'})));
  await expect(enterpriseAi.extract({text:'x',language:'hi'})).rejects.toThrow('AI_PARSE_FAILED');
  vi.stubEnv('OCR_API_URL','https://ocr.example.test');vi.stubEnv('OCR_API_KEY','test-only');
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({rawText:'hello',tokens:[{text:'hello',confidence:2,bbox:[0,0,1,1]}]})));
  await expect(enterpriseOcr.extract(new Uint8Array([1]),'image/png')).rejects.toThrow('invalid response');
 });
 it('ASR needs an endpoint and model and never falls back to fixture output',async()=>{
  vi.stubEnv('SPEECH_TO_TEXT_API_URL','');await expect(liveSpeech.transcribe(new Blob(['x']),'hi')).rejects.toThrow('ASR_NOT_CONFIGURED');
 });
});
