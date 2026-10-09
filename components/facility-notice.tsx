'use client';
import {T} from '@/components/language-provider';

import {useEffect,useState} from 'react';
type Notice={name:string;settings:{legalIdentity?:string;privacyContact?:string;incidentContact?:string;retentionDays?:number;processors?:string[];consentNotice?:string}};
export function FacilityNotice({consent=false}:{consent?:boolean}){
 const [notice,setNotice]=useState<Notice|null>(null);
 useEffect(()=>{fetch('/api/settings/facility',{cache:'no-store'}).then(r=>r.json()).then(v=>{if(v.ok&&v.data)setNotice(v.data);}).catch(()=>{});},[]);
 if(!notice)return null;const settings=notice.settings;
 if(consent)return settings.consentNotice?<p className="notice small">{settings.consentNotice}</p>:null;
 return <section className="panel policy-section"><h2 className="section-title"><T text={"Facility policy details"}/></h2><p>{settings.legalIdentity||notice.name}</p><dl><dt><T text={"Privacy contact"}/></dt><dd>{settings.privacyContact||'Awaiting facility configuration'}</dd><dt><T text={"Incident contact"}/></dt><dd>{settings.incidentContact||'Awaiting facility configuration'}</dd><dt><T text={"Retention"}/></dt><dd>{settings.retentionDays?settings.retentionDays+' days':<T text={'Deployment retention configuration'}/>}</dd><dt><T text={"Approved processors"}/></dt><dd>{settings.processors?.length?settings.processors.join(', '):<T text={'No processor list supplied'}/>}</dd></dl>{settings.consentNotice&&<p>{settings.consentNotice}</p>}</section>;
}
