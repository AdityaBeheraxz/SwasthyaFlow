import {processDueReferrals} from '../lib/referral-delivery';
processDueReferrals().then(n=>{console.log(`Processed ${n} due referral deliveries.`);process.exit(0);}).catch(()=>{console.error('Referral worker failed. Check database and connector configuration.');process.exit(1);});
