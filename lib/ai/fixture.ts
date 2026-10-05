import type {AiAdapter} from './types';
import {providerFixtures} from '../provider-fixtures';
import {localExtract} from './local';
export const fixtureAi:AiAdapter={async extract(source){const fixture=(await providerFixtures()).extraction.find(item=>item.language===source.language&&item.original===source.text);if(!fixture)throw new Error('FIXTURE_INPUT_NOT_REGISTERED');const base=localExtract({...source,text:source.normalizedText??source.text});return {...base,patient_reported:{...base.patient_reported,symptoms:fixture.symptoms,duration:fixture.duration},timeline:fixture.duration.map(duration=>duration+' before intake: '+fixture.original)};}};
