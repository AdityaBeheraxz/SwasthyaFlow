import {describe,it,expect} from 'vitest';
import {uiCatalog} from '../lib/ui-catalog';
import {translateUi} from '../lib/ui-translations';
import {validUiLanguage} from '../lib/ui-language';

describe('website language',()=>{
 it('supplies Hindi and Odia for every catalog entry',()=>{
  expect(Object.keys(uiCatalog).length).toBeGreaterThan(500);
  for(const [key,value] of Object.entries(uiCatalog)){
   expect(key.trim()).not.toBe('');
   expect(value.hi?.trim(),key).toBeTruthy();
   expect(value.or?.trim(),key).toBeTruthy();
  }
 });
 it('keeps English and unrecognized source information unchanged',()=>{
  expect(translateUi('Reviewer queue','en')).toBe('Reviewer queue');
  const original='Patient XYZ: prescribed medicine as written, 25 mg.';
  expect(translateUi(original,'hi')).toBe(original);
  expect(translateUi(original,'or')).toBe(original);
 });
 it('translates UI messages while retaining diagnostic codes',()=>{
  expect(translateUi('FORBIDDEN: Action is not permitted.','hi')).toBe('FORBIDDEN: इस कार्रवाई की अनुमति नहीं है।');
  expect(translateUi('Reviewer queue','or')).toBe('ସମୀକ୍ଷା ତାଲିକା');
  expect(validUiLanguage('hi')).toBe('hi');
  expect(validUiLanguage('or')).toBe('or');
  expect(validUiLanguage('invalid')).toBe('en');
 });
});
