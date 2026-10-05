import {describe,it,expect} from 'vitest';
import {inspectEvidence,timelineFrom,questionsFor} from '../lib/facts';
import {localExtract} from '../lib/ai/local';
import {assemble} from '../lib/pipeline';
import {extractReportData} from '../lib/ocr/report-data';
describe('source-based facts',()=>{
 it('keeps unknown, unclear, and known measurements distinct',()=>{const fields=inspectEvidence('Temperature is high. BP 120/80. Pulse 78 bpm.');expect(fields.find(item=>item.field==='temperature')?.state).toBe('UNCLEAR');expect(fields.find(item=>item.field==='bloodPressure')).toMatchObject({state:'KNOWN',value:'120/80',quote:'BP 120/80'});expect(fields.find(item=>item.field==='history')?.state).toBe('UNKNOWN');});
 it('orders dated statements oldest first and retains exact source text',()=>expect(timelineFrom('Today I feel tired. Fever started 3 days ago. Yesterday I had pain.')).toEqual(['3 days before intake: Fever started 3 days ago.','1 days before intake: Yesterday I had pain.','Today: Today I feel tired.']));
 it('adds context questions without choosing treatment',()=>expect(questionsFor(inspectEvidence('chest discomfort'),['chest discomfort'])).toContain('Is there difficulty breathing or fainting?'));
 it('does not count an explicitly denied red symptom',()=>expect(localExtract({text:'No fainting. I have cough.',language:'en'}).patient_reported.symptoms).toEqual(['cough']));
 it('does not turn a denied Indic symptom into a positive normalized fact',()=>{expect(localExtract({text:'बुखार नहीं है।',normalizedText:'fever',language:'hi'}).patient_reported.symptoms).toEqual([]);expect(localExtract({text:'ଜ୍ୱର ନାହିଁ।',normalizedText:'fever',language:'or'}).patient_reported.symptoms).toEqual([]);});
 it('does not convert hours to days in safety rules',()=>{const facts=localExtract({text:'Fever for 4 hours.',language:'en'});facts.patient_reported.duration=['4 hours'];expect(assemble(facts,{text:'Fever for 4 hours.',language:'en'}).priority).toBe('GREEN');});
 it('preserves RED when reviewer changes the reported symptoms',()=>{const facts=localExtract({text:'I have cough.',language:'en'});expect(assemble(facts,{text:'I have cough.',language:'en'},'RED').priority).toBe('RED');});
});
describe('laboratory values',()=>{
 it('retains units, reference range and source without applying unverified values',()=>{const result=extractReportData('HAEMATOLOGY\nHaemoglobin 9.2 g/dL Reference range: 12-16\nPlatelets 150000 cells/uL',{verified:false});expect(result.data).not.toHaveProperty('hb');expect(result.data.fields).toEqual(expect.arrayContaining([expect.objectContaining({key:'hb',unit:'g/dL',referenceRange:'12-16',state:'CANDIDATE'})]));});
 it('excludes conflicting haemoglobin results from rules',()=>{const result=extractReportData('Hb 9.2 g/dL\nHb 14 g/dL',{verified:true});expect(result.data).not.toHaveProperty('hb');expect(result.warnings.join()).toContain('conflicting');});
 it('never supplies a unit for a bare value',()=>expect(extractReportData('Hb 9.2',{verified:true}).data.fields).toEqual([]));
});
