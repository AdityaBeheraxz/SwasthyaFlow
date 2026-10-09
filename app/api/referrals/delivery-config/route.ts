import {clinicalReviewerSession as session} from '@/lib/reviewer-auth';
import {db} from '@/lib/db/server';
import {referralRecipients} from '@/db/schema';
import {eq} from 'drizzle-orm';
import {deliveryConnector} from '@/lib/referral-delivery-config';
import {failure,success} from '@/lib/api';
export async function GET(){const actor=await session();if(!actor?.facilityId||!['administrator','medical_officer'].includes(actor.role))return failure('FORBIDDEN','Doctor or administrator required.',403);const rows=await (await db()).select().from(referralRecipients).where(eq(referralRecipients.facilityId,actor.facilityId));return success(rows.map(r=>{const c=deliveryConnector(r.id,actor.facilityId!);return {recipientId:r.id,mode:typeof c==='string'&&r.receivingFacilityId?c:c&&typeof c!=='string'?'http':'unavailable'};}));}



