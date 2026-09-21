'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {motion} from 'motion/react';

const FLAP_CHARS=' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$()-+&=;:\'"%,./?°';
const ROWS=6;
const COLS=22;

function FlapCell({target,delay}:{target:string;delay:number}){
 const [current,setCurrent]=useState(' ');
 const [previous,setPrevious]=useState(' ');
 const [flip,setFlip]=useState(0);
 useEffect(()=>{
  const normalized=FLAP_CHARS.includes(target.toUpperCase())?target.toUpperCase():' ';
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setCurrent(normalized);return;}
  let step=0;
  let timer:ReturnType<typeof setTimeout>;
  const advance=()=>{
   const next=step===7?normalized:FLAP_CHARS[1+((delay+step*11)%(FLAP_CHARS.length-1))];
   setCurrent(value=>{setPrevious(value);return next;});setFlip(value=>value+1);step+=1;
   if(step<=7)timer=setTimeout(advance,46);
  };
  const start=setTimeout(advance,delay);
  return()=>{clearTimeout(start);clearTimeout(timer);};
 },[target,delay]);
 const shown=current===' '?'\u00a0':current;
 const old=previous===' '?'\u00a0':previous;
 return <span className="flap-cell" aria-hidden="true"><span className="flap-half flap-top"><span className="flap-char flap-char-top">{shown}</span></span><span className="flap-half flap-bottom"><span className="flap-char flap-char-bottom">{shown}</span></span>{flip>0&&<motion.span key={flip} className="flap-turn" initial={{rotateX:0}} animate={{rotateX:-100}} transition={{duration:.2,ease:[.55,.055,.675,.19]}}><span className="flap-char flap-char-top">{old}</span></motion.span>}<span className="flap-split"/></span>;
}

export function TextFlippingBoard({rows,className=''}:{rows:string[];className?:string}){
 const board=useMemo(()=>Array.from({length:ROWS},(_,row)=>Array.from({length:COLS},(_,col)=>(rows[row]??'').padEnd(COLS).slice(0,COLS)[col]??' ')),[rows]);
 return <div className={`flap-board ${className}`} role="img" aria-label={rows.join('. ')}><span className="sr-only">{rows.join('. ')}</span><div className="flap-grid">{board.flatMap((row,r)=>row.map((character,c)=><FlapCell key={`${r}-${c}`} target={character} delay={c*18+r*24}/>))}</div></div>;
}
