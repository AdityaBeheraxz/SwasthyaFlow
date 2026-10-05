import type {AiAdapter,SourceBundle,StructuredFacts} from './types';
import {inspectEvidence,questionsFor,timelineFrom} from '../facts';
const aliases:[RegExp,string][]=[
 [/faint|बेहोश|ଅଚେତ/i,'fainting'],[/chest pain|chest discomfort|सीने में दर्द|छाती में दर्द|ଛାତିରେ ଯନ୍ତ୍ରଣା/i,'chest discomfort'],[/short of breath|breathless|सांस फूल|ଶ୍ୱାସକଷ୍ଟ/i,'breathlessness'],[/difficulty breathing|सांस लेने में कठिनाई|ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ/i,'difficulty breathing'],[/fever|बुखार|ଜ୍ୱର/i,'fever'],[/severe pain|तेज दर्द|तीव्र दर्द|ତୀବ୍ର ଯନ୍ତ୍ରଣା/i,'severe pain'],[/cough|खांसी|କାଶ/i,'cough'],[/headache|ମୁଣ୍ଡବିନ୍ଧା/i,'headache']
];
export function localExtract(source:SourceBundle):StructuredFacts{
 const text=source.text;
 const symptoms=aliases.filter(([pattern])=>text.split(/[.;।\n]|\bbut\b|लेकिन|କିନ୍ତୁ/i).some(clause=>pattern.test(clause)&&! /\b(?:no|denies|without|not experiencing)\b|नहीं|नही|नकार|ନାହିଁ|ନାହିଂ/i.test(clause))).map(([,name])=>name);
 const durationMatch=text.match(/\b(\d+(?:\.\d+)?)\s*(hours?|days?|weeks?)\b/i);
 const wordMatch=text.match(/(four|three|two|चार|तीन|दो|ଚାରି|ତିନି|ଦୁଇ)\s*(?:days?|दिन|ଦିନ)/i);
 const wordDays=wordMatch?({four:4,three:3,two:2,'चार':4,'तीन':3,'दो':2,'ଚାରି':4,'ତିନି':3,'ଦୁଇ':2} as Record<string,number>)[wordMatch[1].toLowerCase()]:undefined;
 const duration=durationMatch?[`${durationMatch[1]} ${durationMatch[2].toLowerCase()}`]:wordDays?[`${wordDays} days`]:[];
 const evidence=inspectEvidence(source.text);
 return {patient_reported:{symptoms,duration,history:evidence.filter(item=>item.field==='history'&&item.state==='KNOWN').map(item=>item.value),medications:evidence.filter(item=>item.field==='medications'&&item.state==='KNOWN').map(item=>item.value)},timeline:timelineFrom(source.text),report_data:source.reportText?[source.reportText]:[],missing_information:evidence.filter(item=>item.state==='UNKNOWN').map(item=>item.value),ambiguous_information:evidence.filter(item=>item.state==='UNCLEAR').map(item=>item.value),follow_up_questions:questionsFor(evidence,symptoms),risk_signals:[],review_priority:'PENDING_RULE_ENGINE'};
}
export const localAi:AiAdapter={async extract(source){return localExtract(source);}};
