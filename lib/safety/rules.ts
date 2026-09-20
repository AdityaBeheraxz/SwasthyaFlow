import rawRules from './rules.default.json';
import type {Priority} from './resolve';

export type Facts = {symptoms:string[]; durationDays?:number; hb?:number; sources?:Record<string,string>};
export type FiredRule = {ruleId:string; signal:string; priority:Priority; message:string; source:string};
export type Rule = {rule_id:string; signal:string; priority:Priority; message:string; match:{symptom?:string;allSymptoms?:string[];durationDaysGt?:number;hbBelow?:number}};
const vocabulary:Record<string,string[]> = {
  fainting:['fainting','fainted','syncope','बेहोश','बेहोशी','ଅଚେତ'],
  'chest discomfort':['chest discomfort','chest pain','सीने में दर्द','छाती में दर्द','ଛାତିରେ ଯନ୍ତ୍ରଣା'],
  breathlessness:['breathlessness','short of breath','सांस फूल','ଶ୍ୱାସକଷ୍ଟ'],
  'difficulty breathing':['difficulty breathing','breathing difficulty','सांस लेने में कठिनाई','ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ'],
  fever:['fever','बुखार','ଜ୍ୱର'],
  'severe pain':['severe pain','तेज दर्द','तीव्र दर्द','ତୀବ୍ର ଯନ୍ତ୍ରଣା']
};
function hasSymptom(symptoms:string[], target:string):boolean {
  return symptoms.some(s=>vocabulary[target]?.some(alias=>s.toLowerCase().includes(alias.toLowerCase())));
}
export function evaluateRules(facts:Facts, rules:Rule[]=rawRules as Rule[]):FiredRule[] {
  if (!facts || !Array.isArray(facts.symptoms)) throw new Error('SAFETY_ENGINE_FAILED');
  return rules.filter(rule=>{
    const match=rule.match;
    if (match.symptom && !hasSymptom(facts.symptoms,match.symptom)) return false;
    if (match.allSymptoms && !match.allSymptoms.every(item=>hasSymptom(facts.symptoms,item))) return false;
    if (match.durationDaysGt !== undefined && !(typeof facts.durationDays==='number' && facts.durationDays>match.durationDaysGt)) return false;
    if (match.hbBelow !== undefined && !(typeof facts.hb==='number' && facts.hb<match.hbBelow)) return false;
    return true;
  }).map(rule=>({ruleId:rule.rule_id,signal:rule.signal,priority:rule.priority,message:rule.message,source:rule.match.hbBelow!==undefined?'report:hb':`symptom:${rule.match.symptom??rule.match.allSymptoms?.join('+')}`}));
}
