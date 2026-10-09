'use client';
import {T} from '@/components/language-provider';

import {useEffect,useState} from 'react';
import Link from 'next/link';
export function DashboardWorkspaces(){const [signedIn,setSignedIn]=useState(false);useEffect(()=>{fetch('/api/session').then(r=>r.json()).then(v=>setSignedIn(Boolean(v.data?.id))).catch(()=>{});},[]);if(!signedIn)return null;return <section className="panel"><p className="eyebrow"><T text={"Staff dashboard"}/></p><h2 className="section-title"><T text={"Review, audit and refer"}/></h2><p><T text={"Review source-based priority, inspect the audit trail, then create a consented referral to a named receiving facility."}/></p><div className="actions"><Link className="btn" href="/queue"><T text={"Review cases and refer"}/></Link><Link className="btn secondary" href="/audit"><T text={"Triage audit"}/></Link><Link className="btn secondary" href="/referrals"><T text={"Referrals"}/></Link></div><p className="small muted"><T text={"Receiving inbox credentials open a separate protected workspace inside SwasthyaFlow. Your main staff session stays active."}/></p></section>;}
