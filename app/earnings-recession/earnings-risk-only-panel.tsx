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
import {readBeaStoredS6,type BeaIndicator} from "./earnings-bea-s6-source";
import "./earnings-indicator-r2.css";
import "./earnings-inflation-layout.css";

// The score and its four risk factors use only the eight-risk diagnostic contract.
// The BEA observation is a read-only supplemental source, never a score input.
type RiskFactor={id:string;score:number|null;status:string;observationDate?:string|null};
type RiskPoint={date:string;score:number};
type RiskPayload={
 status:string;score:number|null;asOfDate?:string|null;methodologyVersion?:string|null;
 riskFactors?:RiskFactor[];riskFactorsMethodologyVersion?:string|null;
 riskTrend?:RiskPoint[];riskHistoryKind?:string|null;
 riskFinancialPeriodEnd?:string|null;riskHistoryMode?:string|null;
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


type CostHistoryPoint={period:string;value:number|null};
type CostRow={
 indicatorId:string;value:number|null;unit:"PERCENT"|"INDEX";status:string;
 observationPeriod:string;previousPeriod:string|null;previousValue:number|null;change:number|null;
 frequency:"MONTHLY"|"QUARTERLY";history:CostHistoryPoint[];
 freshness?:{status:string;reason:string|null};seriesId:string;sourceURL:string;
};
type CostPayload={
 schemaVersion:string;status:string;historicalMode:string;rows:CostRow[];
};
type BeaUnitPoint={date:string;value:number};
type BeaUnitPayload={
 schemaVersion:string;status:string;historyMode:string;
 freshness?:{status:string;reason:string|null};
 indicator?:{
  id:string;unit:string;observationPeriodEnd:string;previousPeriodEnd:string;
  value:number;previousValue:number;change:number;history:BeaUnitPoint[];
 };
};
type BeaMfgHistoryPoint={period:string;periodEnd:string;profitsBillionsUsdAnnualRate:number};
type BeaMfgPayload={
 schemaVersion:string;status:string;historicalMode:string;
 freshness?:{status:string;reason:string|null};
 indicator?:{
  id:string;seriesId:string;source:string;unit:string;adjustment:string;
  profitsDefinition:string;value:number;observationPeriod:string;
  observationPeriodEnd:string;yearAgoPeriod:string;yearAgoPeriodEnd:string;
  currentProfitsBillionsUsdAnnualRate:number;yearAgoProfitsBillionsUsdAnnualRate:number;
  history:BeaMfgHistoryPoint[];
 };
};
const MFG_SCHEMA="earnings-bea-manufacturing-profits-r1-v1";
const MFG_SERIES="N400RC1Q027SBEA";
const COST_SCHEMA="earnings-companion-c-r4-v1";
const costIndicators=[
 {id:"bls_ppi_final_demand_yoy_sa",name:"최종수요 생산자물가 상승률",description:"최종수요 생산자물가의 전년 대비 변화",series:"WPSFD4"},
 {id:"bls_ppi_final_demand_index",name:"최종수요 생산자물가 지수",description:"최종수요 생산자물가의 지수 수준",series:"WPSFD4"},
 {id:"bls_ppi_goods_yoy_sa",name:"재화 생산자물가 상승률",description:"재화 생산자물가의 전년 대비 변화",series:"WPSFD41"},
 {id:"bls_ppi_goods_index",name:"재화 생산자물가 지수",description:"재화 생산자물가의 지수 수준",series:"WPSFD41"},
 {id:"bls_unit_labor_cost_yoy",name:"비농업 단위노동비용 증가율",description:"비농업 단위노동비용의 전년 대비 변화",series:"PRS85006111"},
] as const;
const finiteCost=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);
const costFormat=(value:number|null|undefined,unit:"PERCENT"|"INDEX")=>
 finiteCost(value)?value.toLocaleString("ko-KR",{minimumFractionDigits:2,maximumFractionDigits:2})+(unit==="PERCENT"?"%":""):"—";
const costChange=(value:number|null|undefined,unit:"PERCENT"|"INDEX")=>
 finiteCost(value)?(value>0?"+":"")+value.toFixed(2)+(unit==="PERCENT"?"%p":"p"):"—";
const costUsable=(row:CostRow|undefined)=>Boolean(row&&row.status==="READY"&&row.freshness?.status==="FRESH"&&finiteCost(row.value));
const unitUsable=(payload:BeaUnitPayload|null|undefined)=>Boolean(
 payload?.schemaVersion==="earnings-bea-unit-profit-r1-v1"&&payload.status==="READY"&&
 payload.historyMode==="CURRENT_VINTAGE_SOURCE_PERIOD_END"&&payload.freshness?.status==="FRESH"&&
 payload.indicator?.id==="bea_nonfinancial_unit_profit"&&
 payload.indicator.unit==="USD_PER_REAL_GVA_UNIT"&&
 quarterEnd(payload.indicator.observationPeriodEnd)&&quarterEnd(payload.indicator.previousPeriodEnd)&&
 finiteCost(payload.indicator.value)&&finiteCost(payload.indicator.previousValue)&&
 finiteCost(payload.indicator.change)&&Array.isArray(payload.indicator.history)&&
 payload.indicator.history.length===5&&payload.indicator.history.every(point=>
  quarterEnd(point.date)&&finiteCost(point.value))
);
const unitFormat=(value:number|null|undefined)=>finiteCost(value)?"$"+value.toFixed(3):"—";
const unitChange=(value:number|null|undefined)=>finiteCost(value)?(value>0?"+":"")+value.toFixed(3)+"달러":"—";
const mfgProfitFormat=(value:number|null|undefined)=>finiteCost(value)?
 value.toLocaleString("ko-KR",{minimumFractionDigits:2,maximumFractionDigits:2})+" 십억 달러":"—";
const mfgYoYFormat=(value:number|null|undefined)=>finiteCost(value)?
 (value>0?"+":"")+value.toFixed(2)+"%":"—";
const mfgUsable=(payload:BeaMfgPayload|null|undefined)=>Boolean(
 payload?.schemaVersion===MFG_SCHEMA&&payload.status==="READY"&&
 payload.historicalMode==="CURRENT_VINTAGE_NOT_PIT"&&payload.freshness?.status==="FRESH"&&
 payload.indicator?.id==="bea_manufacturing_corporate_profits_yoy"&&
 payload.indicator.seriesId===MFG_SERIES&&payload.indicator.unit==="PERCENT_YOY"&&
 payload.indicator.adjustment==="SAAR"&&
 payload.indicator.profitsDefinition==="WITH_INVENTORY_VALUATION_ADJUSTMENT"&&
 quarterEnd(payload.indicator.observationPeriodEnd)&&quarterEnd(payload.indicator.yearAgoPeriodEnd)&&
 finiteCost(payload.indicator.value)&&finiteCost(payload.indicator.currentProfitsBillionsUsdAnnualRate)&&
 finiteCost(payload.indicator.yearAgoProfitsBillionsUsdAnnualRate)&&
 payload.indicator.yearAgoProfitsBillionsUsdAnnualRate>0&&
 Math.abs(payload.indicator.value-(payload.indicator.currentProfitsBillionsUsdAnnualRate/payload.indicator.yearAgoProfitsBillionsUsdAnnualRate-1)*100)<1e-8&&
 Array.isArray(payload.indicator.history)&&payload.indicator.history.length===5&&
 payload.indicator.history.every(point=>quarterEnd(point.periodEnd)&&finiteCost(point.profitsBillionsUsdAnnualRate))&&
 payload.indicator.history[0].periodEnd===payload.indicator.yearAgoPeriodEnd&&
 payload.indicator.history[4].periodEnd===payload.indicator.observationPeriodEnd
);
const BEA_SOURCE="BEA NIPA A051RC";
const quarterEnd=(value:unknown):value is string=>{
 if(!validDate(value))return false;
 const date=new Date(value+"T00:00:00Z");
 return [2,5,8,11].includes(date.getUTCMonth())&&
  value===new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).toISOString().slice(0,10);
};
const beaUsable=(row:BeaIndicator|undefined)=>Boolean(
 row?.id==="S6"&&row.status==="READY"&&row.source===BEA_SOURCE&&row.unit==="%"&&
 row.historyKind==="CURRENT_VINTAGE_SOURCE_PERIOD_END"&&
 finiteCost(row.value)&&finiteCost(row.previousValue)&&
 quarterEnd(row.sourcePeriodEnd)&&quarterEnd(row.previousPeriodEnd)&&
 row.previousPeriodEnd!<row.sourcePeriodEnd&&
 Array.isArray(row.sourceHistory1Y)&&row.sourceHistory1Y.length>=2&&
 row.sourceHistory1Y.length<=8&&row.sourceHistory1Y.every((point,index,all)=>
  point&&quarterEnd(point.date)&&finiteCost(point.value)&&
  (index===0||all[index-1].date<point.date))&&
 row.sourceHistory1Y.at(-1)?.date===row.sourcePeriodEnd&&
 Math.abs(row.sourceHistory1Y.at(-1)!.value-row.value!)<1e-8
);

// Cost-series points are raw BLS observations, never inputs to the E1 risk score.
function CostSpark({history,label="저장된 비용 압력 관측치 추이. 결측 구간은 연결하지 않음"}:
 {history:Array<{value:number|null}>;label?:string}){
 const points=Array.isArray(history)?history:[];
 const valid=points.map((point,index)=>({index,value:point?.value}))
  .filter((point):point is {index:number;value:number}=>finiteCost(point.value));
 if(valid.length<2)return <span className="earnings-r2-cost-chart-empty">이력 부족</span>;
 const min=Math.min(...valid.map(point=>point.value));
 const max=Math.max(...valid.map(point=>point.value));
 const x=(index:number)=>5+index*110/Math.max(1,points.length-1);
 const y=(value:number)=>max===min?18:30-24*(value-min)/(max-min);
 let path="";let previous=-2;
 for(const point of valid){
  path+=(previous===point.index-1?" L":" M")+x(point.index).toFixed(1)+" "+y(point.value).toFixed(1);
  previous=point.index;
 }
 const latest=valid.at(-1)!;
 return <svg className="earnings-r2-cost-spark" viewBox="0 0 120 36" role="img"
  aria-label={label}>
  <path d={path.trim()} fill="none" stroke="#73c9d9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  <circle cx={x(latest.index)} cy={y(latest.value)} r="2.5" fill="#b0eef3"/>
 </svg>;
}

export default function EarningsRiskOnlyPanel(){
 const {payload,loading}=useStoredIndex<RiskPayload>("/api/earnings-recession-detail");
 const {payload:costPayload,loading:costLoading,error:costError}=
  useStoredIndex<CostPayload>("/api/earnings-recession-indicators");
  const {payload:unitPayload,loading:unitLoading,error:unitError}=
   useStoredIndex<BeaUnitPayload>("/api/earnings-recession-bea-unit-profit");
  const unitReady=unitUsable(unitPayload);
  const unitRow=unitReady?unitPayload?.indicator:null;
  const unitStatus=unitLoading?"연결 확인 중":unitReady?"연결 완료":unitError?"자료 확인 대기":"자료 확인 대기";
  const {payload:mfgPayload}=useStoredIndex<BeaMfgPayload>("/api/earnings-recession-bea-manufacturing-profit");
  const mfgReady=mfgUsable(mfgPayload);
  const mfgRow=mfgReady?mfgPayload?.indicator:null;
  const mfgHistory=mfgRow?.history.map(point=>({value:point.profitsBillionsUsdAnnualRate}))??[];
 const costValid=costPayload?.schemaVersion===COST_SCHEMA&&
  costPayload?.historicalMode==="CURRENT_RETRIEVAL_NOT_PIT"&&Array.isArray(costPayload.rows);
 const costRows=new Map<string,CostRow>(
  (costValid&&costPayload?costPayload.rows:[])
   .filter(row=>costIndicators.some(meta=>meta.id===row.indicatorId))
   .map(row=>[row.indicatorId,row])
 );
 const costReady=costIndicators.filter(meta=>costUsable(costRows.get(meta.id))).length;
 const costStatus=costLoading?"연결 확인 중":costValid?
  "원자료 "+costReady+"/"+costIndicators.length+"개 연결":
  costError?"원자료 조회 실패":"원자료 준비 중";
 // Reuse the already-stored BEA S6 source history. Its symmetric YoY
 // change is not conventional YoY growth and never enters the risk score.
 const beaIndicator=readBeaStoredS6(payload);
 const beaReady=beaUsable(beaIndicator);
 const beaDelta=beaReady?beaIndicator!.value!-beaIndicator!.previousValue!:null;
 const beaHistory=beaReady?beaIndicator!.sourceHistory1Y??[]:[];
 const beaNext=beaReady&&validDate(beaIndicator?.nextReleaseDate)?beaIndicator!.nextReleaseDate:null;
 const score=payload?.status==="READY"&&validScore(payload?.score)?payload.score:null;
 const allowedFactors=payload?.riskFactorsMethodologyVersion===payload?.methodologyVersion&&score!==null;
 const factors=new Map((allowedFactors&&Array.isArray(payload?.riskFactors)?payload.riskFactors:[])
   .filter(x=>ids.includes(x?.id as typeof ids[number])&&x?.status==="READY"&&validScore(x?.score))
   .map(x=>[x.id,x]));
 const fiscalReconstruction=payload?.riskHistoryKind==="E1_R4_STORED_PERIOD_CURRENT_VINTAGE_NOT_PIT"&&
   payload?.riskHistoryMode==="CURRENT_VINTAGE_NOT_PIT"&&validDate(payload?.riskFinancialPeriodEnd);
 const trend=useMemo(()=>{
  if(!fiscalReconstruction&&payload?.riskHistoryKind!==EARNINGS_RISK_HISTORY_KIND)return [];
  if(score===null||!validDate(payload?.asOfDate))return [];
  const rows=(Array.isArray(payload?.riskTrend)?payload.riskTrend:[]).filter(x=>validDate(x?.date)&&validScore(x?.score))
    .sort((a,b)=>a.date.localeCompare(b.date));
  const last=rows.at(-1);
  const ending=fiscalReconstruction?payload.riskFinancialPeriodEnd:payload.asOfDate;
  if(!last||last.date!==ending||Math.abs(last.score-score)>1e-8)return [];
  if(!fiscalReconstruction)return rows.map(x=>({date:x.date,score:x.score} satisfies MarketFearGreedChartPoint));
  // The mature fiscal quarter anchors the displayed year. Null quarters are
  // slots, not synthetic estimates, and must never enter a published score.
  const end=new Date(ending+"T00:00:00Z");
  if(![2,5,8,11].includes(end.getUTCMonth()))return [];
  const present=new Map(rows.map(row=>[row.date,row.score]));
  return Array.from({length:5},(_,index)=>{
   const date=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1-3*(4-index),0)).toISOString().slice(0,10);
   return {date,score:present.get(date)??null} satisfies MarketFearGreedChartPoint;
  });
 },[payload,score,fiscalReconstruction]);
 const gapGuides=useMemo(()=>{
  if(!fiscalReconstruction)return [];
  const guides:Array<{from:MarketFearGreedChartValidPoint;to:MarketFearGreedChartValidPoint}>=[];
  for(let i=1;i<trend.length-1;i++){
   if(trend[i].score!==null)continue;
   const left=trend[i-1];let rightIndex=i+1;
   while(rightIndex<trend.length&&trend[rightIndex].score===null)rightIndex++;
   const right=trend[rightIndex];
   if(left&&right&&validScore(left.score)&&validScore(right.score)){
    guides.push({from:{date:left.date,score:left.score},to:{date:right.date,score:right.score}});
   }
   i=rightIndex;
  }
  return guides;
 },[trend,fiscalReconstruction]);
 const deltas=useMemo(()=>fiscalReconstruction
  ?{week:null,month:null,threeMonth:null,sixMonth:null,year:null}
  :liquidityStoredScoreComparisons(
    trend.map(x=>({label:x.date,value:x.score})),payload?.asOfDate??"",score
  ),[trend,payload?.asOfDate,score,fiscalReconstruction]);
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
     <span className="earnings-r2-chart-identity">{fiscalReconstruction?"실적 침체 방어 · 최신 유효 결산 분기 기준 1년 (사후 재구성)":"실적 침체 방어 진단 추이"}{gapGuides.length>0?" · 점선은 결측 연결":""}</span>
     <div className="fg-renderer"><MarketFearGreedChart data={trend} gapGuides={gapGuides} axisTicks={axisTicks} axisLabels={axisLabels}
       latestPoint={latestPoint} showExtrema={trend.length>=3} instanceKey="earnings-risk-diagnostic"
       gradientId="earnings-risk-only-fill" color={tone(score)} formatTooltipLabel={dateLabel}
       emptyLabel={loading?"확인 중":"저장된 동일 산식의 과거 점수 미확보"}/></div>
    </div></MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>실적 침체 진단</span><strong>{score===null?"점수 —":score.toFixed(1)+"점"} · {fiscalReconstruction
 ?`저장 분기 ${trend.filter(point=>validScore(point.score)).length}개 · 사후 재구성(PIT 아님)`
 :trend.length>=2?"검증된 위험 진단 이력":"동일 산식 이력 확인 필요"}</strong></div></div>
  </section>
  <section className="inflation-explainer" aria-labelledby="earnings-risk-explanation">
   <p className="cnn-eyebrow">WHAT IS AN EARNINGS RECESSION?</p>
   <h1 id="earnings-risk-explanation">실적 침체란?</h1>
   <p>미국 기업의 EPS·매출·영업이익률·이익 개선 기업의 확산 정도를 통해 실적 침체에 대한 방어력을 평가합니다. 점수가 높을수록 방어력이 양호하며, 침체 발생 확률은 아닙니다.</p>
   <div className="inflation-direction-strip"><span><b>침체 방향</b>기업 이익·매출·수익성·개선 폭 약화</span><span><b>안정 방향</b>이익·매출 증가 · 수익성 유지 · 개선 확산</span></div>
  </section>
  <section className="inflation-indicator-section earnings-r2-indicators" aria-labelledby="earnings-risk-factor-title">
   <header><div><p className="cnn-eyebrow">EARNINGS RECESSION RISK FACTORS</p>
    <h2 id="earnings-risk-factor-title">실적 침체 분석 지표</h2></div>
     <p>기존 4개는 실적 침체 방어 진단 점수, 추가 5개는 BLS 비용 압력 원자료, {mfgReady?"3개":"2개"}는 BEA 기업이익 원자료입니다. 추가 원자료는 진단 점수에 합산하지 않습니다. <span className="earnings-r2-cost-status" role="status">{costStatus} · BEA 기업이익 {beaReady?"연결 완료":"자료 확인 대기"} · BEA 단위이익 {unitStatus}</span></p>
   </header>
   <div className="inflation-table-wrap earnings-r2-table-wrap"><table className="inflation-indicator-table earnings-r2-table">
    <colgroup><col className="earnings-col-favorite"/><col className="earnings-col-name"/><col className="earnings-col-content"/><col className="earnings-col-criterion"/><col className="earnings-col-prior"/><col className="earnings-col-current"/><col className="earnings-col-release"/><col className="earnings-col-judgement"/><col className="earnings-col-spark"/><col className="earnings-col-help"/></colgroup>
    <thead><tr><th><EarningsFavoriteHeaderIcon/><span className="sr-only">즐겨찾기</span></th><th>지표</th><th>내용</th><th>기준</th><th>이전</th><th>현재</th><th>발표</th><th>판단</th><th>미니차트(1Y)</th><th>ⓘ</th></tr></thead>
    <tbody>{ids.map(id=>{const factor=factors.get(id),meta=labels[id],value=factor?.score??null;return <tr key={id}>
     <td><EarningsFavoriteButton id={id} label={meta.name}/></td><th scope="row">{meta.name}</th>
     <td>{meta.description}</td><td>{meta.direction}</td><td>—</td>
     <td>{validScore(value)?value.toFixed(1)+"점":"—"}<small>결산 {dateLabel(factor?.observationDate)}</small></td>
     <td>—</td><td>{value===null?"확인 대기":value>=60?"긍정":value>=45?"중립":"부정"}</td><td>—</td>
     <td><ContentHelp label={meta.name+" 도움말"}><p>{meta.description}. 해당 지표의 원자료와 진단 점수는 구분합니다. 현재 입력은 기존 E1-R4 호환 점수이며 개별 관측일이 확인되지 않은 항목은 —로 표시합니다.</p></ContentHelp></td>
    </tr>})}
    {costIndicators.map(meta=>{const row=costRows.get(meta.id),ok=costUsable(row);return <tr key={meta.id} className="earnings-r2-cost-row">
     <td><EarningsFavoriteButton id={meta.id} label={meta.name}/></td>
     <th scope="row">{meta.name}</th>
     <td>{meta.description}</td>
     <td>비용 압력 참고<small>점수 미반영</small></td>
     <td className="earnings-r2-prior">{ok&&row?costFormat(row.previousValue,row.unit):"—"}</td>
     <td className="earnings-r2-value"><strong>{ok&&row?costFormat(row.value,row.unit):"—"}</strong>
      <small>변동 {ok&&row?costChange(row.change,row.unit):"—"}</small></td>
     <td className="earnings-r2-release"><strong>—</strong>
      <small>관측 {row?.observationPeriod??"—"}</small></td>
     <td>{ok?"참고":row?.status==="STALE"?"갱신 지연":"확인 대기"}</td>
     <td className="earnings-r2-spark">{ok&&row?<CostSpark history={row.history}/>:"—"}</td>
     <td><ContentHelp label={meta.name+" 도움말"}><p>{meta.description}. BLS 관측값이며 실적 침체 방어 점수에는 합산하지 않습니다. 수집 시점 기준 자료로, 발표일이 확인되지 않으면 —로 표시합니다.</p>
      <a href={"https://data.bls.gov/timeseries/"+meta.series} target="_blank" rel="noopener noreferrer">BLS 원자료</a></ContentHelp></td>
    </tr>})}
    <tr className="earnings-r2-cost-row" data-source="bea-s6">
     <td><EarningsFavoriteButton id="bea_corporate_profits_symmetric_yoy" label="미국 전체 기업이익 변화율"/></td>
     <th scope="row">미국 전체 기업이익 변화율</th>
     <td>미국 전체 기업이익의 전년 동기 대비 대칭 변화율</td>
     <td>BEA 기업이익 참고<small>점수 미반영</small></td>
     <td className="earnings-r2-prior">{beaReady?costFormat(beaIndicator?.previousValue,"PERCENT"):"—"}</td>
     <td className="earnings-r2-value"><strong>{beaReady?costFormat(beaIndicator?.value,"PERCENT"):"—"}</strong>
      <small>직전 분기 대비 {beaReady?costChange(beaDelta,"PERCENT"):"—"}</small></td>
     <td className="earnings-r2-release"><strong>{beaNext?"분기":"—"}</strong>
      <small>{beaNext?"다음 "+beaNext:"관측 "+(beaIndicator?.sourcePeriodEnd??"—")}</small></td>
     <td>{beaReady?"참고":"확인 대기"}</td>
     <td className="earnings-r2-spark">{beaReady?<CostSpark history={beaHistory} label="BEA 기업이익의 저장된 분기별 대칭 변화율 추이"/>:"—"}</td>
     <td><ContentHelp label="미국 전체 기업이익 변화율 도움말">
      <p>BEA의 재고평가·자본소모 조정 후 기업이익을 전년 동기와 비교한 대칭 변화율입니다. 일반적인 전년 대비 성장률과 계산 방식이 다릅니다. 직전 분기 대비 변동은 두 대칭 변화율의 차이(%p)입니다.</p>
      <p>저장 당시 자료의 분기 관측값이며 발표 당시 확정 자료(PIT)는 아닙니다. 실적 침체 방어 진단 점수에는 합산하지 않습니다.</p>
      <a href="https://www.bea.gov/data/income-saving/corporate-profits" target="_blank" rel="noopener noreferrer">BEA 원자료</a>
     </ContentHelp></td>
     </tr>
     <tr className="earnings-r2-cost-row" data-source="bea-unit-profit">
      <td><EarningsFavoriteButton id="bea_nonfinancial_unit_profit" label="비금융기업 단위이익"/></td>
      <th scope="row">비금융기업 단위이익</th>
      <td>미국 비금융기업의 실질 부가가치 한 단위당 이익</td>
      <td>BEA 수익성 참고<small>점수 미반영</small></td>
      <td className="earnings-r2-prior">{unitReady?unitFormat(unitRow?.previousValue):"—"}</td>
      <td className="earnings-r2-value"><strong>{unitReady?unitFormat(unitRow?.value):"—"}</strong>
       <small>직전 분기 대비 {unitReady?unitChange(unitRow?.change):"—"}</small></td>
      <td className="earnings-r2-release"><strong>{unitReady?"분기":"—"}</strong>
       <small>관측 {unitReady?unitRow?.observationPeriodEnd:"—"}</small></td>
      <td>{unitReady?"참고":"확인 대기"}</td>
      <td className="earnings-r2-spark">{unitReady&&unitRow?<CostSpark history={unitRow.history} label="BEA 비금융기업 단위이익의 최근 5개 분기 관측 추이"/>:"—"}</td>
      <td><ContentHelp label="비금융기업 단위이익 도움말">
       <p>BEA NIPA 표 1.15의 비금융기업 단위이익(A463RD)입니다. 실질 총부가가치 한 단위당 이익을 달러로 표시합니다. 이익률(%)이나 전년 대비 성장률이 아닙니다.</p>
       <p>최근 저장한 원자료의 개정분을 보여주며 발표 당시 확정 자료(PIT)는 아닙니다. 실적 침체 방어 점수에도 합산하지 않습니다.</p>
       <a href="https://fred.stlouisfed.org/series/A463RD3Q052SBEA" target="_blank" rel="noopener noreferrer">BEA·FRED 원자료</a>
      </ContentHelp></td>
     </tr>
     {mfgReady&&mfgRow&&<tr className="earnings-r2-cost-row" data-source="bea-manufacturing-profit">
      <td><EarningsFavoriteButton id="bea_manufacturing_corporate_profits_yoy" label="미국 제조업 기업이익 증가율"/></td>
      <th scope="row">미국 제조업 기업이익 증가율</th>
      <td>미국 제조업(국내 비금융)의 재고평가 조정 기업이익 전년 대비 증가율</td>
      <td>BEA 제조업 참고<small>점수 미반영</small></td>
      <td className="earnings-r2-prior">{mfgProfitFormat(mfgRow.yearAgoProfitsBillionsUsdAnnualRate)}</td>
      <td className="earnings-r2-value"><strong>{mfgProfitFormat(mfgRow.currentProfitsBillionsUsdAnnualRate)}</strong>
       <small>전년 동기 대비 {mfgYoYFormat(mfgRow.value)}</small></td>
      <td className="earnings-r2-release"><strong>분기</strong>
       <small>관측 {mfgRow.observationPeriodEnd}</small></td>
      <td>참고</td>
      <td className="earnings-r2-spark"><CostSpark history={mfgHistory} label="BEA 제조업 기업이익 최근 5개 분기 금액 추이"/></td>
      <td><ContentHelp label="미국 제조업 기업이익 증가율 도움말">
       <p>BEA NIPA 표 6.16D의 미국 국내 비금융 제조업 기업이익(N400RC)입니다. 재고평가 조정이 적용된 분기 자료의 계절조정 연율(SAAR), 단위는 십억 달러입니다.</p>
       <p>전년 동기 대비 일반 증가율이며 대칭 변화율·영업이익률이 아닙니다. 현행 개정자료(발표 당시 확정 빈티지 아님)이고 실적 침체 진단 점수에는 반영하지 않습니다.</p>
       <a href="https://fred.stlouisfed.org/series/N400RC1Q027SBEA" target="_blank" rel="noopener noreferrer">BEA·FRED 원자료</a>
      </ContentHelp></td>
     </tr>}</tbody>
   </table></div>
   <div className="earnings-r2-mobile-list">{ids.map(id=>{const factor=factors.get(id),meta=labels[id],value=factor?.score??null;return <article className="earnings-r2-mobile-card" key={id}>
     <div className="earnings-r2-mobile-head"><div className="earnings-r2-mobile-title"><EarningsFavoriteButton id={id} label={meta.name}/><div><strong>{meta.name}</strong><small>진단 구성지표</small></div></div></div>
     <p className="earnings-r2-mobile-content">{meta.description}</p>
     <div className="earnings-r2-mobile-metrics"><div><span>이전</span><strong>—</strong></div><div><span>현재 점수</span><strong>{validScore(value)?value.toFixed(1)+"점":"—"}</strong></div><div><span>결산 분기</span><strong>{dateLabel(factor?.observationDate)}</strong></div></div>
    </article>})}
    {costIndicators.map(meta=>{const row=costRows.get(meta.id),ok=costUsable(row);return <article className="earnings-r2-mobile-card earnings-r2-cost-mobile-card" key={meta.id}>
     <div className="earnings-r2-mobile-head"><div className="earnings-r2-mobile-title">
      <EarningsFavoriteButton id={meta.id} label={meta.name}/><div>
       <strong>{meta.name}</strong><small>비용 압력 참고 · 점수 미반영</small>
      </div></div><ContentHelp label={meta.name+" 도움말"}><p>{meta.description}. BLS 관측값으로 실적 침체 방어 점수에 합산하지 않습니다.</p>
       <a href={"https://data.bls.gov/timeseries/"+meta.series} target="_blank" rel="noopener noreferrer">BLS 원자료</a>
      </ContentHelp></div>
     <p className="earnings-r2-mobile-content">{meta.description}</p>
     <div className="earnings-r2-mobile-metrics">
      <div><span>이전</span><strong>{ok&&row?costFormat(row.previousValue,row.unit):"—"}</strong></div>
      <div><span>현재</span><strong>{ok&&row?costFormat(row.value,row.unit):"—"}</strong>
       <small>변동 {ok&&row?costChange(row.change,row.unit):"—"}</small></div>
      <div><span>관측 기간</span><strong>{row?.observationPeriod??"—"}</strong>
       <small>{row?.frequency==="MONTHLY"?"월간":row?.frequency==="QUARTERLY"?"분기":""}</small></div>
     </div>
     <div className="earnings-r2-mobile-spark">
      <span>최근 이력</span>{ok&&row?<CostSpark history={row.history}/>:<span className="earnings-r2-cost-chart-empty">이력 확인 필요</span>}
     </div>
    </article>})}
    <article className="earnings-r2-mobile-card earnings-r2-cost-mobile-card" data-source="bea-s6">
     <div className="earnings-r2-mobile-head"><div className="earnings-r2-mobile-title">
      <EarningsFavoriteButton id="bea_corporate_profits_symmetric_yoy" label="미국 전체 기업이익 변화율"/><div>
       <strong>미국 전체 기업이익 변화율</strong><small>BEA · 대칭 변화율 · 점수 미반영</small>
      </div></div><ContentHelp label="미국 전체 기업이익 변화율 도움말">
       <p>BEA 기업이익의 전년 동기 대비 대칭 변화율입니다. 일반 전년비 성장률과 계산식이 다르며 진단 점수에는 포함하지 않습니다. 직전 분기와의 차이는 %p로 표시합니다.</p>
       <a href="https://www.bea.gov/data/income-saving/corporate-profits" target="_blank" rel="noopener noreferrer">BEA 원자료</a>
      </ContentHelp></div>
     <p className="earnings-r2-mobile-content">미국 전체 기업이익의 전년 동기 대비 변화</p>
     <div className="earnings-r2-mobile-metrics">
      <div><span>이전 분기</span><strong>{beaReady?costFormat(beaIndicator?.previousValue,"PERCENT"):"—"}</strong></div>
      <div><span>현재</span><strong>{beaReady?costFormat(beaIndicator?.value,"PERCENT"):"—"}</strong>
       <small>변동 {beaReady?costChange(beaDelta,"PERCENT"):"—"}</small></div>
      <div><span>관측 분기</span><strong>{beaReady?beaIndicator?.sourcePeriodEnd:"—"}</strong>
       <small>{beaNext?"다음 발표 "+beaNext:"분기 원자료"}</small></div>
     </div>
     <div className="earnings-r2-mobile-spark">
      <span>최근 이력</span>{beaReady?<CostSpark history={beaHistory} label="BEA 기업이익의 저장된 분기별 대칭 변화율 추이"/>:<span className="earnings-r2-cost-chart-empty">이력 확인 필요</span>}
     </div>
     </article>
     <article className="earnings-r2-mobile-card earnings-r2-cost-mobile-card" data-source="bea-unit-profit">
      <div className="earnings-r2-mobile-head"><div className="earnings-r2-mobile-title">
       <EarningsFavoriteButton id="bea_nonfinancial_unit_profit" label="비금융기업 단위이익"/><div>
        <strong>비금융기업 단위이익</strong><small>BEA · 실질 부가가치 한 단위당 달러 · 점수 미반영</small>
       </div></div><ContentHelp label="비금융기업 단위이익 도움말">
        <p>실질 부가가치 한 단위당 비금융기업 이익입니다. 비율(%) 또는 기업의 통상적인 이익률이 아니며 진단 점수에 포함하지 않습니다. 저장 당시 개정분입니다.</p>
        <a href="https://fred.stlouisfed.org/series/A463RD3Q052SBEA" target="_blank" rel="noopener noreferrer">BEA·FRED 원자료</a>
       </ContentHelp></div>
      <p className="earnings-r2-mobile-content">미국 비금융기업의 실질 부가가치 한 단위당 이익</p>
      <div className="earnings-r2-mobile-metrics">
       <div><span>이전 분기</span><strong>{unitReady?unitFormat(unitRow?.previousValue):"—"}</strong></div>
       <div><span>현재</span><strong>{unitReady?unitFormat(unitRow?.value):"—"}</strong>
        <small>변동 {unitReady?unitChange(unitRow?.change):"—"}</small></div>
       <div><span>관측 분기</span><strong>{unitReady?unitRow?.observationPeriodEnd:"—"}</strong>
        <small>{unitReady?"분기 원자료":"자료 확인 대기"}</small></div>
      </div>
      <div className="earnings-r2-mobile-spark">
       <span>최근 이력</span>{unitReady&&unitRow?<CostSpark history={unitRow.history} label="BEA 비금융기업 단위이익 최근 5개 분기 추이"/>:<span className="earnings-r2-cost-chart-empty">이력 확인 필요</span>}
      </div>
     </article>
     {mfgReady&&mfgRow&&<article className="earnings-r2-mobile-card earnings-r2-cost-mobile-card" data-source="bea-manufacturing-profit">
      <div className="earnings-r2-mobile-head"><div className="earnings-r2-mobile-title">
       <EarningsFavoriteButton id="bea_manufacturing_corporate_profits_yoy" label="미국 제조업 기업이익 증가율"/><div>
        <strong>미국 제조업 기업이익 증가율</strong><small>BEA · 전년비 · 점수 미반영</small>
       </div></div><ContentHelp label="미국 제조업 기업이익 증가율 도움말">
        <p>재고평가 조정된 미국 국내 비금융 제조업 기업이익의 일반 전년비 증가율입니다. 금액은 십억 달러, 계절조정 연율(SAAR)입니다. 현행 개정자료이며 진단 점수에 합산하지 않습니다.</p>
        <a href="https://fred.stlouisfed.org/series/N400RC1Q027SBEA" target="_blank" rel="noopener noreferrer">BEA·FRED 원자료</a>
       </ContentHelp></div>
      <p className="earnings-r2-mobile-content">미국 제조업의 전년 같은 분기 대비 기업이익 증가율</p>
      <div className="earnings-r2-mobile-metrics">
       <div><span>전년 동기</span><strong>{mfgProfitFormat(mfgRow.yearAgoProfitsBillionsUsdAnnualRate)}</strong></div>
       <div><span>현재</span><strong>{mfgProfitFormat(mfgRow.currentProfitsBillionsUsdAnnualRate)}</strong>
        <small>전년비 {mfgYoYFormat(mfgRow.value)}</small></div>
       <div><span>관측 분기</span><strong>{mfgRow.observationPeriodEnd}</strong><small>분기 · SAAR</small></div>
      </div>
      <div className="earnings-r2-mobile-spark">
       <span>최근 이력</span><CostSpark history={mfgHistory} label="BEA 제조업 기업이익 최근 5개 분기 금액 추이"/>
      </div>
     </article>}</div>
    <p className="earnings-r2-cost-footnote">BLS 저장 관측값은 수집 당시의 자료로, 잠정 추정치나 위험 점수가 아닙니다. 같은 시계열의 상승률과 지수를 각각 표시한 항목은 별도의 독립 근거로 계산하지 않습니다. BEA 기업이익 변화율은 일반 전년비 성장률과 다른 대칭 변화율이며, BEA 비금융기업 단위이익은 달러/실질 부가가치 단위로 표시합니다. 모두 저장 당시 개정분이며 진단 점수에는 반영하지 않습니다. {mfgReady?"제조업 기업이익은 재고평가 조정분의 일반 전년비 증가율이며, 금액은 십억 달러·계절조정 연율(SAAR)입니다.":""}</p>
  </section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
