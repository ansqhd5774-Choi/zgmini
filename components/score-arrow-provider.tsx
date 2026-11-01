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
export function useScoreArrowDelta(){
 const {entries,now}=useContext(ArrowContext);
 return (id:string,score:number|null)=>storedArrowDelta(entries[id],score,now);
}
export function StoredScoreDirection({id,score}:{id:string;score:number|null}){
 const {entries,now}=useContext(ArrowContext),delta=storedArrowDelta(entries[id],score,now);
 if(score===null||!Number.isFinite(score))return null;
 if(delta===null||delta===0)return <span className="zg-diagnostic-arrow" data-direction="flat" aria-label="표시할 상승·하락 변동 없음" title="최근 24시간 내 표시할 상승·하락 변동 없음">−</span>;
 return <span className="zg-diagnostic-arrow" data-direction={delta>0?'up':'down'} aria-label={`직전 공개 점수 대비 ${delta>0?'+':''}${delta.toFixed(1)}점`} title={`직전 공개 점수 대비 ${delta>0?'+':''}${delta.toFixed(1)}점 · 변동 후 24시간 표시`}>{delta>0?'▲':'▼'}</span>;
}
