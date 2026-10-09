import Link from 'next/link';
import {T} from '@/components/language-provider';
import {TextFlippingBoard} from '@/components/ui/text-flipping-board';

const safetyMessage=[
 'SAFETY STAYS VISIBLE',
 'RULES SET PRIORITY',
 'RED STAYS PINNED',
 'NO SILENT DOWNGRADE',
 'HUMANS REVIEW',
 'AUDIT EVERY CHANGE',
];

export function SafetyBoard(){return <section className="safety-board-section" aria-labelledby="safety-board-title"><div className="safety-board-copy"><div className="eyebrow"><T text="The safety layer"/></div><h2 id="safety-board-title"><T text="Clear rules."/><br/><T text="Visible decisions."/></h2><p><T text="Priority is resolved by deterministic server rules. Medical Officers review exceptions, and every change remains visible in the audit trail."/></p><Link className="text-link" href="/queue"><T text="Inspect the reviewer queue →"/></Link></div><TextFlippingBoard rows={safetyMessage}/></section>}
