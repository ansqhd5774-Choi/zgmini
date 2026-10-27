"use client";
import {useEffect,useState} from "react";
import {CalendarDays,ChevronDown,Info,Lightbulb,ShieldAlert,Swords,TrendingUp} from "lucide-react";
import {MarketFearGreedChart} from "./market-fear-greed-chart";
import "./outbreak-beginner-iran-r54.css";
import "./outbreak-iran-parity-r55.css";
import OutbreakNewsContainer from "./outbreak-news-container-r1";

type Point={at:number;value:number|null;carried?:boolean;phase?:string};
const DAY_MS=86400000;
function band(value:number|null){
 if(value===null)return {color:"#94a3b8",tone:"missing",name:"자료 미확인"};
 if(value<25)return {color:"#ef4444",tone:"very-negative",name:"진전 매우 낮음"};
 if(value<40)return {color:"#f59e0b",tone:"negative",name:"진전 낮음"};
 if(value<60)return {color:"#94a3b8",tone:"neutral",name:"진전 보통"};
 if(value<75)return {color:"#22c55e",tone:"positive",name:"진전 높음"};
 return {color:"#10b981",tone:"very-positive",name:"진전 매우 높음"};
}
function Scale({score}:{score:number|null}){
 const tones=[["very-negative","매우 부정"],["negative","부정"],["neutral","중립"],["positive","긍정"],["very-positive","매우 긍정"]];
 return <div className="ob54-scale" role="img" aria-label={score===null?"점수 미산출":"종전 진전도 "+score.toFixed(1)+"점 · "+band(score).name}>
  <div className="ob54-scale-track">{tones.map(([tone])=><span key={tone} data-band={tone}/>)}
   {score!==null&&<i aria-hidden="true" className="ob54-marker" style={{left:Math.min(100,Math.max(0,score))+"%",background:band(score).color}}/>}
  </div>
  <div className="ob54-scale-labels">{tones.map(([tone,label])=><span key={tone}>{label}</span>)}</div>
 </div>;
}
function Trend({view,compact=false}:{view:any;compact?:boolean}){
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia("(max-width:600px)");
  const update=()=>setMobile(media.matches);
  update();media.addEventListener("change",update);
  return()=>media.removeEventListener("change",update);
 },[]);
 const series:Array<Point>=Array.isArray(view.chartHistory)?view.chartHistory:Array.isArray(view.history)?view.history:[];
 const end=typeof view.chartEndAt==="number"&&Number.isFinite(view.chartEndAt)?view.chartEndAt:series.at(-1)?.at??null;
 const start=end===null?null:end-13*DAY_MS;
 const points=start===null?[]:series.filter(p=>Number.isFinite(p.at)&&p.at>=start&&p.at<=end!&&typeof p.value==="number"&&Number.isFinite(p.value)).sort((a,b)=>a.at-b.at);
 const dateKey=(at:number)=>new Date(at).toISOString().slice(0,10);
 const date=(value:string)=>value.slice(5).replace("-",".");
 const carried=(p:Point)=>p.carried===true||p.phase==="NO_NEW_RECORDED_CHANGE"||p.phase==="EARLY_WINDOW_NO_DATED_REPORT";
 // Calendar slots without a stored point remain null; provisional estimates retain their original values.
 const observed=new Map(points.map(p=>[dateKey(p.at),p.value!]));
 const calendar=start===null?[]:Array.from({length:14},(_,day)=>dateKey(start+day*DAY_MS));
 const chartData=calendar.map(day=>({date:day,score:observed.get(day)??null}));
 const axisTicks=(mobile?[0,4,8,13]:[0,2,4,6,8,10,13]).map(i=>calendar[i]).filter((day):day is string=>Boolean(day));
 const axisLabels=new Map(axisTicks.map(day=>[day,date(day)]));
 // Preserve each original segment's real-change/unchanged-carried distinction.
 // A gap over 1.5 calendar days must not be connected or interpolated.
 const lineSegments=points.slice(1).flatMap((p,i)=>{
  const prev=points[i];
  if(p.at-prev.at>DAY_MS*1.5)return [];
  return [{from:{date:dateKey(prev.at),score:prev.value!},to:{date:dateKey(p.at),score:p.value!},dashed:carried(p)}];
 });
 const carriedDates=new Set(points.filter(carried).map(p=>dateKey(p.at)));
 const latest=points.at(-1);
 // The compact mobile view shares the stored 14-day points and missing-day rules.
 // Its vertical scale expands only when the actual observed range permits it.
 const yAxisMax=Math.min(100,Math.max(30,Math.ceil(Math.max(0,...points.map(p=>p.value as number))/10)*10));
 const plot=start!==null&&points.length>0?<div className={compact?"ob58-mini-plot":"ob54-market-chart"} role="group"
  aria-label={"최근 14일 종전 진전도 잠정 흐름, 표시된 "+points.length+"개 날짜"}
  title="실제 과거 확정 관측값이 아닌 저장 자료 기반 추정 흐름. 새 변화 미반영은 점선"
  data-observed-days={points.length} data-carried-days={points.filter(carried).length}>
  <MarketFearGreedChart
   data={chartData} axisTicks={axisTicks} axisLabels={axisLabels}
   latestPoint={latest?{date:dateKey(latest.at),score:latest.value!}:null}
   lineSegments={lineSegments} compact={compact} yAxisMax={compact?yAxisMax:undefined}
   instanceKey={compact?"iran-mobile-14d":"iran-provisional-14d"}
   gradientId={compact?"ob58-iran-mini-gradient":"ob54-iran-provisional-gradient"}
   formatTooltipLabel={day=>date(day)+(carriedDates.has(day)?" · 변화 미확인·이월":"")}
   color={band(view.score).color} marketScoreBands={!compact}
  />
 </div>:<div className={compact?"ob58-mini-empty":"ob54-empty"} role="status">14일 구간의 저장된 점수가 없습니다.</div>;
 if(compact)return <div className="ob58-mini-trend" role="region" aria-label="이란 전쟁 심리 최근 14일 추이">
  <div className="ob58-mini-head"><span>14일 추이</span><small>0~{yAxisMax}점{yAxisMax<100?" 확대":""}</small></div>
  {plot}
  {calendar.length>0&&<div className="ob58-mini-axis" aria-hidden="true"><span>{date(calendar[0])}</span><span>{date(calendar.at(-1)!)}</span></div>}
 </div>;
 return <section className="ob-panel ob54-trend" aria-labelledby="ob54-chart-title">
  <div className="ob54-chart-head"><h3 id="ob54-chart-title"><TrendingUp size={16} aria-hidden="true"/> 14일 추이</h3><span>잠정 추정 · 저장된 흐름</span></div>
  {plot}
  <p className="ob54-note"><Info size={15} aria-hidden="true"/> <span>14일 추정 흐름으로, 과거 확정 점수는 아닙니다. 점선은 새 변화가 확인되지 않아 추정값을 유지한 구간이며, 교전 중단을 뜻하지 않습니다.</span></p>
 </section>;
}
const relationLabel:Record<string,string>={UNKNOWN:"미확인",ACTIVE:"교전 지속",CEASEFIRE_PROGRESS:"휴전·종전 진행",ENDED:"종전 확인",RECONFLICT:"재충돌"};
export default function OutbreakBeginnerIran({view}:{view:any}){
 const score: number|null=typeof view.score==="number"&&Number.isFinite(view.score)?view.score:null;
 const state=band(score);
 const dateAt=typeof view.chartEndAt==="number"?view.chartEndAt:view.observationAt;
 const date=typeof dateAt==="number"&&Number.isFinite(dateAt)?new Date(dateAt).toISOString().slice(0,10):"미확인";
 const isEstimate=view.reference===true||view.dailyAnchorEstimate===true||Boolean(view.displayEstimate);
 const relation=(key:string)=>relationLabel[view.relations?.[key]??"UNKNOWN"]??"미확인";
 const summary=score===null?"종전 진전도를 확인할 자료가 없습니다.":score<40?"저장된 근거에서 종전 진전 신호가 제한적인 구간입니다.":"저장된 근거에서 종전 진전 신호를 계속 관찰하고 있습니다.";
 return <article className="ob-detail ob-beginner-detail ob54-detail ob55-iran-parity" aria-labelledby="ob-iran-title">
  <header className="ob53-title ob54-heading">
   <div><span className="ob-eyebrow">선택한 이벤트 · 지정학</span>
    <h2 id="ob-iran-title">이란 전쟁 <span className="ob53-tone-pill ob54-state" data-tone={state.tone}>{state.name}</span></h2>
    <p>{summary}</p>
   </div>
   <span className="ob-stage">{view.message}</span>
  </header>
  <div className="ob53-intro-grid ob55-intro">
   <section className="ob-panel ob53-score-card ob55-score-card" aria-label="이란 전쟁 심리">
    <div className="ob58-mobile-titlebar"><strong>이란 전쟁 심리</strong><time dateTime={date==="미확인"?undefined:date}>{date.replaceAll("-",".")}</time></div>
    <div className="ob53-metric-row ob54-kpis">
     <div className="ob53-current"><span>이란 전쟁 심리</span><strong>{score===null?"—":score.toFixed(1)}<small>점 / 100</small></strong><span className="ob58-status" data-tone={state.tone}>{state.name}</span></div>
     <div className="ob53-week"><span>주간 변화</span><strong>—</strong><small>확정 비교값 미제공</small></div>
     <div className="ob53-asof"><span>분석 기준일</span><strong><CalendarDays size={15} aria-hidden="true"/>{date}</strong><small>{isEstimate?"잠정 계산 기준":"저장 자료 기준"}</small></div>
    </div>
    <Trend view={view} compact/>
    <div className="ob57-scale-summary"><Scale score={score}/><p className="ob57-summary">{summary} 종전 확률이나 미래 종료 날짜를 뜻하지 않습니다.</p></div>
   </section>
   <section className="ob-panel ob53-explain ob54-meaning" aria-labelledby="ob54-meaning">
    <h3 id="ob54-meaning"><Lightbulb size={17} aria-hidden="true"/> 이 숫자는 무슨 뜻인가요?</h3>
    <p>종전 진전 신호를 0~100점으로 나타낸 참고 지표입니다.</p>
    <p>점수가 낮으면 확인된 진전이 적고, 높으면 진전 신호가 많다는 뜻입니다.</p>
    <p>종전 확률이나 미래 종료 날짜를 뜻하지 않습니다.</p>
   </section>
  </div>
  <div className="ob53-main-grid ob55-main">
   <Trend view={view}/>
   <OutbreakNewsContainer eventId="iran"/>
   <div className="ob53-beginner-stack ob54-right">
    <section className="ob-panel ob53-guide ob54-guide" aria-labelledby="ob54-guide">
     <h3 id="ob54-guide"><ShieldAlert size={16} aria-hidden="true"/> 주식 초보자용 해석</h3>
     <dl>
      <div><dt>현재 상황</dt><dd>{summary}</dd></div>
      <div><dt>시장 민감도</dt><dd>유가·안전자산·방산 등 관련 자산의 변동성에 영향을 줄 수 있습니다.</dd></div>
      <div><dt>주의할 점</dt><dd>점수만으로 주가 방향이나 종전 가능성을 단정할 수 없습니다.</dd></div>
     </dl>
    </section>
    <section className="ob-panel ob54-relations ob55-relations" aria-labelledby="ob54-relations">
     <h3 id="ob54-relations"><Swords size={16} aria-hidden="true"/> 교전 관계별 상태</h3>
     <div><span>이란–이스라엘<strong>{relation("IRN_ISR")}</strong></span>
      <span>이란–미국<strong>{relation("IRN_USA")}</strong></span>
      <span>전체 종전<strong>{view.overallEnded?"확인":"미확인"}</strong></span></div>
    </section>
   </div>
  </div>
  <details className="ob54-disclosure"><summary>점수 반영 이유 <ChevronDown size={17} aria-hidden="true"/></summary>
   <div><p>저장된 사건·보도 변화로 계산한 잠정 진전도입니다. 보도 공백을 평온으로 간주하지 않습니다.</p>
    {view.dailyAnchorEstimate&&<p>R5의 날짜별 저장 결과를 사용하며, 과거 확정 관측값으로 표시하지 않습니다.</p>}
    {view.collectionState&&<p>수집 상태: {view.collectionState}</p>}
    {view.lastSignalDate&&<p>마지막 보도 반영일: {view.lastSignalDate}</p>}
    {view.methodVersion==="R3"&&<p>변화 보도 반영 영역: {view.observedDomains?.length??0}/5 · 미관측 영역은 평온을 확인한 값이 아닙니다.</p>}
    {Array.isArray(view.events)&&view.events.length>0?<ul>{view.events.map((e:any,i:number)=><li key={i}>{e.date} · {e.reason} · <a href={e.sourceUrl} target="_blank" rel="noreferrer">근거 원문</a></li>)}</ul>:<p>공개된 사건별 세부 근거가 없습니다. 기록 부재는 사건 부재를 뜻하지 않습니다.</p>}
   </div>
  </details>
  <details className="ob54-disclosure"><summary>산식·근거 보기 <ChevronDown size={17} aria-hidden="true"/></summary>
   <div><p>외교·휴전 이행·군사 충돌·해상 안전·핵협상 관련 저장 자료로 종전 진전도를 평가합니다.</p>
    <p>수집 시각, 관측일, 계산 기준일은 다를 수 있으며 비공개 세부 산식은 공개하지 않습니다.</p>
    {view.collectionCheckedAt&&<p>마지막 수집 확인: {new Date(view.collectionCheckedAt).toISOString().replace("T"," ").slice(0,16)} UTC</p>}
    {view.newsCollection?.feeds?.length>0&&<ul>{view.newsCollection.feeds.map((f:any)=><li key={f.id}>{f.id} · {f.status==="COLLECTED"?"수집 성공":"갱신 지연"}</li>)}</ul>}
    {view.transit?.attribution&&<p>해상 통항 집계: <a href="https://hormuz.now/data" target="_blank" rel="noreferrer">hormuz.now · CC BY 4.0</a> · ZGMINI 가공</p>}
    <section className="ob54-timeline"><h4>최근 14일 확인된 공식 발표</h4>
     <p>발표 당시의 내용이며 현재 휴전·종전 확인을 뜻하지 않습니다.</p>
     {view.facts?.length>0?<ul>{view.facts.map((f:any)=><li key={f.id}><time dateTime={f.observationDate}>{f.observationDate}</time> · {f.summary} · <a href={f.sourceUrl} target="_blank" rel="noreferrer">공식 발표 원문</a><small>발표일 {f.publicationDate} · 검토 {new Date(f.verifiedAt).toISOString().slice(0,10)} UTC</small></li>)}</ul>:<p>공개 검증을 완료한 공식 발표 기록이 없습니다. 공격이 없었다는 뜻은 아닙니다.</p>}
    </section>
   </div>
  </details>
 </article>;
}
