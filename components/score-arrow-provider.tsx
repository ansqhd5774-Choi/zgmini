'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {useStoredIndex} from './use-stored-index';
import {arrowVisible,startArrowClock} from '../lib/market-score/score-arrow.mjs';
type Entry={value:number;changedAt:number|null};
const ArrowContext=createContext<{entries:Record<string,Entry>;now:number}>({entries:{},now:0});
const EMPTY:Record<string,Entry>={};
export function ScoreArrowProvider({children}:{children:ReactNode}){
 const {payload}=useStoredIndex<{publishedAt:number;entries:Record<string,Entry>}>('/api/score-arrow-state');
 const [now,setNow]=useState(0),entries=payload?.entries??EMPTY;
 useEffect(()=>{
  return startArrowClock(entries,setNow,{target:window,documentTarget:document});
 },[entries]);
 return <ArrowContext.Provider value={{entries,now}}>{children}</ArrowContext.Provider>;
}
export function useScoreArrows(){
 const {entries,now}=useContext(ArrowContext);
 return (id:string,score:number|null)=>arrowVisible(entries[id],score,now);
}
