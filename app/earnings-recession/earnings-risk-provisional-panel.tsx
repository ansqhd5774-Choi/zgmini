"use client";
import {useStoredIndex} from "../../components/use-stored-index";
import {MarketFearGreedChart,type MarketFearGreedChartPoint} from "../market-fear-greed-chart";

type Metric="epsGrowth"|"revenueGrowth"|"operatingMargin"|"earningsGrowthBreadth";
type Observation={
 observedAt:string;score:number;filingDate:string;
 observed:Record<Metric,number>;coverage:Record<Metric,number>;
 factorScores?:{eps:number;margin:number;revenue:number;epsBreadth:number};
};
type Provisional={
 status:string;phase:string;score:number;quarterEnd:string;universeCount:number;
 observedAt:string;sourceStoredAt:string;history:Observation[];
};
const score=(x:unknown):x is number=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=100;
const time=(value:string)=>new Date(value).toLocaleString("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
const ratio=(n:number)=>Number.isFinite(n)?(n*100).toFixed(1)+"%":"—";
const titles:{key:keyof NonNullable<Observation["factorScores"]>;name:string}[]=[
 {key:"eps",name:"EPS 성장"},{key:"margin",name:"영업이익률"},
 {key:"revenue",name:"매출 성장"},{key:"epsBreadth",name:"이익 개선 폭"}
];
export default function EarningsRiskProvisionalPanel(){
 const {payload}=useStoredIndex<Provisional>("/api/earnings-risk-provisional");
 if(payload?.status!=="READY"||payload.phase!=="PROVISIONAL"||!score(payload.score)||!Array.isArray(payload.history))return null;
 const points:MarketFearGreedChartPoint[]=payload.history
  .filter(p=>typeof p.observedAt==="string"&&score(p.score))
  .map(p=>({date:p.observedAt,score:p.score}));
 const recent=payload.history.at(-1);
 if(!recent||points.length!==payload.history.length||recent.observedAt!==payload.observedAt||
  recent.score!==payload.score||!recent.observed||!recent.coverage)return null;
 const step=Math.max(1,Math.ceil(points.length/5));
 const ticks=points.filter((_,i)=>i%step===0||i===points.length-1).map(p=>p.date);
 const labels=new Map(ticks.map(t=>[t,time(t)]));
 const latest=points.at(-1);
 return <section className="earnings-risk-provisional" aria-label="현재 분기 실적 잠정 점수 추적"
  data-testid="earnings-risk-provisional">
  <div className="earnings-risk-provisional-top">
   <div><h2>현재 분기 실적 발표 추적</h2>
    <p>결산 {payload.quarterEnd} ·  공시 반영 시각 {time(recent.observedAt)} KST</p></div>
   <strong>{payload.score.toFixed(1)}<small>점 · 잠정</small></strong>
  </div>
  <div className="earnings-risk-provisional-coverage">
   <span>EPS {recent.observed.epsGrowth}/{payload.universeCount} ({ratio(recent.coverage.epsGrowth)})</span>
   <span>매출 {recent.observed.revenueGrowth}/{payload.universeCount} ({ratio(recent.coverage.revenueGrowth)})</span>
   <span>영업이익률 {recent.observed.operatingMargin}/{payload.universeCount} ({ratio(recent.coverage.operatingMargin)})</span>
   <span>이익 개선 폭 {recent.observed.earningsGrowthBreadth}/{payload.universeCount} ({ratio(recent.coverage.earningsGrowthBreadth)})</span>
  </div>
  {points.length>=2
   ?<div className="earnings-risk-provisional-chart"><MarketFearGreedChart data={points}
    axisTicks={ticks} axisLabels={labels}
    latestPoint={latest&&score(latest.score)?{date:latest.date,score:latest.score}:null}
    instanceKey="earnings-risk-provisional" gradientId="earnings-risk-provisional-gradient"
    color="#e2c574" dashed
    formatTooltipLabel={time} showExtrema={false}/></div>
   :<p className="earnings-risk-provisional-empty">첫 관측 점수 저장됨 · 추가 공시 반영 후 변화선 표시</p>}
  {recent.factorScores?<div className="earnings-risk-provisional-factors">
   {titles.map(x=><span key={x.key}>{x.name} <strong>{recent.factorScores?.[x.key].toFixed(1)}점</strong></span>)}
  </div>:null}
  <p className="earnings-risk-provisional-note">공시가 수집될 때마다 실제 계산해 저장한 점수입니다. 표본이 적은 초기 점수는 전체 시장을 대표하지 않으며, 아래 확정 진단 점수를 대체하지 않습니다.</p>
 </section>;
}
