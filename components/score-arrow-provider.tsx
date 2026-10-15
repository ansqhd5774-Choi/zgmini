'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {useStoredIndex} from './use-stored-index';
import {arrowVisible,startArrowClock,storedArrowDelta} from '../lib/market-score/score-arrow.mjs';
type Entry={value:number;changedAt:number|null;previousValue?:number|null};
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
export function StoredScoreDirection({id,score}:{id:string;score:number|null}){
 const {entries,now}=useContext(ArrowContext),delta=storedArrowDelta(entries[id],score,now);
 if(delta===null)return null;
 return <span className="zg-diagnostic-arrow" data-direction={delta>0?'up':'down'} aria-label={`직전 공개 점수 대비 ${delta>0?'+':''}${delta.toFixed(1)}점`} title={`직전 공개 점수 대비 ${delta>0?'+':''}${delta.toFixed(1)}점 · 변동 후 24시간 표시`}>{delta>0?'▲':'▼'}</span>;
}
