import type {AiAdapter} from './types';
import {mockAi} from './mock';
import {liveAi} from './live';
export {structuredFactsSchema} from './types';
export type {AiAdapter,SourceBundle,StructuredFacts} from './types';
export function aiAdapter():AiAdapter{return process.env.AI_MODE==='live'?liveAi:mockAi;}
