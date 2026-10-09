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
  const text=value.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'');
  const prohibited=[
   /\b(diagnos(?:is|ed|e)|you have|prescrib(?:e|ed|ing)|treatment plan|start (?:taking|using))\b/i,
   /^\s*(?:please\s+)?(?:take|start|stop|increase|reduce|administer|inject|apply|recommend|advise|suggest|avoid|drink|eat|rest)\b/i,
   /\b(?:should|must|recommend|advise|suggest)\b[^.!?\n]{0,70}\b(?:take|start|stop|use|apply|drink|rest|eat)\b/i,
   /\b(?:take|start|stop|increase|reduce|administer|inject|apply|use|recommend|advise|suggest|should|must)\b[^.!?\n]{0,90}\b(?:mg|mcg|ml|tablets?|capsules?|medicines?|medications?|drugs?|antibiotics?|insulin|paracetamol|ibuprofen|therapy|treatment|dose|dosage|surgery|rest|hydration|fluids)\b/i,
   /\b(?:recommended|advised|suggested)\s+(?:treatment|therapy|medicine|dose|management)\b/i,
   /(?:दवा|दवाई|दवाइयाँ|गोली|इंसुलिन|पैरासिटामोल|एंटीबायोटिक|खुराक)[^।.!?\n]{0,70}(?:लें|लेना|लीजिए|खाएं|खाएँ|शुरू|बंद|बढ़ा|कम करें|देना|दीजिए)/u,
   /(?:इलाज|उपचार|निदान)[^।.!?\n]{0,60}(?:करें|है|योजना|सलाह)|(?:आराम करें|पानी पिएं|पानी पिएँ)/u,
   /(?:ଔଷଧ|ଓଷଧ|ବଟିକା|ଇନସୁଲିନ|ଡୋଜ)[^।.!?\n]{0,70}(?:ନିଅନ୍ତୁ|ଖାଆନ୍ତୁ|ଆରମ୍ଭ|ବନ୍ଦ|ବଢ଼ା|କମା)|(?:ଚିକିତ୍ସା|ନିଦାନ)[^।.!?\n]{0,50}(?:କରନ୍ତୁ|ଯୋଜନା)/u,
   /\b(?:dawai|dava|goli|tablet|insulin)\b[^.!?\n]{0,60}\b(?:lo|lein|lijiye|khao|shuru|band|badhao)\b/i,
  ];
  if(prohibited.some(pattern=>pattern.test(text)))throw new Error('AI_PARSE_FAILED');
}
export function queueRank(priority:PriorityResult|null,state:string):number {
  if (priority==='RED') return 0;
  if (priority==='YELLOW') return 1;
  if (priority==='GREEN') return 2;
  if (state==='TRIAGE_FAILED'||state==='SAFETY_ENGINE_FAILED'||priority==='PRIORITY_UNAVAILABLE') return 3;
  return 4;
}
