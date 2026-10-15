"use client";
import ChartAxisLabels from '../components/chart-axis-labels';
import '../components/chart-axis-labels.css';


import {Swords,TrendingUp,TrendingDown,Minus} from 'lucide-react';
import {useStoredIndex} from '../components/use-stored-index';
import {iranView} from '../lib/iran-progress/view.mjs';

import {OutbreakChange} from './outbreak-change';
import {ContentHelp} from './content-help';
import {HELP,HelpText} from './help-copy';
export function useIranProgress(){
 const {payload}=useStoredIndex<any>('/api/iran-progress');
 return iranView(payload??{status:'PENDING'});
}
type View=ReturnType<typeof iranView>;
function iranScoreColor(value:number|null){return value===null?'#94a3b8':value<25?'#ef4444':value<40?'#f59e0b':value<60?'#94a3b8':value<75?'#22c55e':'#10b981';}
export function IranScore({value}:{value:number|null}){return <>{value===null?'—':<>{value.toFixed(1).split('.')[0]}<small className="ob-score-fraction">.{value.toFixed(1).split('.')[1]}</small></>}</>;}
function IranChart({view,compact=false}:{view:View;compact?:boolean}){
 const history='chartHistory' in view?view.chartHistory:view.history;
 const x=(p:{at:number},i:number)=>'chartEndAt' in view?26+132*(p.at-(view.chartEndAt-13*86400000))/(13*86400000):26+(history.length>1?132*i/(history.length-1):66);
 const points=history.map((p:{at:number;value:number},i:number)=>`${x(p,i)},${54-p.value*.44}`).join(' ');
 const last=history.at(-1),value=view.score;
 const color=iranScoreColor(value);
 const fillId=compact?'ob-fill-iran-summary':'ob-fill-iran-detail';
 return <div className={compact?'ob-summary-chart ob-summary-chart-frame':'ob-iran-chart'}>{compact&&<ChartAxisLabels dates/>}<svg viewBox="0 0 170 68" preserveAspectRatio={compact?"none":"xMidYMid meet"} role="img" aria-label="이란 전쟁 최근 14일 일별 참고 흐름"><title>기사 발표일 기준 재구성 · 마지막 계산값 유지 구간 포함</title><defs><linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>{[0,50,100].map(v=><g key={v}><text x="20" y={57-v*.44} textAnchor="end" fill="#96aabd" fontSize="9">{v}</text><line x1="26" x2="158" y1={54-v*.44} y2={54-v*.44} stroke="currentColor" strokeDasharray="2 4"/></g>)}{history.length>1&&last&&<><polygon points={`26,54 ${points} 158,54`} fill={`url(#${fillId})`}/><polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>{!compact&&<circle cx={x(last,history.length-1)} cy={54-last.value*.44} r="3" fill={color}/>}</>}{history.map((p:{at:number;value:number;carried?:boolean})=><g key={p.at}><title>{new Date(p.at).toISOString().slice(0,10)} · {p.value.toFixed(1)} · {p.carried?'마지막 계산값 유지':'보도 반영'}</title></g>)}<text x="26" y="66" fontSize="9" fill="#96aabd">0</text><text x="158" y="66" textAnchor="end" fontSize="9" fill="#96aabd">14</text></svg>{compact&&history.length>1&&last&&<span aria-hidden="true" className="ob-chart-endpoint" style={{left:`${x(last,history.length-1)/170*100}%`,top:`${(54-last.value*.44)/68*100}%`,background:color}}/>}</div>;
}
export function IranSummaryCard({view,onOpen}:{view:View;onOpen:()=>void}){
 if(view.overallEnded)return null;
 const daily='chartHistory' in view?view.chartHistory:view.history;
 const previous=daily.length>1?daily.at(-2)!.value:null;
 return <div className="ob-help-card"><ContentHelp label="이란 전쟁 도움말"><HelpText copy={HELP.iran}/></ContentHelp><button type="button" className="ob-summary-card ob-iran-summary" aria-label={`이란 전쟁 상세 보기 · ${view.message}`} onClick={onOpen}>
  <h3 className="ob-fit-title"><Swords aria-hidden="true"/><span>이란 전쟁</span></h3>
  {view.score!==null&&<div className="ob-summary-value"><strong style={{color:iranScoreColor(view.score)}}><IranScore value={view.score}/></strong><OutbreakChange current={view.score} previous={previous}/></div>}
  {view.score===null?<div className="ob-iran-fact-preview" role="status">{view.facts.length?<><strong>미국–이란 협상 관련 발표</strong><span>{view.facts[0].publicationDate} · 카타르 외교부</span><span>현재 상태 미확인</span></>:view.message}</div>:<IranChart view={view} compact/>}
 </button></div>;
}
const stateLabels:Record<string,string>={UNKNOWN:'미확인',ACTIVE:'교전 지속',CEASEFIRE_PROGRESS:'휴전·종전 진행',ENDED:'종전 확인',RECONFLICT:'재충돌'};
export function IranDetail({view}:{view:View}){
 return <article className="ob-detail" aria-labelledby="ob-iran-title"><header><h2 id="ob-iran-title">이란 전쟁</h2><span className="ob-stage">{view.message}</span></header>
  <p>{'reference' in view?'기사에서 확인한 협상·공격 등의 보도 흐름을 참고 점수로 보여줍니다. 임시 기준점 50에서 시작하며, 상승은 완화·하락은 긴장 확대 방향입니다. 종전 확률이나 공식 종전 판정이 아닙니다.':'확인된 공식 발표와 관계별 상태를 구분해 보여줍니다. 향후 종전 확률이 아닙니다.'}</p>
  {'events' in view&&<section className="ob-panel"><h3>점수 반영 이유</h3><p>기사 발표일 기준 재구성입니다. 과거에 공개됐던 점수나 사건 발생일 이력이 아닙니다. {'methodVersion' in view&&view.methodVersion==='R2'?'R2는 사건 중복 후보를 보류하고 원점수를 그대로 표시합니다. 단일 출처 보도는 사실 확인 완료를 뜻하지 않습니다.':'같은 날 같은 변화 규칙은 1회 반영합니다.'}</p>{'collectionState' in view&&view.collectionState&&<p role="status">수집 상태: {({UPDATED:'새 보도 반영',NO_NEW_ARTICLES:'신규 기사 없음',ANALYZED_NO_CHANGE:'분석 완료 · 점수 변화 없음',ANALYSIS_PENDING:'순차 분석 중',DISCOVERY_DELAYED:'발견 지연',ANALYSIS_FAILED:'일부 기사 분석 실패'} as Record<string,string>)[view.collectionState]}</p>}<ul>{view.events.map((e:any,i:number)=><li key={i}>{e.date} · {e.reason} · <a href={e.sourceUrl} target="_blank" rel="noreferrer">근거 원문</a></li>)}</ul></section>}
  <OfficialTimeline view={view}/>
  <div className="ob-detail-grid"><section className="ob-panel"><h3>최근 14일 참고 흐름</h3>{view.score===null?<p role="status">{view.message}. 확인되지 않은 자료로 점수를 산출하지 않습니다.</p>:<><div className="ob-probability"><strong><IranScore value={view.score}/></strong></div><IranChart view={view}/></>}
   {'reference' in view&&<p>새 변화가 반영되지 않은 날짜는 마지막 계산값을 유지합니다. 값이 유지됐다는 사실은 교전 중단이나 신규 관측 완료를 뜻하지 않습니다.</p>}
   <p>{'reference' in view?'계산 기준':'관측 기준'}: {view.observationAt?new Date(view.observationAt).toISOString().slice(0,10)+' UTC':'미확인'}</p>{'lastSignalDate' in view&&view.lastSignalDate&&<p>마지막 보도 반영일: {view.lastSignalDate} · 새 보도가 없으면 점수와 변화량을 유지합니다.</p>}</section>
  <section className="ob-panel"><h3>교전 관계별 상태</h3><dl className="ob-facts">{[['IRN_ISR','이란–이스라엘'],['IRN_USA','이란–미국']].map(([key,label])=><div key={key}><dt>{label}</dt><dd>{stateLabels[view.relations?.[key]??'UNKNOWN']}</dd></div>)}</dl><p>전체 종전: {view.overallEnded?'확인':'미확인'}</p></section></div>
  <section className="ob-formula"><h3>산식과 근거</h3><p>외교 30% · 휴전 이행 25% · 군사 충돌 20% · 호르무즈 15% · 핵 협상 10%</p>{'reference' in view?<p>각 영역은 임시 50점에서 시작합니다. 확인된 변화 보도에 고정 가감점을 반영하며, 미포착 자료는 개선으로 간주하지 않습니다.</p>:<p>호르무즈: 해상 안전 60% + 항행 제한·AIS 통항 연속성 40%. 통항량 정상 회복률이 아닙니다.</p>}{view.transit?.attribution&&<p>통항 집계: <a href="https://hormuz.now/data" target="_blank" rel="noreferrer">hormuz.now · CC BY 4.0</a> · ZGMINI 가공. AIS 비가시 선박은 포함되지 않을 수 있습니다.</p>}</section>
 </article>;
}
function OfficialTimeline({view}:{view:View}){
 return <section className="ob-panel ob-iran-timeline"><h3>최근 14일 확인된 공식 발표</h3><p>아래 기록은 발표 당시의 내용입니다. 현재 교전 중단·휴전·종전 확인을 뜻하지 않습니다.</p>{view.facts.length?<ul>{view.facts.map((f:any)=><li key={f.id}><time dateTime={f.observationDate}>{f.observationDate}</time><p>{f.summary}</p><a href={f.sourceUrl} target="_blank" rel="noreferrer">카타르 외교부 원문</a><p>발표일: {f.publicationDate} · 근거 검토: {new Date(f.verifiedAt).toISOString().slice(0,10)} UTC</p></li>)}</ul>:<p>이 기간에 공개 검증을 완료한 발표 기록이 없습니다. 공격이 없었다는 뜻은 아닙니다.</p>}</section>;
}
