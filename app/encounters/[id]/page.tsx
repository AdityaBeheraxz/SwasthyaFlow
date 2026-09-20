import { TriageCard } from '@/components/triage-card';
export default async function Encounter({params}:{params:Promise<{id:string}>}){const {id}=await params;return <div className="container"><TriageCard id={id}/></div>}
