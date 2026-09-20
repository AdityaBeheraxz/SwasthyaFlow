import { z } from 'zod';
export const structuredFactsSchema=z.object({patient_reported:z.object({symptoms:z.array(z.string()),duration:z.array(z.string()),history:z.array(z.string()),medications:z.array(z.string())}).strict(),timeline:z.array(z.string()),report_data:z.array(z.string()),missing_information:z.array(z.string()),ambiguous_information:z.array(z.string()),follow_up_questions:z.array(z.string()),risk_signals:z.array(z.string()),review_priority:z.literal('PENDING_RULE_ENGINE')}).strict();
export type StructuredFacts=z.infer<typeof structuredFactsSchema>;
export type SourceBundle={text:string;language:string;reportText?:string;normalizedText?:string};
export interface AiAdapter{extract(source:SourceBundle):Promise<StructuredFacts>}
