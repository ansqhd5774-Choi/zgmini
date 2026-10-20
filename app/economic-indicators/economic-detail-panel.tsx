"use client";
import {useMemo,type CSSProperties} from "react";
import {useStoredIndex} from "../../components/use-stored-index";
import {economicDetailById,type EconomicDomainId} from "../../lib/economic-detail-catalog";
import {liquidityStoredScoreComparisons} from "../../worker/projection-builders/liquidity-stored-history.mjs";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";
import {InflationMiniChart,type InflationMiniTrendPoint} from "../inflation/inflation-mini-chart";
import {ContentHelp} from "../content-help";
import {EconomicFavoriteButton} from "./economic-favorite-button";

type Point={date?:string;label?:string;score?:number|null;value?:number|null;breakBefore?:boolean};
type Indicator={
 id?:string;name?:string;label?:string;status?:string;score?:number|null;
 value?:number|null;unit?:string;displayValue?:string|null;formattedValue?:string|null;
 observationDate?:string|null;asOfDate?:string|null;availableAt?:string|null;
 previousValue?:number|null;previousObservationDate?:string|null;
 criterion?:string|null;criterionLabel?:string|null;
 source?:string|null;sourceUrl?:string|null;description?:string|null;content?:string|null;
 history?:Point[];trend?:Point[];
 releaseCadence?:string|null;nextReleaseDate?:string|null;nextRelease?:string|null;
};
type Domain={
 id:string;status?:string;score?:number|null;state?:string;
 asOfDate?:string|null;observationDate?:string|null;updatedAt?:string|null;methodologyVersion?:string|null;
 dataPhase?:"OBSERVED"|"CARRY_FORWARD";scoreChange?:number|null;
 indicators?:Indicator[];trend?:Point[];
 scoreComparisons?:{week?:number|null;month?:number|null;threeMonth?:number|null;sixMonth?:number|null;year?:number|null};
};
type Snapshot={status:string;asOfDate?:string|null;domains?:Domain[]};
const dated=(s:unknown):s is string=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"));
const finite=(n:unknown):n is number=>typeof n==="number"&&Number.isFinite(n);
const validScore=(n:unknown):n is number=>finite(n)&&n>=0&&n<=100;
const dateLabel=(s?:string|null)=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10).replaceAll("-",". ")+".":"—";
// Match existing dashboard score bands; same score must have same meaning and line color.
const tone=(score:number|null)=>score===null?"#94a3b8":score<25?"#ef4444":score<40?"#f59e0b":score<60?"#94a3b8":score<75?"#22c55e":"#10b981";
const stage=(score:number|null)=>score===null?"확인 필요":score<25?"위험":score<40?"주의":score<60?"중립":score<75?"양호":"안정";
const judgement=(score:number|null)=>score===null?{name:"평가 없음",tone:"missing"}:score>=60?{name:"긍정",tone:"positive"}:score>=40?{name:"중립",tone:"neutral"}:{name:"부정",tone:"negative"};
const textValue=(v:unknown,unit?:string|null)=>finite(v)?String(Number(v.toFixed(Math.abs(v)>=100?1:2)))+(unit??""):"—";
const technicalSource=(source?:string|null)=>source==="STORED_PIT_HISTORY"?"공개 저장 평가점수":source??"출처 미제공";
const currentPresentation=(item:Indicator)=>{
 if(item.status==="READY"){
  const printed=[item.displayValue,item.formattedValue].find(s=>typeof s==="string"&&s.trim());
  if(printed)return {value:printed,detail:dateLabel(item.observationDate??item.asOfDate),type:"raw"};
  if(finite(item.value))return {value:textValue(item.value,item.unit),detail:dateLabel(item.observationDate??item.asOfDate),type:"raw"};
  if(validScore(item.score))return {value:item.score.toFixed(1)+"점",detail:"저장 평가점수 · 원자료 미제공",type:"score"};
 }
 return {value:"—",detail:"원자료·평가점수 미제공",type:"missing"};
};
const indicatorDescription=(item:Indicator,label:string)=>item.content??item.description??(currentPresentation(item).type==="score"?label+"의 구성 평가점수입니다. 원자료 수치가 아닙니다.":"검증된 원자료 정보가 제공되지 않았습니다.");
const approvedGrowthLabels:Record<string,string>={G010:"제조업 신규주문",G019:"산업생산",G035:"비농업고용 증감",G060:"신규 사업체 신청"};
const indicatorLabel=(item:Indicator,domainId:string,index:number)=>item.label??item.name??(domainId==="growth"&&item.id?approvedGrowthLabels[item.id]:undefined)??item.id??"구성 지표 "+(index+1);

function normalizeTrend(points:Point[]|undefined){
 const byDay=new Map<string,number>();
 for(const p of Array.isArray(points)?points:[]){
  const d=p?.date??p?.label,v=p?.score??p?.value;
  if(dated(d)&&validScore(v))byDay.set(d,v);
 }
 return [...byDay].sort(([a],[b])=>a.localeCompare(b)).map(([label,value])=>({label,value}));
}
function indicatorTrend(item:Indicator):InflationMiniTrendPoint[]{
 const rows=Array.isArray(item.trend)?item.trend:Array.isArray(item.history)?item.history:[];
 return rows.flatMap(p=>{
  const date=p?.date??p?.label,value=p?.value??p?.score;
  return dated(date)&&finite(value)?[{date,value,breakBefore:p.breakBefore===true}]:[];
 });
}
function IndicatorHelp({item,title}:{item:Indicator;title:string}){
 const href=typeof item.sourceUrl==="string"&&/^https:\/\//.test(item.sourceUrl)?item.sourceUrl:null;
 return <ContentHelp label={title+" 도움말"}><p>{indicatorDescription(item,title)}</p>
  <p>원자료와 0~100점은 서로 다른 값입니다. 결측은 0점이 아닙니다.</p>
  <p>관측일: {dateLabel(item.observationDate??item.asOfDate)} · 출처: {technicalSource(item.source)}</p>
  {href&&<a href={href} target="_blank" rel="noopener noreferrer">공개 원문 열기 ↗</a>}
 </ContentHelp>;
}
export default function EconomicDetailPanel({id}:{id:EconomicDomainId}){
 const config=economicDetailById(id)!;
 const {payload,loading,error}=useStoredIndex<Snapshot>("/api/market-score");
 const domain=payload?.domains?.find(item=>item.id===id);
 const score=domain?.status==="READY"&&validScore(domain.score)?domain.score:null;
 const history=useMemo(()=>normalizeTrend(domain?.trend),[domain?.trend]);
 const oneYear=useMemo(()=>{
  const latest=history.at(-1)?.label;
  if(!latest)return [];
  const start=new Date(latest+"T00:00:00Z");start.setUTCFullYear(start.getUTCFullYear()-1);
  return history.filter(p=>p.label>=start.toISOString().slice(0,10));
 },[history]);
 const chart=oneYear.map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint));
 const last=chart.at(-1);
 const latestPoint:MarketFearGreedChartValidPoint|null=last&&finite(last.score)?{date:last.date,score:last.score}:null;
 const axisLabels=new Map(chart.map(p=>[p.date,p.date.slice(5,7)]));
 const axisTicks=chart.filter((_,i)=>i===0||i===chart.length-1||i%Math.max(1,Math.floor(chart.length/6))===0).map(p=>p.date);
 const lastSavedHistory=history.at(-1)??null;
 const periodSourceMismatch=Boolean(score!==null&&lastSavedHistory&&Math.abs(lastSavedHistory.value-score)>1e-6);
 const computed=liquidityStoredScoreComparisons(history,lastSavedHistory?.label??"",score);
 // Explicit stored comparisons take priority; derive missing slots ONLY from an
 // actually matching current score and saved historical observations.
 const producer=domain?.scoreComparisons;
 const periods={
  week:producer?.week??computed.week,
  month:producer?.month??computed.month,
  threeMonth:producer?.threeMonth??computed.threeMonth,
  sixMonth:producer?.sixMonth??computed.sixMonth,
  year:producer?.year??computed.year,
 };
 const hasVerifiedPeriodComparisons=Object.values(periods).some(value=>typeof value==="number"&&Number.isFinite(value));
 const comparisons=[{label:"1주",value:periods.week??null},{label:"1개월",value:periods.month??null},{label:"3개월",value:periods.threeMonth??null},{label:"6개월",value:periods.sixMonth??null},{label:"1년",value:periods.year??null}];
 const observations=(domain?.indicators??[]).filter((row):row is Indicator=>Boolean(row&&typeof row==="object"));
 const scored=observations.filter(item=>item.status==="READY"&&validScore(item.score));
 const ranked=[...scored].sort((a,b)=>(b.score??0)-(a.score??0));
 const highCount=Math.min(3,Math.ceil(ranked.length/2)),lowCount=Math.min(3,Math.floor(ranked.length/2));
 const strongest=ranked.slice(0,highCount);
 const weakest=ranked.slice(ranked.length-lowCount).reverse();
 const date=dated(domain?.asOfDate)?domain.asOfDate:dated(payload?.asOfDate)?payload.asOfDate:null;
 const v11=id==="breadth"&&domain?.methodologyVersion==="BREADTH_V11_FIXED_5F_OBSERVED_EMA3_CONTINUITY";
 const v9=v11||(id==="breadth"&&domain?.methodologyVersion==="BREADTH_R10_V9_FIXED_5F_VALID_OBSERVATION_SHADOW");
 const v9Pending=v9&&domain?.dataPhase==="CARRY_FORWARD";
 const observed=dated(domain?.observationDate)?domain.observationDate:null;
 const v9Delta=v9&&finite(domain?.scoreChange)?domain.scoreChange:null;
 const publicNote=v11?"저장 평가 · V11":v9?"저장 평가 · V9":domain?.methodologyVersion??"공개 저장 결과";
 const color=tone(score);
 return <div className="economic-detail-page" data-economic-domain={id} style={{"--econ-accent":color} as CSSProperties}>
  <section className="cnn-reference-panel fg-card fg-shared-shell inflation-target-card economic-target-card" data-testid={"economic-"+id+"-hero"} aria-busy={loading} data-market-state={loading?"loading":score===null?"unavailable":"ready"} data-history-alignment={score===null?"unavailable":!lastSavedHistory?"missing":periodSourceMismatch?"mismatch":"matched"}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI ECONOMIC DETAIL" title={"미국 "+config.name} description="저장된 시장 점수 기준" dateLabel="데이터 기준일" date={dateLabel(date)} source={publicNote}/></div>
   <div className="fg-content-slot">
    <div className="fg-score-slot"><MarketScoreOrb score={loading||score===null?"—":score.toFixed(1)} state={loading?"확인 중":stage(score)} variant="hero" comparisonItems={comparisons} comparisonAriaLabel={config.name+" 시장 우호점수 기간별 변화"}/>{v9&&score!==null&&<div className="economic-v9-status" data-testid="breadth-v9-update"><span>{v9Pending?"집계 중":"자료 반영"} · 관측 {dateLabel(observed)}</span>{v9Delta!==null&&Math.abs(v9Delta)>0.0000001&&<strong data-move={v9Delta>0?"up":"down"}>{v9Delta>0?"▲":"▽"}{Math.abs(v9Delta).toFixed(1)}</strong>}</div>}</div>
    <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart data={chart} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} showExtrema={chart.length>=3} instanceKey={"economic-"+id} gradientId={"economic-"+id+"-fill"} color={color} formatTooltipLabel={dateLabel} marketScoreBands={id!=="inflation"} emptyLabel={loading?"불러오는 중":"저장된 점수 이력 없음"}/></div></div></MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>{v9?"관측 기준":"차트 원칙"}</span><strong>{v9?`${dateLabel(date)} 기준 · ${dateLabel(observed)} 관측 점수${v9Pending?" 유지 · 신규 자료 반영 시 갱신":""}`:periodSourceMismatch&&lastSavedHistory&&score!==null?`현재 ${score.toFixed(1)}점(${dateLabel(date)}) · 이력 마지막 ${lastSavedHistory.value.toFixed(1)}점(${dateLabel(lastSavedHistory.label)}) · ${hasVerifiedPeriodComparisons?"기간 비교는 검증된 별도 저장 점수 기준":"서로 달라 기간별 비교 보류"}`:lastSavedHistory?`저장 이력 마지막 ${dateLabel(lastSavedHistory.label)} · 확인된 비교기간만 표시`:"저장 점수 이력 없음 · 비교 불가 기간은 —"}</strong></div></div>
  </section>
  <section className="economic-beginner" data-testid={"economic-"+id+"-guide"}>
   <p className="cnn-eyebrow">BEGINNER GUIDE</p>
   <h2>{config.name} 점수, 처음이라면 이렇게 보세요</h2>
   <div className="economic-beginner-grid">
    <article><h3>01 · 점수가 높으면 무조건 주가가 오르나요?</h3><p>아니요. {config.reading} 시장 점수는 확률이나 매매 신호가 아닙니다.</p></article>
    <article><h3>02 · 어떤 지표를 함께 확인해야 하나요?</h3><p>{config.description} 서로 다른 지표의 관측 주기와 결측 상태도 확인하세요.</p></article>
    <article><h3>03 · 과거 점수와 오늘 점수가 다른 이유는?</h3><p>과거 차트는 실제로 저장된 관측 점수만 표시합니다. 관측일·저장일·현재 평가일은 서로 다르며, 과거 자료가 개정될 수 있습니다.</p></article>
    <article><h3>04 · 숫자 대신 ‘—’가 표시되는 이유는?</h3><p>검증된 비교 기간의 점수나 공식 발표일이 확보되지 않았다는 뜻입니다. 0점이나 변동 없음으로 해석하지 마세요.</p></article>
   </div>
  </section>
  <section className="economic-reason" data-testid={"economic-"+id+"-reasons"} aria-labelledby={"economic-"+id+"-reasons-title"}>
   <h2 id={"economic-"+id+"-reasons-title"}>왜 {score===null?"—":score.toFixed(1)}점인가요?</h2>
   <p>구성 지표의 저장 평가를 상대적으로 비교합니다. 점수의 실제 산식·가중치를 이 화면에서 재계산하지 않습니다.</p>
   <div className="economic-reason-grid">
    <div><h3>상대적으로 높은 지표</h3>{strongest.length?<ul>{strongest.map((item,i)=><li key={item.id??item.name??i}><strong>{indicatorLabel(item,id,i)}</strong><span>저장 평가 {item.score?.toFixed(1)}점 · 관측 {dateLabel(item.observationDate??item.asOfDate)}</span></li>)}</ul>:<p>비교 가능한 저장 구성 점수가 없습니다.</p>}</div>
    <div><h3>상대적으로 낮은 지표</h3>{weakest.length?<ul>{weakest.map((item,i)=><li key={item.id??item.name??i}><strong>{indicatorLabel(item,id,i)}</strong><span>저장 평가 {item.score?.toFixed(1)}점 · 관측 {dateLabel(item.observationDate??item.asOfDate)}</span></li>)}</ul>:<p>비교 가능한 저장 구성 점수가 없습니다.</p>}</div>
   </div>
   <p className="economic-reason-note">각 지표의 높고 낮음은 최종 점수에 미친 가중 기여도를 뜻하지 않습니다. 원자료의 관측일과 평가일이 다를 수 있습니다.</p>
  </section>
  <section className="inflation-explainer economic-explainer" aria-labelledby={"economic-"+id+"-intro"}>
   <p className="cnn-eyebrow">WHAT IS {id.toUpperCase()}?</p>
   <h1 id={"economic-"+id+"-intro"}>미국 {config.name} 시장점수란?</h1>
   <p>{config.description}</p>
   <div className="economic-reading-strips"><span><b>점수 읽기</b>{config.reading}</span><span><b>시장과의 관계</b>{config.impact}</span></div>
  </section>
  <section className="inflation-indicator-section inflation-r2-indicators economic-indicators" aria-labelledby={"economic-"+id+"-indicators"}>
   <header><div><p className="cnn-eyebrow">ECONOMIC INDICATORS</p><h2 id={"economic-"+id+"-indicators"}>{config.name} 구성 지표 ({id==="growth"?observations.length+"/24":observations.length}개)</h2></div><p>승인된 저장 지표만 표시합니다. 이전 원자료·공식 다음 발표일·미니차트가 없으면 <b>—</b>로 구분하며 임의로 보완하지 않습니다.{id==="growth"&&observations.length!==24?" 산출요인 24개 중 아직 공개되지 않은 항목이 있습니다.":""}</p></header>
   {error&&<p className="economic-data-notice" role="status">최근 데이터 조회가 지연되고 있습니다. 저장 자료는 갱신 확인 후 표시됩니다.</p>}
   <div className="inflation-table-wrap inflation-r2-table-wrap">
    <table className="inflation-indicator-table inflation-indicator-table-r2 economic-table">
     <colgroup>{Array.from({length:10},(_,i)=><col key={i}/>)}</colgroup>
     <thead><tr><th>☆</th><th>지표</th><th>내용</th><th>평가 기준</th><th>이전 원값</th><th>현재 원값/점수</th><th>발표</th><th>판단</th><th>미니차트(1Y)</th><th>ⓘ</th></tr></thead>
     <tbody>{observations.map((item,i)=>{
      const name=indicatorLabel(item,id,i),idKey=item.id??name,part=validScore(item.score)&&item.status==="READY"?item.score:null,j=judgement(part),mini=indicatorTrend(item);
      const present=currentPresentation(item),previous=item.status==="READY"?textValue(item.previousValue,item.unit):"—";
      return <tr key={idKey+"-"+i} data-judgement={j.tone}>
       <td><EconomicFavoriteButton domainId={id} indicatorId={idKey} label={name}/></td>
       <th scope="row"><strong>{name}</strong><small>{technicalSource(item.source)}</small></th>
       <td>{indicatorDescription(item,name)}</td>
       <td>{item.criterionLabel??item.criterion??"저장 평가점수"}</td>
       <td className="inflation-r2-value"><strong>{previous}</strong><small>{dateLabel(item.previousObservationDate)}</small></td>
       <td className="inflation-r2-value" data-value-kind={present.type}><strong>{present.value}</strong><small>{present.detail}</small></td>
       <td className="inflation-r2-release"><strong>{item.releaseCadence??"—"}</strong><small>{dateLabel(item.nextReleaseDate??item.nextRelease)}</small></td>
       <td><span className="inflation-judgement">{j.name}</span></td>
       <td className="inflation-r2-spark-cell"><InflationMiniChart label={name} points={mini}/></td>
       <td><IndicatorHelp item={item} title={name}/></td>
      </tr>;
     })}</tbody>
    </table>
   </div>
   <div className="inflation-r2-mobile-list">
    {observations.map((item,i)=>{
     const name=indicatorLabel(item,id,i),idKey=item.id??name,part=validScore(item.score)&&item.status==="READY"?item.score:null,j=judgement(part),mini=indicatorTrend(item);
     return <article className="inflation-r2-mobile-card" key={idKey+"-"+i} data-judgement={j.tone}>
      <div className="inflation-r2-mobile-head"><div className="economic-mobile-name"><EconomicFavoriteButton domainId={id} indicatorId={idKey} label={name}/><div><strong>{name}</strong><small>{technicalSource(item.source)}</small></div></div><div className="inflation-r2-mobile-actions"><span className="inflation-judgement">{j.name}</span><IndicatorHelp item={item} title={name}/></div></div>
      <p className="inflation-r2-mobile-content">{indicatorDescription(item,name)}</p>
      <p className="inflation-r2-mobile-criterion"><span>기준</span>{item.criterionLabel??item.criterion??"저장 평가점수"}</p>
      <div className="inflation-r2-mobile-spark"><span>미니차트(1Y)</span><InflationMiniChart label={name} points={mini}/></div>
      <div className="inflation-r2-mobile-metrics"><div><span>이전 원값</span><strong>{item.status==="READY"?textValue(item.previousValue,item.unit):"—"}</strong><small>{dateLabel(item.previousObservationDate)}</small></div><div><span>현재 원값/점수</span><strong>{currentPresentation(item).value}</strong><small>{currentPresentation(item).detail}</small></div><div><span>발표</span><strong>{item.releaseCadence??"—"}</strong><small>{dateLabel(item.nextReleaseDate??item.nextRelease)}</small></div></div>
     </article>;
    })}
   </div>
   {!loading&&!observations.length&&<p className="economic-data-notice">구성 지표가 아직 저장되지 않았습니다. 없는 항목을 가상의 지표로 채우지 않습니다.</p>}
  </section>
  <a className="cnn-return-cta economic-back-button" href="/">← 메인 대시보드로 돌아가기</a>
 </div>;
}
