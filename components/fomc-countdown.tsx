"use client";

import {useEffect, useState} from 'react';
import {FOMC_CHECKED_AT,FOMC_SOURCE,fomcState,fomcKst} from '../lib/fomc-countdown.mjs';
import './fomc-countdown.css';

function FlipDigit({value}:{value:string}) {
  const [previous,setPrevious]=useState(value);
  useEffect(()=>{const timer=setTimeout(()=>setPrevious(value),460);return()=>clearTimeout(timer)},[value]);
  const changing=previous!==value;
  return <span className="zg-fomc-digit"><span>{value}</span>{changing&&<span key={value} className="zg-fomc-flip" aria-hidden="true"><span className="zg-fomc-old">{previous}</span><span className="zg-fomc-new">{value}</span></span>}</span>;
}
function Pair({value}:{value:string}){return <span className="zg-fomc-pair">{[...value].map((v,i)=><FlipDigit key={i} value={v}/>)}</span>}

export default function FomcCountdown(){
  const [now,setNow]=useState<number|null>(null);
  useEffect(()=>{
    const tick=()=>setNow(Date.now());tick();
    const timer=setInterval(tick,1000);
    document.addEventListener('visibilitychange',tick);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick)};
  },[]);
  const event=now===null?null:fomcState(now);
  const title=`연준 공식 예정 일정 · 한국시간 · 일정 변경 가능 · 확인 ${FOMC_CHECKED_AT} · ${FOMC_SOURCE}`;
  return <div className="zg-fomc-bar" aria-label="연준 금리 발표 일정" title={title}>
    <div className="zg-fomc-center">
      <svg className="zg-fomc-bank" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m2 7 8-5 8 5H2Zm1 10h14M5 9v6m5-6v6m5-6v6"/></svg>
      <strong>연준 금리 발표</strong>
      {event?<><time dateTime={event.at} aria-label={`${new Date(event.at).getUTCFullYear()}년 ${fomcKst(event.at)} 한국시간`}>{fomcKst(event.at)} <span className="zg-fomc-zone">KST</span></time>
      {event.reached?<span className="zg-fomc-reached">발표 시각 도달 · 결과 확인 중</span>:<span className="zg-fomc-clock" role="timer" aria-live="off" aria-label={`발표까지 ${event.days}일 ${event.hours}시간 ${event.minutes}분 ${event.seconds}초`}><span aria-hidden="true" className="zg-fomc-clock-inner"><Pair value={event.days}/><span className="zg-fomc-day">일</span><Pair value={event.hours}/><b>:</b><Pair value={event.minutes}/><b>:</b><Pair value={event.seconds}/></span></span>}</>:<span className="zg-fomc-pending">{now===null?'일정 확인 중':'다음 공식 일정 확인 필요'}</span>}
    </div>
  </div>;
}
