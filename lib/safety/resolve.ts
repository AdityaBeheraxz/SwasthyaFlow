export type Priority = 'RED'|'YELLOW'|'GREEN';
export type PriorityResult = Priority|'PRIORITY_UNAVAILABLE';
export type RulesResult = {valid:true; priorities:Priority[]} | {valid:false};
const score:Record<Priority,number> = {GREEN:1,YELLOW:2,RED:3};
export function resolvePriority(rulesResult:RulesResult, llmSuggestion?:Priority, previousStored?:PriorityResult):PriorityResult {
  if (!rulesResult.valid) return previousStored && previousStored!=='PRIORITY_UNAVAILABLE' ? previousStored : 'PRIORITY_UNAVAILABLE';
  const candidates = [...rulesResult.priorities, ...(llmSuggestion ? [llmSuggestion] : []), ...(previousStored && previousStored !== 'PRIORITY_UNAVAILABLE' ? [previousStored] : [])];
  if (candidates.length === 0) return 'PRIORITY_UNAVAILABLE';
  return candidates.reduce<Priority>((highest,item)=>score[item]>score[highest]?item:highest,'GREEN');
}
export function usableTriageNote(value:unknown): value is {summary:string} {
  return typeof value === 'object' && value !== null && 'summary' in value && typeof value.summary === 'string' && value.summary.trim().length>0;
}
export function assertNonDiagnostic(value:string):void {
  if (/\b(diagnos(?:is|ed|e)|you have|prescrib(?:e|ed|ing)|take \d+\s*(?:mg|ml)|treatment plan|start (?:taking|using))\b/i.test(value)) throw new Error('AI_PARSE_FAILED');
}
export function queueRank(priority:PriorityResult|null,state:string):number {
  if (priority==='RED') return 0;
  if (priority==='YELLOW') return 1;
  if (priority==='GREEN') return 2;
  if (state==='TRIAGE_FAILED'||state==='SAFETY_ENGINE_FAILED'||priority==='PRIORITY_UNAVAILABLE') return 3;
  return 4;
}
