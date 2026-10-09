
import {T} from '@/components/language-provider';
import { IntakeFlow } from '@/components/intake-flow';
export default function Intake(){return <div className="container"><div className="eyebrow"><T text={"New encounter"}/></div><h1 className="display page-title"><T text={"Patient intake"}/></h1><p className="lead"><T text={"Record consent, preserve the person’s words, then prepare a note for human review."}/></p><IntakeFlow/></div>}
