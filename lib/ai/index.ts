import type {AiAdapter} from './types';
import {mockAi} from './mock';
import {liveAi} from './live';
import {enterpriseAi} from './enterprise';
export {structuredFactsSchema} from './types';
export type {AiAdapter,SourceBundle,StructuredFacts} from './types';
export function aiAdapter():AiAdapter{
 if(process.env.AI_MODE==='enterprise')return enterpriseAi;
 if(process.env.AI_MODE==='live')return liveAi;
 return mockAi;
}
