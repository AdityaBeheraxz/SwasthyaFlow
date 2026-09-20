import {z} from 'zod';
import defaults from './rules.default.json';
import {assertNonDiagnostic} from './resolve';
import type {Rule} from './rules';
const ruleSchema=z.object({rule_id:z.string().regex(/^R\d{3,}$/),signal:z.string().min(2),priority:z.enum(['RED','YELLOW','GREEN']),message:z.string().trim().min(10),match:z.object({symptom:z.string().optional(),allSymptoms:z.array(z.string()).optional(),durationDaysGt:z.number().optional(),hbBelow:z.number().optional()}).strict()}).strict();
export const rulesSchema=z.array(ruleSchema).min(6);
export function validateRules(value:unknown):Rule[]{
 const rules=rulesSchema.parse(value);
 for(const required of defaults){const candidate=rules.find(rule=>rule.rule_id===required.rule_id);if(!candidate||candidate.priority!==required.priority||JSON.stringify(candidate.match)!==JSON.stringify(required.match))throw new Error('REQUIRED_RULE_WEAKENED');}
 if(new Set(rules.map(rule=>rule.rule_id)).size!==rules.length)throw new Error('DUPLICATE_RULE_ID');
 for(const rule of rules)assertNonDiagnostic(rule.message);
 return rules;
}
