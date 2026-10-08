"use client";
import {useEffect,useState} from 'react';
import {Swords,TrendingUp,TrendingDown,Minus} from 'lucide-react';
import {iranView} from '../lib/iran-progress/view.mjs';

import {ContentHelp} from './content-help';
import {HELP,HelpText} from './help-copy';
export function useIranProgress(){
 const [view,setView]=useState(()=>iranView({status:'PENDING'}));
 useEffect(()=>{const controller=new AbortController();
  fetch('/api/iran-progress',{cache:'no-store',signal:controller.signal}).then(r=>r.json()).then(data=>{if(!controller.signal.aborted)setView(iranView(data));})
   .catch(()=>{if(!controller.signal.aborted)setView(iranView(null));});
  return()=>controller.abort();
 },[]);
 return view;
}
type View=ReturnType<typeof iranView>;
export function IranScore({value}:{value:number|null}){return <>{value===null?'—':<>{value.toFixed(1).split('.')[0]}<small className="ob-score-fraction">.{value.toFixed(1).split('.')[1]}</small></>}</>;}
function IranChart({view,compact=false}:{view:View;compact?:boolean}){
 const history=view.history,points=history.map((p:{value:number},i:number)=>`${26+(history.length>1?132*i/(history.length-1):66)},${54-p.value*.44}`).join(' ');
 return <svg className={compact?'ob-summary-chart':'ob-iran-chart'} viewBox="0 0 170 68" preserveAspectRatio="xMidYMid meet" role="img" aria-label="이란 종전 진전도 최근 14일 게시 이력">{[0,50,100].map(v=><g key={v}><text x="20" y={57-v*.44} textAnchor="end" fill="#96aabd" fontSize="9">{v}</text><line x1="26" x2="158" y1={54-v*.44} y2={54-v*.44} stroke="#355469" strokeDasharray={v===50?'2 4':undefined}/></g>)}{history.length>1&&<polyline points={points} fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}{history.map((p:{at:number;value:number},i:number)=><circle key={p.at} cx={26+(history.length>1?132*i/(history.length-1):66)} cy={54-p.value*.44} r="2" fill="#94a3b8"/>)}<text x="26" y="66" fontSize="9" fill="#96aabd">이전</text><text x="158" y="66" textAnchor="end" fontSize="9" fill="#96aabd">최근</text></svg>;
}
export function IranSummaryCard({view,onOpen}:{view:View;onOpen:()=>void}){
 const previous=view.history.length>1?view.history.at(-2)!.value:null,delta=view.score!==null&&previous!==null?view.score-previous:null;
 return <div className="ob-help-card"><ContentHelp label="이란 종전 진전도 도움말"><HelpText copy={HELP.iran}/></ContentHelp><button type="button" className="ob-summary-card ob-iran-summary" aria-label={`이란 종전 진전도 상세 보기 · ${view.message}`} onClick={onOpen}>
  <h3 className="ob-fit-title"><Swords aria-hidden="true"/><span>이란 종전 진전도</span></h3>
  <div className="ob-summary-value"><strong><IranScore value={view.score}/></strong>{delta!==null&&<span className={`ob-direction ob-direction-${delta>0?'up':delta<0?'down':'flat'}`}>{delta>0?<TrendingUp aria-hidden="true"/>:delta<0?<TrendingDown aria-hidden="true"/>:<Minus aria-hidden="true"/>}{delta>0?'상승':delta<0?'하락':'횡보'}</span>}</div>
  {view.score===null?<div className="ob-iran-pending" role="status">{view.message}</div>:<IranChart view={view} compact/>}
 </button></div>;
}
const stateLabels:Record<string,string>={UNKNOWN:'미확인',ACTIVE:'교전 지속',CEASEFIRE_PROGRESS:'휴전·종전 진행',ENDED:'종전 확인',RECONFLICT:'재충돌'};
export function IranDetail({view}:{view:View}){
 return <article className="ob-detail" aria-labelledby="ob-iran-title"><header><h2 id="ob-iran-title">이란 종전 진전도</h2><span className="ob-stage">{view.message}</span></header>
  <p>현재 증거로 평가한 0~100점의 종전 진전도입니다. 향후 종전 확률이 아닙니다.</p>
  <div className="ob-detail-grid"><section className="ob-panel"><h3>최근 14일 게시 이력</h3>{view.score===null?<p role="status">{view.message}. 확인되지 않은 자료로 점수를 산출하지 않습니다.</p>:<><div className="ob-probability"><strong><IranScore value={view.score}/></strong></div><IranChart view={view}/></>}
   <p>관측 기준: {view.observationAt?new Date(view.observationAt).toISOString().slice(0,10)+' UTC':'미확인'}</p></section>
  <section className="ob-panel"><h3>교전 관계별 상태</h3><dl className="ob-facts">{[['IRN_ISR','이란–이스라엘'],['IRN_USA','이란–미국']].map(([key,label])=><div key={key}><dt>{label}</dt><dd>{stateLabels[view.relations?.[key]??'UNKNOWN']}</dd></div>)}</dl><p>전체 종전: {view.overallEnded?'확인':'미확인'}</p></section></div>
  <section className="ob-formula"><h3>산식과 근거</h3><p>외교 30% · 휴전 이행 25% · 군사 충돌 20% · 호르무즈 15% · 핵 협상 10%</p><p>호르무즈: 해상 안전 60% + 항행 제한·AIS 통항 연속성 40%. 통항량 정상 회복률이 아닙니다.</p>{view.transit?.attribution&&<p>통항 집계: <a href="https://hormuz.now/data" target="_blank" rel="noreferrer">hormuz.now · CC BY 4.0</a> · ZGMINI 가공. AIS 비가시 선박은 포함되지 않을 수 있습니다.</p>}</section>
 </article>;
}
