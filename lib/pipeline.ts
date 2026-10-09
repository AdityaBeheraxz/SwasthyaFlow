import {assertNonDiagnostic,resolvePriority,usableTriageNote,type PriorityResult} from './safety/resolve';
import {evaluateRules,type Facts,type Rule} from './safety/rules';
import {aiAdapter,type SourceBundle,type StructuredFacts} from './ai';
import {inspectEvidence} from './facts';
import {enforceFactsPolicy} from './ai/output-policy';

export async function extract(source:SourceBundle){return enforceFactsPolicy(await aiAdapter().extract(source),source);}
export function assemble(facts:StructuredFacts,source:SourceBundle,previous?:PriorityResult,rules?:Rule[]){
 const durationText=facts.patient_reported.duration[0]??'';
 const value=Number(durationText.match(/\d+(?:\.\d+)?/)?.[0]);
 const duration=/hours?/i.test(durationText)?value/24:/weeks?/i.test(durationText)?value*7:/days?/i.test(durationText)?value:NaN;
 const ruleFacts:Facts={symptoms:facts.patient_reported.symptoms,durationDays:Number.isFinite(duration)?duration:undefined,hb:source.reportValues?.hb};
 const fired=evaluateRules(ruleFacts,rules);
 const hasVerifiedEvidence=facts.patient_reported.symptoms.length>0||typeof source.reportValues?.hb==='number';
 const priority=resolvePriority(hasVerifiedEvidence?{valid:true,priorities:fired.length?fired.map(rule=>rule.priority):['GREEN']}:{valid:false},undefined,previous);
 const evidence=inspectEvidence(source.text);
 const provenance:Record<string,unknown>=Object.fromEntries(['symptoms','duration','history','medications'].map(field=>[field,facts.patient_reported[field as keyof typeof facts.patient_reported].map(value=>({value,source:'patient_input',quote:source.text,verification:'REQUIRES_REVIEW'}))]));
 const note={summary:facts.patient_reported.symptoms.length?`Patient reports ${facts.patient_reported.symptoms.join(' and ')}. ${source.text}`:source.text,missingInformation:facts.missing_information,followUpQuestions:facts.follow_up_questions,riskSignals:fired,priority,fieldSources:{summary:'patient_input',riskSignals:fired.map(item=>item.source),facts,evidence,provenance,timeline:facts.timeline.map(value=>({value,source:'patient_input',quote:source.text,verification:'REQUIRES_REVIEW'}))}};
 if(!usableTriageNote(note))throw new Error('TRIAGE_FAILED');
 assertNonDiagnostic(note.summary);
 return note;
}
