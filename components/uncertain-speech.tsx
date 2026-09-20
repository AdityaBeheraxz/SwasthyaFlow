'use client';
import {z} from 'zod';
const schema=z.array(z.object({text:z.string(),confidence:z.number(),start:z.number().optional(),end:z.number().optional()}));
export function UncertainSpeech({segments,onSource}:{segments:unknown;onSource:(value:string)=>void}){const parsed=schema.safeParse(segments);if(!parsed.success)return null;const uncertain=parsed.data.filter(segment=>segment.confidence<0.7);if(!uncertain.length)return null;return <div>{uncertain.map((segment,i)=><button key={i} className="badge yellow" onClick={()=>onSource(`Possibly ${segment.text}\nAudio timestamp: ${segment.start??'unknown'}–${segment.end??'unknown'} seconds\nConfidence: ${Math.round(segment.confidence*100)}%. Review the original audio below.`)}>Possibly {segment.text} · audio source</button>)}</div>}
