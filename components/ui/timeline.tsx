// Adapted from the Hyperiux Vault timeline supplied with this task.
'use client';
import {T,useUiLanguage} from '@/components/language-provider';

import {useLayoutEffect,useRef} from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {ArrowRight,FileText,Mic,ShieldCheck} from 'lucide-react';

const journey=[
 {label:'CONSENT',title:'Explain the purpose',content:'Record patient consent for staff review. For a child, verify parent or lawful guardian authority.'},
 {label:'CAPTURE',title:'Keep the original words',content:'Capture text or a recording. Review the transcript and keep prescriptions and reports as separate sources.'},
 {label:'VERIFY',title:'Check every document',content:'Compare Tesseract extraction with the original. Correct errors; unclear values stay unknown.'},
 {label:'ORGANISE',title:'Make uncertainty visible',content:'Source-linked facts form a review note. Missing details and questions remain visible to staff.'},
 {label:'PRIORITY',title:'Apply the safety rules',content:'Deterministic server rules resolve review priority. RED cases stay pinned in the worklist.'},
 {label:'REVIEW',title:'A doctor reviews the case',content:'Qualified staff inspect the evidence. Approval and justified priority changes are recorded in the audit.'},
 {label:'REFERRAL',title:'Consent before handover',content:'After approval and separate sharing consent, send a referral with source documents to a receiving SwasthyaFlow workspace. The receiving doctor accepts or declines.'},
];

export type TimelineProps={title?:string;periodLabel?:string;duration?:number};
export default function Timeline({title='From first words to staff review.',periodLabel='Seven steps · sources remain linked',duration=0.65}:TimelineProps){const {t:uiText,language}=useUiLanguage();
 const sectionRef=useRef<HTMLElement>(null),viewportRef=useRef<HTMLDivElement>(null),trackRef=useRef<HTMLOListElement>(null);
 useLayoutEffect(()=>{
  gsap.registerPlugin(ScrollTrigger);const media=gsap.matchMedia();let cancelled=false;
  document.fonts.ready.then(()=>{
   if(cancelled)return;
   media.add('(min-height: 650px) and (prefers-reduced-motion: no-preference)',()=>{if(language!=='en')return;
    const section=sectionRef.current,viewport=viewportRef.current,track=trackRef.current;if(!section||!viewport||!track)return;
    section.classList.add('flow-enhanced');
    const distance=()=>Math.max(0,track.scrollWidth-viewport.clientWidth);
    const size=()=>section.style.setProperty('--flow-height',`${window.innerHeight+distance()}px`);size();
    const slide=gsap.to(track,{x:()=>-distance(),ease:'none',scrollTrigger:{trigger:section,start:'top top',end:()=>'+='+distance(),scrub:0.5,invalidateOnRefresh:true,onRefreshInit:size}});
    gsap.fromTo('.flow-progress',{scaleX:0},{scaleX:1,ease:'none',scrollTrigger:{trigger:section,start:'top top',end:()=>'+='+distance(),scrub:0.5,invalidateOnRefresh:true}});
    
    gsap.from('.flow-heading',{opacity:0,y:20,duration:0.6,scrollTrigger:{trigger:section,start:'top 85%',once:true}});
    track.querySelectorAll<HTMLElement>('.flow-item').forEach(item=>{
     // Opening steps are already on screen; don't hide their headings while
     // the horizontal animation is still at its initial progress.
     if(item.offsetLeft<viewport.clientWidth){gsap.from(item.querySelector('.flow-copy'),{opacity:0,y:24,duration:0.7,scrollTrigger:{trigger:section,start:'top 85%',once:true}});return;}
     
     const targets=[item.querySelector('.flow-stem'),item.querySelector('.flow-node'),item.querySelector('h3')].filter(Boolean);
     gsap.from(targets,{autoAlpha:0,y:12,duration:Math.max(0.2,duration),stagger:0.05,ease:'power2.out',scrollTrigger:{trigger:item,containerAnimation:slide,start:'left 85%',toggleActions:'play none none reverse'}});
    });
    ScrollTrigger.refresh();
    return()=>{section.classList.remove('flow-enhanced');section.style.removeProperty('--flow-height');};
   },sectionRef);
   media.add('(prefers-reduced-motion: no-preference)',()=>{if(language==='en'&&window.innerHeight>=650)return;
    sectionRef.current?.querySelectorAll('.flow-copy').forEach(item=>gsap.from(item,{opacity:0,y:24,duration:0.6,scrollTrigger:{trigger:item,start:'top 92%',once:true}}));
   },sectionRef);
  });
  return()=>{cancelled=true;media.revert();};
 },[duration,language]);
 return <section ref={sectionRef} id="intake-journey" className="flow-timeline" aria-labelledby="flow-title">
  <div ref={viewportRef} className="flow-viewport">
   <header className="flow-heading"><div><p className="eyebrow"><T text={"How SwasthyaFlow works"}/></p><h2 id="flow-title"><T text={title}/></h2></div><div className="flow-source-key"><span><Mic aria-hidden="true"/><T text={"Voice & text"}/></span><span><FileText aria-hidden="true"/><T text={"Original documents"}/></span><span><ShieldCheck aria-hidden="true"/><T text={"Staff verification"}/></span></div></header>
   <div className="flow-scroll-note"><span className="mono"><T text={periodLabel}/></span><span className="flow-scroll-hint" aria-hidden="true"><T text={"Scroll to follow the process "}/><ArrowRight size={16}/></span></div>
   <div className="flow-track-window"><ol ref={trackRef} className="flow-track" aria-label={uiText("Intake and review workflow")}><li className="flow-rail" aria-hidden="true"><span className="flow-progress"/></li>{journey.map((item,index)=><li className="flow-item" key={item.label}><span className="flow-node" aria-hidden="true"/><span className="flow-stem" aria-hidden="true"/><article className="flow-copy"><p className="flow-number mono">{String(index+1).padStart(2,'0')} / <T text={item.label}/></p><h3><T text={item.title}/></h3><p className="flow-description"><T text={item.content}/></p></article></li>)}</ol></div>
   <div className="flow-ending"><p className="small muted"><T text={"Review priority supports staff attention. It is not a diagnosis or treatment recommendation."}/></p><Link className="text-link" href="/intake"><T text={"Start a consented intake "}/><ArrowRight size={16} aria-hidden="true"/></Link></div>
  </div>
 </section>;
}

