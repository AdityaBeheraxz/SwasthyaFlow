'use client';
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
const Scene=dynamic(()=>import('./hero-scene').then(m=>m.HeroScene),{ssr:false});
export function HeroSceneLoader(){
 const ref=useRef<HTMLDivElement>(null);
 const [supported,setSupported]=useState(false),[active,setActive]=useState(false);
 const [progress,setProgress]=useState(0),[pointer,setPointer]=useState({x:0,y:0});
 useEffect(()=>{
  const lowPower=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData;
  if(lowPower||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let visible=false,ready=false,enabled=false,frame=0,idle:number|undefined;
  const updateActive=()=>setActive(visible&&document.visibilityState==='visible');
  const enable=()=>{
   idle=undefined;
   if(!visible||document.visibilityState!=='visible')return;
   enabled=true;
   const canvas=document.createElement('canvas');
   const context=canvas.getContext('webgl2')||canvas.getContext('webgl');
   if(context){context.getExtension('WEBGL_lose_context')?.loseContext();setSupported(true);}
  };
  const schedule=()=>{
   if(!ready||!visible||enabled||idle!==undefined)return;
   if('requestIdleCallback' in window)idle=window.requestIdleCallback(enable,{timeout:1500});else enable();
  };
  // Keep the optional 3D code out of the initial authorization and rendering work.
  const timer=window.setTimeout(()=>{ready=true;schedule();},1200);
  const observer=new IntersectionObserver(entries=>{visible=Boolean(entries[0]?.isIntersecting);updateActive();schedule();},{threshold:.1});
  if(ref.current)observer.observe(ref.current);
  let latestPointer={x:0,y:0};
  const update=()=>{frame=0;setProgress(Math.min(1,Math.max(0,window.scrollY/(window.innerHeight*1.1))));setPointer(latestPointer);};
  const scheduleUpdate=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const onPointer=(event:PointerEvent)=>{latestPointer={x:event.clientX/window.innerWidth*2-1,y:event.clientY/window.innerHeight*2-1};scheduleUpdate();};
  const onVisibility=()=>{updateActive();schedule();};
  window.addEventListener('scroll',scheduleUpdate,{passive:true});
  window.addEventListener('pointermove',onPointer,{passive:true});
  document.addEventListener('visibilitychange',onVisibility);scheduleUpdate();
  return()=>{clearTimeout(timer);if(idle!==undefined)window.cancelIdleCallback(idle);if(frame)cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',scheduleUpdate);window.removeEventListener('pointermove',onPointer);document.removeEventListener('visibilitychange',onVisibility);};
 },[]);
 return <div ref={ref} className="hero-canvas-wrap" aria-hidden="true">{supported&&<Scene progress={progress} pointer={pointer} active={active}/>}</div>;
}
