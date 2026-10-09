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
 const history=view.history;
 const x=(p:{at:number},i:number)=>'chartEndAt' in view?26+132*(p.at-(view.chartEndAt-13*86400000))/(13*86400000):26+(history.length>1?132*i/(history.length-1):66);
 const points=history.map((p:{at:number;value:number},i:number)=>`${x(p,i)},${54-p.value*.44}`).join(' ');
 return <svg className={compact?'ob-summary-chart':'ob-iran-chart'} viewBox="0 0 170 68" preserveAspectRatio="xMidYMid meet" role="img" aria-label="이란 종전 진전도 최근 14일 게시 이력">{[0,50,100].map(v=><g key={v}><text x="20" y={57-v*.44} textAnchor="end" fill="#96aabd" fontSize="9">{v}</text><line x1="26" x2="158" y1={54-v*.44} y2={54-v*.44} stroke="#355469" strokeDasharray={v===50?'2 4':undefined}/></g>)}{history.length>1&&<polyline points={points} fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}{history.map((p:{at:number;value:number},i:number)=><circle key={p.at} cx={x(p,i)} cy={54-p.value*.44} r="2" fill="#94a3b8"/>)}<text x="26" y="66" fontSize="9" fill="#96aabd">이전</text><text x="158" y="66" textAnchor="end" fontSize="9" fill="#96aabd">최근</text></svg>;
}
export function IranSummaryCard({view,onOpen}:{view:View;onOpen:()=>void}){
 if(view.overallEnded)return null;
 const previous=view.history.length>1?view.history.at(-2)!.value:null,delta=view.score!==null&&previous!==null?view.score-previous:null;
 return <div className="ob-help-card"><ContentHelp label="이란 종전 진전도 도움말"><HelpText copy={HELP.iran}/></ContentHelp><button type="button" className="ob-summary-card ob-iran-summary" aria-label={`이란 종전 진전도 상세 보기 · ${view.message}`} onClick={onOpen}>
  <h3 className="ob-fit-title"><Swords aria-hidden="true"/><span>이란 종전 진행 상황</span></h3>
  {view.score!==null&&<div className="ob-summary-value"><strong><IranScore value={view.score}/></strong>{delta!==null&&<span className={`ob-direction ob-direction-${delta>0?'up':delta<0?'down':'flat'}`}>{delta>0?<TrendingUp aria-hidden="true"/>:delta<0?<TrendingDown aria-hidden="true"/>:<Minus aria-hidden="true"/>}{delta>0?'상승':delta<0?'하락':'횡보'}</span>}</div>}
  {view.score===null?<div className="ob-iran-fact-preview" role="status">{view.facts.length?<><strong>미국–이란 협상 관련 발표</strong><span>{view.facts[0].publicationDate} · 카타르 외교부</span><span>현재 상태 미확인</span></>:view.message}</div>:<IranChart view={view} compact/>}
 </button></div>;
}
const stateLabels:Record<string,string>={UNKNOWN:'미확인',ACTIVE:'교전 지속',CEASEFIRE_PROGRESS:'휴전·종전 진행',ENDED:'종전 확인',RECONFLICT:'재충돌'};
export function IranDetail({view}:{view:View}){
 return <article className="ob-detail" aria-labelledby="ob-iran-title"><header><h2 id="ob-iran-title">이란 종전 진행 상황</h2><span className="ob-stage">{view.message}</span></header>
  <p>{'reference' in view?'기사에서 확인한 협상·공격 등의 보도 흐름을 참고 점수로 보여줍니다. 임시 기준점 50에서 시작하며, 상승은 완화·하락은 긴장 확대 방향입니다. 종전 확률이나 공식 종전 판정이 아닙니다.':'확인된 공식 발표와 관계별 상태를 구분해 보여줍니다. 향후 종전 확률이 아닙니다.'}</p>
  {'events' in view&&<section className="ob-panel"><h3>점수 반영 이유</h3><p>기사 발표일 기준 재구성입니다. 과거에 공개됐던 점수나 사건 발생일 이력이 아닙니다. 같은 날 같은 변화 규칙은 1회 반영합니다.</p><ul>{view.events.map((e:any,i:number)=><li key={i}>{e.date} · {e.reason} · <a href={e.sourceUrl} target="_blank" rel="noreferrer">근거 원문</a></li>)}</ul></section>}
  <OfficialTimeline view={view}/>
  <div className="ob-detail-grid"><section className="ob-panel"><h3>최근 14일 게시 이력</h3>{view.score===null?<p role="status">{view.message}. 확인되지 않은 자료로 점수를 산출하지 않습니다.</p>:<><div className="ob-probability"><strong><IranScore value={view.score}/></strong></div><IranChart view={view}/></>}
   <p>{'reference' in view?'계산 기준':'관측 기준'}: {view.observationAt?new Date(view.observationAt).toISOString().slice(0,10)+' UTC':'미확인'}</p></section>
  <section className="ob-panel"><h3>교전 관계별 상태</h3><dl className="ob-facts">{[['IRN_ISR','이란–이스라엘'],['IRN_USA','이란–미국']].map(([key,label])=><div key={key}><dt>{label}</dt><dd>{stateLabels[view.relations?.[key]??'UNKNOWN']}</dd></div>)}</dl><p>전체 종전: {view.overallEnded?'확인':'미확인'}</p></section></div>
  <section className="ob-formula"><h3>산식과 근거</h3><p>외교 30% · 휴전 이행 25% · 군사 충돌 20% · 호르무즈 15% · 핵 협상 10%</p>{'reference' in view?<p>각 영역은 임시 50점에서 시작합니다. 확인된 변화 보도에 고정 가감점을 반영하며, 미포착 자료는 개선으로 간주하지 않습니다.</p>:<p>호르무즈: 해상 안전 60% + 항행 제한·AIS 통항 연속성 40%. 통항량 정상 회복률이 아닙니다.</p>}{view.transit?.attribution&&<p>통항 집계: <a href="https://hormuz.now/data" target="_blank" rel="noreferrer">hormuz.now · CC BY 4.0</a> · ZGMINI 가공. AIS 비가시 선박은 포함되지 않을 수 있습니다.</p>}</section>
 </article>;
}
function OfficialTimeline({view}:{view:View}){
 return <section className="ob-panel ob-iran-timeline"><h3>최근 14일 확인된 공식 발표</h3><p>아래 기록은 발표 당시의 내용입니다. 현재 교전 중단·휴전·종전 확인을 뜻하지 않습니다.</p>{view.facts.length?<ul>{view.facts.map((f:any)=><li key={f.id}><time dateTime={f.observationDate}>{f.observationDate}</time><p>{f.summary}</p><a href={f.sourceUrl} target="_blank" rel="noreferrer">카타르 외교부 원문</a><p>발표일: {f.publicationDate} · 근거 검토: {new Date(f.verifiedAt).toISOString().slice(0,10)} UTC</p></li>)}</ul>:<p>이 기간에 공개 검증을 완료한 발표 기록이 없습니다. 공격이 없었다는 뜻은 아닙니다.</p>}</section>;
}
