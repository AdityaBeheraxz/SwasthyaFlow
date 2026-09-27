import type {AiAdapter,SourceBundle,StructuredFacts} from './types';
const aliases:[RegExp,string][]=[
 [/faint|बेहोश|ଅଚେତ/i,'fainting'],[/chest pain|chest discomfort|सीने में दर्द|छाती में दर्द|ଛାତିରେ ଯନ୍ତ୍ରଣା/i,'chest discomfort'],[/short of breath|breathless|सांस फूल|ଶ୍ୱାସକଷ୍ଟ/i,'breathlessness'],[/difficulty breathing|सांस लेने में कठिनाई|ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ/i,'difficulty breathing'],[/fever|बुखार|ଜ୍ୱର/i,'fever'],[/severe pain|तेज दर्द|तीव्र दर्द|ତୀବ୍ର ଯନ୍ତ୍ରଣା/i,'severe pain'],[/cough|खांसी|କାଶ/i,'cough'],[/headache|ମୁଣ୍ଡବିନ୍ଧା/i,'headache']
];
export function localExtract(source:SourceBundle):StructuredFacts{
 const text=`${source.text} ${source.normalizedText??''}`;
 const symptoms=aliases.filter(([pattern])=>pattern.test(text)).map(([,name])=>name);
 const dayMatch=text.match(/(\d+)\s*days?|([चारतीनदो])\s*दिन|चार दिन/i);
 const days=dayMatch?.[1]?Number(dayMatch[1]):dayMatch?.[2]==='चार'||text.includes('चार दिन')?4:dayMatch?.[2]==='तीन'?3:dayMatch?.[2]==='दो'?2:undefined;
 return {patient_reported:{symptoms,duration:days?[`${days} days`]:[],history:[],medications:[]},timeline:days?[`Day ${days}: patient-reported concern`]:[],report_data:source.reportText?[source.reportText]:[],missing_information:['Relevant history not provided'],ambiguous_information:[],follow_up_questions:['When did this first begin?','Has it changed since it began?'],risk_signals:[],review_priority:'PENDING_RULE_ENGINE'};
}
export const localAi:AiAdapter={async extract(source){return localExtract(source);}};
