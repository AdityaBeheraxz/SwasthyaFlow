import Link from 'next/link';
import {TextFlippingBoard} from '@/components/ui/text-flipping-board';

const safetyMessage=[
 'SAFETY STAYS VISIBLE',
 'RULES SET PRIORITY',
 'RED STAYS PINNED',
 'NO SILENT DOWNGRADE',
 'HUMANS REVIEW',
 'AUDIT EVERY CHANGE',
];

export function SafetyBoard(){return <section className="safety-board-section" aria-labelledby="safety-board-title"><div className="safety-board-copy"><div className="eyebrow">The safety layer</div><h2 id="safety-board-title">Clear rules.<br/>Visible decisions.</h2><p>Priority is resolved by deterministic server rules. Medical Officers review exceptions, and every change remains visible in the audit trail.</p><Link className="text-link" href="/queue">Inspect the reviewer queue →</Link></div><TextFlippingBoard rows={safetyMessage}/></section>}
