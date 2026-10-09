import {structuredFactsSchema,type SourceBundle,type StructuredFacts} from './types';
import {assertNonDiagnostic} from '../safety/resolve';
import {inspectEvidence,questionsFor,timelineFrom} from '../facts';
import {localExtract} from './local';

export function enforceFactsPolicy(value:unknown,source:SourceBundle):StructuredFacts{
 const parsed=structuredFactsSchema.safeParse(value);if(!parsed.success)throw new Error('AI_PARSE_FAILED');const facts=parsed.data;
 // Originals and prescription transcription are evidence, never generated advice.
 for(const text of [...Object.values(facts.patient_reported).flat(),...facts.timeline,...facts.missing_information,...facts.ambiguous_information,...facts.follow_up_questions,...facts.risk_signals])assertNonDiagnostic(text);
 const original=(source.text+'\n'+(source.reportText??'')).normalize('NFKC').toLowerCase();
 const canonical=localExtract(source).patient_reported;
 for(const text of facts.patient_reported.symptoms)if(!canonical.symptoms.includes(text)&&!original.includes(text.normalize('NFKC').toLowerCase()))throw new Error('AI_PARSE_FAILED');
 for(const text of facts.patient_reported.duration)if(!canonical.duration.includes(text)&&!original.includes(text.normalize('NFKC').toLowerCase()))throw new Error('AI_PARSE_FAILED');
 for(const text of [...facts.patient_reported.medications,...facts.patient_reported.history])if(!original.includes(text.normalize('NFKC').toLowerCase()))throw new Error('AI_PARSE_FAILED');
 return {...facts,timeline:timelineFrom(source.text),report_data:source.reportText?[source.reportText]:[],risk_signals:[],follow_up_questions:questionsFor(inspectEvidence(source.text),facts.patient_reported.symptoms)};
}
