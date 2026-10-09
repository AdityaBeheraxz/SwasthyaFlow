'use client';
import {T} from '@/components/language-provider';

export function ProviderStatus({demo=false,fixture=false}:{demo?:boolean;fixture?:boolean}){
 return <>{demo&&<p className="notice" role="status"><T text="Hackathon workspace · Test data only. Do not enter real patient information."/></p>}{fixture&&<p className="notice" role="status"><T text={"Engineering fixture providers are active. Only registered test inputs are supported. Outputs are not live model results."}/></p>}</>;
}
