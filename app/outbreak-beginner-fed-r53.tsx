"use client";
import {CalendarDays, ChevronDown, CircleHelp, Lightbulb, ShieldAlert, TrendingDown} from "lucide-react";
import {useEffect,useState} from "react";
import {MarketFearGreedChart} from "./market-fear-greed-chart";
import "./outbreak-beginner-r53.css";
import OutbreakNewsUI from "./outbreak-news-r57";

export type RateScorePoint={label:string;value:number};
export type RateStoredSnapshot={status:"READY";score:number;observationDate:string;version:string;sourceStoredAt:number;week:RateScorePoint[];oneMonth:RateScorePoint[]};
export function rateBand(value:number|null):{label:string;className:string;color:string}{
 if(value===null||!Number.isFinite(value))return {label:"자료 없음",className:"missing",color:"#94a3b8"};
 if(value<25)return {label:"매우 부정",className:"very-negative",color:"#ef4444"};
 if(value<40)return {label:"부정",className:"negative",color:"#f59e0b"};
 if(value<60)return {label:"중립",className:"neutral",color:"#94a3b8"};
 if(value<75)return {label:"긍정",className:"positive",color:"#22c55e"};
 return {label:"매우 긍정",className:"very-positive",color:"#10b981"};
}
// The 14-calendar-day window ends on the stored observation date.
// Missing dates remain missing. Never backfill points from the last-known score.
export function stored14DayWindow(rate:RateStoredSnapshot|null){
 if(!rate||!Array.isArray(rate.oneMonth))return null;
 const end=Date.parse(rate.observationDate+"T00:00:00Z");
 if(!Number.isFinite(end))return null;
 const start=end-13*86_400_000;
 const daily=new Map<number,RateScorePoint>();
 for(const row of rate.oneMonth){
  if(!row||typeof row.label!=="string"||!Number.isFinite(row.value)||row.value<0||row.value>100)continue;
  const at=Date.parse(row.label+"T00:00:00Z");
  if(Number.isFinite(at)&&at>=start&&at<=end&&new Date(at).toISOString().slice(0,10)===row.label)daily.set(at,row);
 }
 return {start,end,points:[...daily.entries()].sort((a,b)=>a[0]-b[0]).map(([at,row])=>({at,label:row.label,value:row.value}))};
}
function ScoreScale({score}:{score:number|null}){
 const segments=[{label:"매우 부정",key:"very-negative"},{label:"부정",key:"negative"},{label:"중립",key:"neutral"},{label:"긍정",key:"positive"},{label:"매우 긍정",key:"very-positive"}];
 return <div className="ob53-score-scale" role="img" aria-label={score===null?"평가 없음":"0~100점, 현재 "+score.toFixed(1)+"점 · "+rateBand(score).label}>
  <div className="ob53-scale-colors">{segments.map(x=><span key={x.key} data-band={x.key}/>)}
   {score!==null&&<span className="ob53-scale-pointer" style={{left:Math.max(0,Math.min(100,score))+"%"}}/>}
  </div>
  <div className="ob53-scale-labels">{segments.map(x=><span key={x.key}>{x.label}</span>)}</div>
 </div>;
}
function Rate14Chart({rate,compact=false}:{rate:RateStoredSnapshot|null;compact?:boolean}){
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{
  const query=window.matchMedia("(max-width: 600px)");
  const update=()=>setMobile(query.matches);
  update();query.addEventListener("change",update);
  return()=>query.removeEventListener("change",update);
 },[]);
 const period=stored14DayWindow(rate);
 const data=period?.points??[];
 const hasData=data.length>=2;
 // Keep the approved source window: missing dates remain null, not made-up points.
 const observed=new Map(data.map(row=>[row.label,row.value]));
 const calendar=period?Array.from({length:14},(_,day)=>new Date(period.start+day*86_400_000).toISOString().slice(0,10)):[];
 const chartData=calendar.map(date=>({date,score:observed.get(date)??null}));
 const tickOffsets=mobile?[0,4,8,13]:[0,2,4,6,8,10,13];
 const axisTicks=tickOffsets.map(day=>calendar[day]).filter((date):date is string=>Boolean(date));
 const axisLabels=new Map(axisTicks.map(date=>[date,date.slice(5).replace("-",".")]));
 const gapGuides=data.slice(1).flatMap((row,i)=>row.at-data[i].at>86_400_000?[{
  from:{date:data[i].label,score:data[i].value},
  to:{date:row.label,score:row.value},
 }]:[]);
 const latest=data.length?{date:data[data.length-1].label,score:data[data.length-1].value}:null;
 const yAxisMax=Math.min(100,Math.max(30,Math.ceil(Math.max(0,...data.map(row=>row.value))/10)*10));
 const plot=period&&hasData?<div className={compact?"ob58-mini-plot":"ob53-market-chart"} role="group"
   aria-label={"금리 심리 최근 14일, 저장된 "+data.length+"개 날짜의 관측값만 표시"}
   data-observed-days={data.length} data-missing-days={14-data.length}>
  <MarketFearGreedChart
   data={chartData} axisTicks={axisTicks} axisLabels={axisLabels}
   latestPoint={latest} gapGuides={gapGuides}
   compact={compact} yAxisMax={compact?yAxisMax:undefined}
   instanceKey={compact?"rate-mobile-14d":"rate-sentiment-14d"}
   gradientId={compact?"ob61-rate-mobile-gradient":"ob53-rate-sentiment-gradient"}
   formatTooltipLabel={date=>date.slice(5).replace("-",".")}
   color={rateBand(rate?.score??null).color} marketScoreBands
  />
 </div>:<div className={compact?"ob58-mini-empty":"ob53-no-trend"} role="status">14일 범위에 저장된 점수가 2개 미만입니다. 임의의 그래프를 만들지 않습니다.</div>;
 if(compact)return <div className="ob58-mini-trend" role="region" aria-label="금리 심리 최근 14일 추이">
  <div className="ob58-mini-head"><span>14일 추이</span><small>{hasData?"0~"+yAxisMax+"점"+(yAxisMax<100?" 확대":""):"저장 데이터 대기"}</small></div>
  {plot}
  {calendar.length>0&&<div className="ob58-mini-axis" aria-hidden="true"><span>{calendar[0].slice(5).replace("-",".")}</span><span>{calendar[calendar.length-1].slice(5).replace("-",".")}</span></div>}
 </div>;
 return <section className="ob53-chart ob-panel" aria-labelledby="ob53-chart-title">
  <div className="ob53-chart-heading"><h3 id="ob53-chart-title">14일 추이 <CircleHelp size={13} aria-hidden="true"/></h3>
   <span>{rate?"관측 "+data.length+"일 / 14일":"저장 데이터 대기"}</span></div>
  {plot}
  <p className="ob53-chart-footnote">기준일 포함 최근 14일 · 저장된 날짜만 표시 · 비거래일·미수집일은 추정하지 않음</p>
 </section>;
}
export default function OutbreakBeginnerFed({rate,deltaWeek}:{rate:RateStoredSnapshot|null;deltaWeek:number|null}){
 const score=rate?.score??null;
 const band=rateBand(score);
 const negative=deltaWeek!==null&&deltaWeek<0;
 const positive=deltaWeek!==null&&deltaWeek>0;
 const date=rate?.observationDate??"미확인";
 const description=score===null?"금리 심리 점수를 확인할 수 없습니다.":"현재 금리 관련 시장 심리는 "+band.label+" 구간입니다.";
 const interpretation=score===null?"현재 점수가 없어 방향을 판단하지 않습니다.":score<40?"금리 부담이 커지는 방향의 신호가 상대적으로 우세합니다.":score<60?"금리 부담 완화와 악화 어느 한쪽으로 크게 기울지 않은 구간입니다.":"금리 부담이 완화되는 방향의 신호가 상대적으로 우세합니다.";
 return <article className="ob-detail ob-beginner-detail ob61-fed-compact" aria-labelledby="ob-detail-title">
   <header className="ob53-title"><div><span className="ob-eyebrow">선택한 이벤트 · 통화 정책</span>
     <h2 id="ob-detail-title">금리 심리 <span className="ob53-tone-pill" data-tone={band.className}>{band.label}</span></h2>
     <p>{description}</p></div>
    <span className="ob-stage">금리 심리 · 저장 자료</span>
   </header>
   <div className="ob53-intro-grid">
    <section className="ob53-score-card ob-panel" aria-label="금리 심리">
     <div className="ob58-mobile-titlebar"><strong>금리 심리</strong><time dateTime={date==="미확인"?undefined:date}>{date.replaceAll("-",".")}</time></div>
     <div className="ob53-metric-row">
      <div className="ob53-current"><span>금리 심리 점수</span><strong>{score===null?"—":score.toFixed(1)}<small>점</small></strong>
       <span className="ob58-status" data-tone={band.className}>{band.label}</span>
       {deltaWeek!==null&&<span className="ob61-week-inline" data-change={negative?"down":positive?"up":"flat"}>7일 {deltaWeek>0?"+":""}{deltaWeek.toFixed(1)}점</span>}
      </div>
      <div className="ob53-week"><span>주간 변화</span><strong data-change={negative?"down":positive?"up":"flat"}>{deltaWeek===null?"—":(deltaWeek>0?"+":"")+deltaWeek.toFixed(1)}<small>점</small>{negative?<TrendingDown size={15} aria-label="하락"/>:null}</strong></div>
      <div className="ob53-asof"><span>분석 기준일</span><strong><CalendarDays size={15} aria-hidden="true"/>{date}</strong></div>
     </div>
     <Rate14Chart rate={rate} compact/>
     <div className="ob57-scale-summary"><ScoreScale score={score}/><p className="ob57-summary">{interpretation}</p></div>
    </section>
    <section className="ob53-explain ob-panel" aria-labelledby="ob53-meaning">
     <h3 id="ob53-meaning"><Lightbulb size={17} aria-hidden="true"/> 이 숫자는 무슨 뜻인가요?</h3>
     <p>점수가 높으면 금리 부담 완화 신호가, 낮으면 부담 확대 신호가 상대적으로 강하다는 뜻입니다.</p>
     <p>{interpretation}</p>
    </section>
   </div>
   <div className="ob53-main-grid">
    <Rate14Chart rate={rate}/>
    <OutbreakNewsUI eventId="fed"/>
    <div className="ob53-beginner-stack">
     <section className="ob53-guide ob-panel" aria-labelledby="ob53-beginners">
      <h3 id="ob53-beginners">주식 초보자용 해석</h3>
      <dl>
       <div><dt>지금 상황</dt><dd><strong>{band.label}</strong><span>{description}</span></dd></div>
       <div><dt>시장 영향</dt><dd><strong>관련 금리·채권·주가를 함께 확인</strong><span>심리 점수 하나로 주가 방향을 단정할 수 없습니다.</span></dd></div>
       <div><dt>주의할 점</dt><dd><strong><ShieldAlert size={13} aria-hidden="true"/> 금리 인하 확률이 아닙니다</strong><span>실제 정책 결정 여부는 별도로 확인해야 합니다.</span></dd></div>
      </dl>
     </section>
     <section className="ob53-assets ob-panel" aria-label="관련 자산"><h3>관련 자산</h3><div><span>미국 국채</span><span>달러</span><span>주식</span></div></section>
    </div>
   </div>
   <details className="ob53-details"><summary>분석 질문 · 판정 기준 <ChevronDown aria-hidden="true" size={15}/></summary>
    <div><p>분석 질문: 최근 미국 시장금리 움직임은 얼마나 우호적인가?</p><p>기준: 기존 미국 연준 H.15 국채금리 기반 금리차·RSI·변동성 점수입니다.</p></div>
   </details>
   <details className="ob53-details"><summary>자세한 산식·근거 보기 <ChevronDown aria-hidden="true" size={15}/></summary>
    <div><p>미국 연준 H.15 자료의 국채금리 차이·금리 추세·변동성 변화를 기반으로 계산한 저장 점수입니다.</p><p>자료: 미국 연준 H.15 DGS2·DGS3MO·DGS10 · PC 계산 후 게시된 결과만 표시합니다.</p><p>금리 결정 확률이 아니라 시장 금리 심리를 관찰하는 지표입니다.</p></div>
   </details>
   <p className="ob53-note">시장금리 기반 심리 점수이며 FedWatch 확률이나 금리 인하 예측값이 아닙니다. 현재 표시되는 점수는 기존 저장 자료를 사용합니다.</p>
  </article>;
}
