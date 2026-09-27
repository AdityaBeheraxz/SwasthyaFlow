import {assertNonDiagnostic,resolvePriority,usableTriageNote,type PriorityResult} from './safety/resolve';
import {evaluateRules,type Facts,type Rule} from './safety/rules';
import {aiAdapter,type SourceBundle,type StructuredFacts} from './ai';

export async function extract(source:SourceBundle){return aiAdapter().extract(source);}
export function assemble(facts:StructuredFacts,source:SourceBundle,previous?:PriorityResult,rules?:Rule[]){
 const duration=Number(facts.patient_reported.duration[0]?.match(/\d+/)?.[0]);
 const ruleFacts:Facts={symptoms:facts.patient_reported.symptoms,durationDays:Number.isFinite(duration)?duration:undefined,hb:source.reportValues?.hb};
 const fired=evaluateRules(ruleFacts,rules);
 const hasVerifiedEvidence=facts.patient_reported.symptoms.length>0||typeof source.reportValues?.hb==='number';
 const priority=resolvePriority(hasVerifiedEvidence?{valid:true,priorities:fired.length?fired.map(rule=>rule.priority):['GREEN']}:{valid:false},undefined,previous);
 const note={summary:facts.patient_reported.symptoms.length?`Patient reports ${facts.patient_reported.symptoms.join(' and ')}. ${source.text}`:source.text,missingInformation:facts.missing_information,followUpQuestions:facts.follow_up_questions,riskSignals:fired,priority,fieldSources:{summary:'patient_input',riskSignals:fired.map(item=>item.source)}};
 if(!usableTriageNote(note))throw new Error('TRIAGE_FAILED');
 assertNonDiagnostic(note.summary);
 return note;
}
