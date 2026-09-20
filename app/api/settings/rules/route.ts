import {z} from 'zod';
import {eq,desc} from 'drizzle-orm';
import {db} from '@/lib/db/server';
import {rulesConfig,auditLogs} from '@/db/schema';
import {session} from '@/lib/auth';
import {failure,success,parseFailure} from '@/lib/api';
import {validateRules} from '@/lib/safety/rules-config';
export async function GET(){if(!await session())return failure('UNAUTHORIZED','Select a demo role.',401);const versions=await (await db()).select().from(rulesConfig).orderBy(desc(rulesConfig.version));return success(versions);}
export async function POST(req:Request){const actor=await session();if(actor?.role!=='administrator')return failure('FORBIDDEN','Administrator role required.',403);try{const body=z.object({rules:z.unknown()}).strict().parse(await req.json());const rules=validateRules(body.rules);const conn=await db();const [latest]=await conn.select().from(rulesConfig).orderBy(desc(rulesConfig.version)).limit(1);const version=(latest?.version??0)+1;await conn.transaction(async tx=>{await tx.update(rulesConfig).set({active:false}).where(eq(rulesConfig.active,true));await tx.insert(rulesConfig).values({id:crypto.randomUUID(),version,rules,active:true});await tx.insert(auditLogs).values({id:crypto.randomUUID(),userId:actor.id,action:'RULES_CONFIG_UPDATED',metadata:{version,rule_count:rules.length}});});return success({version},201);}catch(e){if(e instanceof Error&&['REQUIRED_RULE_WEAKENED','DUPLICATE_RULE_ID','AI_PARSE_FAILED'].includes(e.message))return failure(e.message,'Required safety rules cannot be weakened; messages must remain non-diagnostic.',422);return parseFailure(e);}}
