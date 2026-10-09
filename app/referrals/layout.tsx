import {T} from '@/components/language-provider';
import {ReferralTabs} from '@/components/referral-tabs';
export default function Layout({children}:{children:React.ReactNode}){
 return <div className="container"><p className="eyebrow"><T text="Confidential handover"/></p><h1 className="display page-title"><T text="Referrals"/></h1><p className="lead"><T text="Refer your facility’s patients and manage referrals received by another doctor."/></p><ReferralTabs/>{children}</div>;
}
