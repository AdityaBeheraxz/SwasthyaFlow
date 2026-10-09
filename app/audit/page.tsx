
import {T} from '@/components/language-provider';
import {AuditView} from '@/components/audit-view';
export default async function Audit({searchParams}:{searchParams:Promise<{encounterId?:string}>}){const {encounterId}=await searchParams;return <div className="container"><div className="eyebrow"><T text={"Accountability"}/></div><h1 className="display page-title"><T text={"Audit & privacy"}/></h1><p className="lead"><T text={"Every review action and priority override is recorded with an actor and timestamp."}/></p><AuditView key={encounterId??'facility'} encounterId={encounterId}/></div>}
