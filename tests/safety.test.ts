import {describe,it,expect} from 'vitest';
import {resolvePriority,usableTriageNote,queueRank,assertNonDiagnostic} from '../lib/safety/resolve';
import {evaluateRules} from '../lib/safety/rules';
import {authorizeOverride,makeOverrideAudit} from '../lib/safety/override';
import {validateRules} from '../lib/safety/rules-config';
import defaults from '../lib/safety/rules.default.json';
import {z} from 'zod';
import {productionConfigIssues} from '../lib/runtime-config';
import {matchesDeclaredType} from '../lib/file-validation';
import {rulesChecksum} from '../lib/safety/rules-approval';

describe('hard safety rules',()=>{
 it('LLM_GREEN_plus_RULES_RED_is_RED',()=>expect(resolvePriority({valid:true,priorities:['RED']},'GREEN')).toBe('RED'));
 it('LLM_YELLOW_plus_RULES_RED_is_RED',()=>expect(resolvePriority({valid:true,priorities:['RED']},'YELLOW')).toBe('RED'));
 it('YELLOW_and_GREEN_signals_resolve_YELLOW',()=>expect(resolvePriority({valid:true,priorities:['YELLOW','GREEN']})).toBe('YELLOW'));
 it('YELLOW_and_RED_signals_resolve_RED',()=>expect(resolvePriority({valid:true,priorities:['YELLOW','RED']})).toBe('RED'));
 it('rerun_cannot_downgrade_RED',()=>expect(resolvePriority({valid:true,priorities:['GREEN']},'GREEN','RED')).toBe('RED'));
 it('rules_failure_preserves_stored_RED',()=>expect(resolvePriority({valid:false},undefined,'RED')).toBe('RED'));
 it('client_cannot_set_lower_priority',()=>expect(z.object({encounterId:z.string()}).strict().safeParse({encounterId:'e',priority:'GREEN'}).success).toBe(false));
 it('red_override_without_reason_is_rejected_422',()=>expect(authorizeOverride('medical_officer','RED','YELLOW','')).toMatchObject({ok:false,status:422}));
 it('red_override_with_reason_writes_RISK_OVERRIDE_audit',()=>{const allowed=authorizeOverride('medical_officer','RED','YELLOW','Verified original source');const audit=makeOverrideAudit('RED','YELLOW','U-104','Verified original source',new Date('2026-09-20T00:00:00Z'));expect(allowed).toEqual({ok:true});expect(audit).toMatchObject({action:'RISK_OVERRIDE',metadata:{previous_priority:'RED',new_priority:'YELLOW',reviewer_id:'U-104',reason:'Verified original source'}});});
 it('rules_engine_failure_is_PRIORITY_UNAVAILABLE_not_GREEN',()=>expect(resolvePriority({valid:false})).toBe('PRIORITY_UNAVAILABLE'));
 it('empty_triage_note_is_TRIAGE_FAILED',()=>expect(usableTriageNote({summary:''})).toBe(false));
 it('TRIAGE_FAILED_never_GREEN',()=>expect(resolvePriority({valid:false},'GREEN')).toBe('PRIORITY_UNAVAILABLE'));
 it('red_cases_pinned_first_in_queue',()=>expect(queueRank('RED','TRIAGED')).toBeLessThan(queueRank('YELLOW','TRIAGED')));
 it('unauthorized_role_cannot_override',()=>expect(authorizeOverride('nurse','RED','YELLOW','Verified original source')).toMatchObject({ok:false,status:403}));
 it('non_diagnostic_guard_rejects_diagnosis_text',()=>expect(()=>assertNonDiagnostic('Diagnosis: pneumonia')).toThrow('AI_PARSE_FAILED'));
 it('controlled_indic_vocab_fires_red',()=>expect(evaluateRules({symptoms:['मुझे बेहोशी हुई']})).toMatchObject([{priority:'RED'}]));
 it('required_rules_cannot_be_weakened',()=>expect(()=>validateRules(defaults.map(rule=>rule.rule_id==='R001'?{...rule,priority:'GREEN'}:rule))).toThrow('REQUIRED_RULE_WEAKENED'));
});

describe('production release gates',()=>{
 it('fails closed when clinical provider approvals are absent',()=>{
  const issues=productionConfigIssues({DEPLOYMENT_MODE:'production',NODE_ENV:'production'} as NodeJS.ProcessEnv);
  expect(issues).toContain('EXTRACTION_DPA_APPROVED');
  expect(issues).toContain('OPENAI_DATA_CONTROLS_APPROVED');
  expect(issues).toContain('TRANSLATION_DPA_APPROVED');
  expect(issues).toContain('CLINICAL_RULESET_APPROVER');
 });
 it('rejects a disguised report upload',()=>expect(matchesDeclaredType(new Uint8Array([0x4d,0x5a,0x90]),'application/pdf')).toBe(false));
 it('produces a stable clinical rules checksum',()=>expect(rulesChecksum(validateRules(defaults))).toMatch(/^[a-f0-9]{64}$/));
});
