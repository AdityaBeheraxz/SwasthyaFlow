'use client';
import {useEffect,useState} from 'react';
export function ProviderStatus(){
 const [fixture,setFixture]=useState(false);
 useEffect(()=>{fetch('/api/health',{cache:'no-store'}).then(response=>response.json()).then(value=>setFixture(value.ok&&value.data.fixtureMode===true)).catch(()=>{});},[]);
 return fixture?<p className="notice" role="status">Engineering fixture providers are active. Only registered test inputs are supported. Outputs are not live model results.</p>:null;
}
