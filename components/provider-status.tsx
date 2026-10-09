'use client';
import {T} from '@/components/language-provider';

import {useEffect,useState} from 'react';
export function ProviderStatus({demo=false}:{demo?:boolean}){
 const [fixture,setFixture]=useState(false);
 useEffect(()=>{fetch('/api/health',{cache:'no-store'}).then(response=>response.json()).then(value=>setFixture(value.ok&&value.data.fixtureMode===true)).catch(()=>{});},[]);
 return <>{demo&&<p className="notice" role="status"><T text="Hackathon workspace · Test data only. Do not enter real patient information."/></p>}{fixture&&<p className="notice" role="status"><T text={"Engineering fixture providers are active. Only registered test inputs are supported. Outputs are not live model results."}/></p>}</>;
}
