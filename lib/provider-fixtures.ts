import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {z} from 'zod';
const segment=z.object({text:z.string(),confidence:z.number().min(0).max(1),start:z.number().optional(),end:z.number().optional()});
const manifestSchema=z.object({speech:z.array(z.object({sha256:z.string(),language:z.enum(['en','hi','or']),text:z.string(),segments:z.array(segment)})),translation:z.array(z.object({language:z.enum(['en','hi','or']),original:z.string(),normalized:z.string(),ambiguousSpans:z.array(z.object({original:z.string(),normalized:z.string(),reason:z.string()}))})),ocr:z.array(z.object({sha256:z.string(),rawText:z.string(),tokens:z.array(z.object({text:z.string(),confidence:z.number().min(0).max(1),bbox:z.tuple([z.number(),z.number(),z.number(),z.number()]),page:z.number().int().positive()}))})),extraction:z.array(z.object({language:z.enum(['en','hi','or']),original:z.string(),symptoms:z.array(z.string()),duration:z.array(z.string())}))});
export async function providerFixtures(){
 if(process.env.DEPLOYMENT_MODE==='production')throw new Error('FIXTURE_PROVIDER_FORBIDDEN');
 return manifestSchema.parse(JSON.parse(await readFile(process.env.PROVIDER_FIXTURES_PATH||join(process.cwd(),'fixtures','providers.json'),'utf8')));
}
export function sourceHash(bytes:Uint8Array){return createHash('sha256').update(bytes).digest('hex');}
