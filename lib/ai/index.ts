import type {AiAdapter} from './types';
import {providerMode} from '../provider-mode';
import {localAi} from './local';
import {liveAi} from './live';
import {enterpriseAi} from './enterprise';
import {fixtureAi} from './fixture';
export {structuredFactsSchema} from './types';
export type {AiAdapter,SourceBundle,StructuredFacts} from './types';
export function aiAdapter():AiAdapter{
 const mode=providerMode('EXTRACTION_MODE',process.env.AI_MODE||'local',['fixture','local','live','enterprise']);
 if(mode==='fixture')return fixtureAi;
 if(mode==='enterprise')return enterpriseAi;
 if(mode==='live')return liveAi;
 if(mode!=='local')throw new Error('EXTRACTION_MODE_INVALID');
 return localAi;
}
