import {describe,it,expect} from 'vitest';
import {webmMimeType} from '../lib/audio-format';
import {extractDocumentData} from '../lib/ocr/document-data';
describe('recording format',()=>{
 it('accepts WebM MIME codec parameters without accepting unrelated formats',()=>{
  expect(webmMimeType('audio/webm;codecs=opus')).toBe('audio/webm');
  expect(webmMimeType(' video/webm; codecs=opus ')).toBe('video/webm');
  expect(webmMimeType('audio/mp3')).toBeNull();
 });
});
describe('document separation and prescription facts',()=>{
 it('extracts only explicit prescription fields and never enables lab rules',()=>{
  const result=extractDocumentData('Tab. Paracetamol 500 mg BD 3 days\nHb 7 g/dL',{verified:false},'prescription');
  expect(result.data).not.toHaveProperty('hb');
  expect(result.data.prescriptionItems).toMatchObject([{medicine:'Paracetamol',strength:'500 mg',frequency:'BD',duration:'3 days',state:'CANDIDATE'}]);
 });
 it('keeps illegible medicine names and strengths unknown',()=>{
  const result=extractDocumentData('Tab ??? twice daily',{verified:true},'prescription');
  expect(result.data.prescriptionItems).toMatchObject([{medicine:null,strength:null,frequency:'twice daily',duration:null,state:'UNCLEAR'}]);
  expect(result.warnings).not.toEqual([]);
 });
 it('handles lab documents independently and requires staff confirmation',()=>{
  expect(extractDocumentData('Hb 9.2 g/dL',{verified:false},'report').data).not.toHaveProperty('hb');
  expect(extractDocumentData('Hb 9.2 g/dL',{verified:true},'report').data.hb).toBe(9.2);
 });
});
