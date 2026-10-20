"use client";
import {useMemo} from "react";
import {useStoredIndex} from "../../components/use-stored-index";
import {liquidityStoredScoreComparisons} from "../../worker/projection-builders/liquidity-stored-history.mjs";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";
import {ContentHelp} from "../content-help";
import {EarningsFavoriteButton,EarningsFavoriteHeaderIcon} from "./earnings-favorite-button";
import {EARNINGS_RISK_HISTORY_KIND} from "../../lib/market-score/earnings-recession-history-r1.mjs";
import "./earnings-indicator-r2.css";
import "./earnings-inflation-layout.css";

// This component must only use the eight-risk diagnostic contract.
// The separate economic-domain data is intentionally not a prop or input.
type RiskFactor={id:string;score:number|null;status:string;observationDate?:string|null};
type RiskPoint={date:string;score:number};
type RiskPayload={
 status:string;score:number|null;asOfDate?:string|null;methodologyVersion?:string|null;
 riskFactors?:RiskFactor[];riskFactorsMethodologyVersion?:string|null;
 riskTrend?:RiskPoint[];riskHistoryKind?:string|null;
};
const ids=["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"] as const;
const labels:Record<string,{name:string;description:string;direction:string}>={
 epsGrowth:{name:"EPS 성장률",description:"기업의 주당이익 성장 강도",direction:"높을수록 방어력 양호"},
 margin:{name:"영업이익률",description:"기업의 영업 수익성",direction:"높을수록 방어력 양호"},
 revenueGrowth:{name:"매출 성장률",description:"매출 확대와 수요의 강도",direction:"높을수록 방어력 양호"},
 earningsGrowthBreadth:{name:"이익 성장 기업 비율",description:"이익 개선이 여러 기업으로 확산되는 정도",direction:"높을수록 방어력 양호"},
};
const validScore=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=(value:unknown):value is string=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+"T00:00:00Z"));
const dateLabel=(value:unknown)=>validDate(value)?value.replaceAll("-",". ")+".":"—";
const stage=(score:number|null)=>score===null?"데이터 준비 중":score>=75?"매우 양호":score>=60?"양호":score>=45?"중립":score>=25?"실적 주의":"실적 침체 위험";
const tone=(score:number|null)=>score===null?"#94a3b8":score>=60?"#45d99f":score>=45?"#94a3b8":"#ff7076";

export default function EarningsRiskOnlyPanel(){
 const {payload,loading}=useStoredIndex<RiskPayload>("/api/earnings-recession-detail");
 const score=payload?.status==="READY"&&validScore(payload?.score)?payload.score:null;
 const allowedFactors=payload?.riskFactorsMethodologyVersion===payload?.methodologyVersion&&score!==null;
 const factors=new Map((allowedFactors&&Array.isArray(payload?.riskFactors)?payload.riskFactors:[])
   .filter(x=>ids.includes(x?.id as typeof ids[number])&&x?.status==="READY"&&validScore(x?.score))
   .map(x=>[x.id,x]));
 const trend=useMemo(()=>{
  if(payload?.riskHistoryKind!==EARNINGS_RISK_HISTORY_KIND||score===null||!validDate(payload?.asOfDate))return [];
  const rows=(Array.isArray(payload?.riskTrend)?payload.riskTrend:[]).filter(x=>validDate(x?.date)&&validScore(x?.score))
    .sort((a,b)=>a.date.localeCompare(b.date));
  const last=rows.at(-1);
  if(!last||last.date!==payload.asOfDate||Math.abs(last.score-score)>1e-8)return [];
  return rows.map(x=>({date:x.date,score:x.score} satisfies MarketFearGreedChartPoint));
 },[payload,score]);
 const deltas=useMemo(()=>liquidityStoredScoreComparisons(
  trend.map(x=>({label:x.date,value:x.score})),payload?.asOfDate??"",score
 ),[trend,payload?.asOfDate,score]);
 const comparisons=[{label:"1주",value:deltas.week??null},{label:"1개월",value:deltas.month??null},
  {label:"3개월",value:deltas.threeMonth??null},{label:"6개월",value:deltas.sixMonth??null},{label:"1년",value:deltas.year??null}];
 const last=trend.at(-1);
 const latestPoint:MarketFearGreedChartValidPoint|null=last&&validScore(last.score)?{date:last.date,score:last.score}:null;
 const axisTicks=[...new Map(trend.map(x=>[x.date.slice(0,7),x.date])).values()];
 const axisLabels=new Map(trend.map(x=>[x.date,x.date.slice(2,7).replace("-","/")]));
 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell earnings-recession-target-card"
    data-testid="earnings-risk-only-hero" data-score-tone={score===null?"neutral":score>=60?"positive":score>=45?"neutral":"negative"}
    data-market-state={loading?"loading":score===null?"unavailable":"ready"} aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI EARNINGS RECESSION" title="미국 실적 침체" description="실적 침체 위험 방어 진단" dateLabel="진단 평가일" date={dateLabel(payload?.asOfDate)} source=""/></div>
   <div className="fg-content-slot">
    <div className="fg-score-slot"><MarketScoreOrb score={loading||score===null?"—":score.toFixed(1)} state={loading?"확인 중":stage(score)} variant="hero" comparisonItems={comparisons} comparisonAriaLabel="실적 침체 방어 진단 검증된 이력 기준 기간별 비교"/></div>
    <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot">
     <span className="earnings-r2-chart-identity">실적 침체 방어 진단 추이</span>
     <div className="fg-renderer"><MarketFearGreedChart data={trend} axisTicks={axisTicks} axisLabels={axisLabels}
       latestPoint={latestPoint} showExtrema={trend.length>=3} instanceKey="earnings-risk-diagnostic"
       gradientId="earnings-risk-only-fill" color={tone(score)} formatTooltipLabel={dateLabel}
       emptyLabel={loading?"확인 중":"동일 산식의 검증된 과거 진단 이력 없음"}/></div>
    </div></MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>실적 침체 진단</span><strong>{score===null?"점수 —":score.toFixed(1)+"점"} · {trend.length>=2?"검증된 위험 진단 이력":"동일 산식 이력 확인 필요"}</strong></div></div>
  </section>
  <section className="inflation-explainer" aria-labelledby="earnings-risk-explanation">
   <p className="cnn-eyebrow">WHAT IS AN EARNINGS RECESSION?</p>
   <h1 id="earnings-risk-explanation">실적 침체란?</h1>
   <p>미국 기업의 EPS·매출·영업이익률·이익 개선 기업의 확산 정도를 통해 실적 침체에 대한 방어력을 평가합니다. 점수가 높을수록 방어력이 양호하며, 침체 발생 확률은 아닙니다.</p>
   <div className="inflation-direction-strip"><span><b>침체 방향</b>기업 이익·매출·수익성·개선 폭 약화</span><span><b>안정 방향</b>이익·매출 증가 · 수익성 유지 · 개선 확산</span></div>
  </section>
  <section className="inflation-indicator-section earnings-r2-indicators" aria-labelledby="earnings-risk-factor-title">
   <header><div><p className="cnn-eyebrow">EARNINGS RECESSION RISK FACTORS</p>
    <h2 id="earnings-risk-factor-title">실적 침체 진단 구성지표 (4개)</h2></div>
    <p>8대 위험 지표 전용 진단 구성요소입니다. 확인되지 않은 값과 과거 비교는 —로 표시합니다.</p>
   </header>
   <div className="inflation-table-wrap earnings-r2-table-wrap"><table className="inflation-indicator-table earnings-r2-table">
    <colgroup><col className="earnings-col-favorite"/><col className="earnings-col-name"/><col className="earnings-col-content"/><col className="earnings-col-criterion"/><col className="earnings-col-prior"/><col className="earnings-col-current"/><col className="earnings-col-release"/><col className="earnings-col-judgement"/><col className="earnings-col-spark"/><col className="earnings-col-help"/></colgroup>
    <thead><tr><th><EarningsFavoriteHeaderIcon/><span className="sr-only">즐겨찾기</span></th><th>지표</th><th>내용</th><th>기준</th><th>이전</th><th>현재</th><th>발표</th><th>판단</th><th>미니차트(1Y)</th><th>ⓘ</th></tr></thead>
    <tbody>{ids.map(id=>{const factor=factors.get(id),meta=labels[id],value=factor?.score??null;return <tr key={id}>
     <td><EarningsFavoriteButton id={id} label={meta.name}/></td><th scope="row">{meta.name}</th>
     <td>{meta.description}</td><td>{meta.direction}</td><td>—</td>
     <td>{validScore(value)?value.toFixed(1)+"점":"—"}<small>평가 {dateLabel(factor?.observationDate)}</small></td>
     <td>—</td><td>{value===null?"확인 대기":value>=60?"긍정":value>=45?"중립":"부정"}</td><td>—</td>
     <td><ContentHelp label={meta.name+" 도움말"}><p>{meta.description}. 해당 지표의 원자료와 진단 점수는 구분합니다. 현재 입력은 기존 E1-R4 호환 점수이며 개별 관측일이 확인되지 않은 항목은 —로 표시합니다.</p></ContentHelp></td>
    </tr>})}</tbody>
   </table></div>
   <div className="earnings-r2-mobile-list">{ids.map(id=>{const factor=factors.get(id),meta=labels[id],value=factor?.score??null;return <article className="earnings-r2-mobile-card" key={id}>
     <div className="earnings-r2-mobile-head"><div className="earnings-r2-mobile-title"><EarningsFavoriteButton id={id} label={meta.name}/><div><strong>{meta.name}</strong><small>진단 구성지표</small></div></div></div>
     <p className="earnings-r2-mobile-content">{meta.description}</p>
     <div className="earnings-r2-mobile-metrics"><div><span>이전</span><strong>—</strong></div><div><span>현재 점수</span><strong>{validScore(value)?value.toFixed(1)+"점":"—"}</strong></div><div><span>평가 기준일</span><strong>{dateLabel(factor?.observationDate)}</strong></div></div>
    </article>})}</div>
  </section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
