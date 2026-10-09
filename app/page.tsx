
import {T} from '@/components/language-provider';
import Timeline from '@/components/ui/timeline';
import Link from 'next/link';
import {HeroSceneLoader} from '@/components/hero-scene-loader';
import {SafetyBoard} from '@/components/safety-board';
export default function Home(){return <div className="container"><section className="hero"><div><div className="eyebrow"><T text={"Frontline information, clearly organised"}/></div><h1 className="display"><T text={"Hear the person."}/><br/><T text={"See the whole story."}/></h1><p className="lead"><T text={"SwasthyaFlow brings voice, text, and report details into one source-linked note for qualified staff to review."}/></p><p className="muted"><T text={"AI-assisted frontline triage. Human-led clinical decisions."}/></p><div className="actions"><Link className="btn" href="/intake"><T text={"Start new intake →"}/></Link><Link className="btn secondary" href="/queue"><T text={"Open reviewer queue"}/></Link></div></div><div className="hero-art" aria-label="Illustration of information converging into a structured review card" role="img"><div className="hero-lines"/><HeroSceneLoader/><div className="hero-note"><div className="eyebrow"><T text={"Source integrity"}/></div><p className="mono"><T text={"Original document linked"}/></p><hr/><p><T text={"OCR extraction awaiting staff verification"}/></p><span className="badge yellow"><T text={"UNVERIFIED · excluded from rules"}/></span><p className="small muted"><T text={"Every correction remains in the audit trail"}/></p></div></div></section><Timeline/><SafetyBoard/></div>}

