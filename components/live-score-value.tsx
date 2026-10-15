'use client';
import {useEffect,useRef,useState,type ComponentProps} from 'react';
import {scoreMotionChange} from '../lib/market-score/score-motion.mjs';
export function LiveScoreValue({value,children,...props}:ComponentProps<'strong'>&{value:number|null}){
 const previous=useRef<number|null>(null),[motion,setMotion]=useState<{direction:string;cycle:number}|null>(null);
 useEffect(()=>{
  const change=scoreMotionChange(previous.current,value);
  previous.current=value;
  if(!change)return;
  setMotion(old=>({direction:change,cycle:(old?.cycle??0)+1}));
 },[value]);
 return <strong {...props} data-score-motion={motion?`${motion.direction}-${motion.cycle%2}`:undefined}>{children}</strong>;
}
