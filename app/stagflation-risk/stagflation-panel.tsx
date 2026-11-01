'use client';
import {useStoredIndex} from '../../components/use-stored-index';
import {MarketCardHeader} from '../market-card-header';
import {MarketScoreOrb} from '../market-score-orb';
import {MarketTrendFrame} from '../market-trend-frame';
import {MarketFearGreedChart,type MarketFearGreedChartPoint} from '../market-fear-greed-chart';
import '../inflation/inflation-indicator-r2.css';
import '../inflation/inflation-score-comparisons-r1.css';
import '../inflation/inflation-hero-typography-r1.css';
import '../shared-risk-indicator-width-r1.css';
import './stagflation.css';
import StagflationInputs,{type StagflationInput} from './stagflation-inputs';
import StagflationLatestPanel from './stagflation-latest-panel';
type Payload={status:string;score:number|null;observationMonth?:string;trend?:Array<{label:string;value:number}>;scoreComparisons?:{week?:number|null;month?:number|null;threeMonth?:number|null;sixMonth?:number|null;year?:number|null};axes?:Record<string,number>;contraction?:Record<string,boolean>;inputs?:StagflationInput[]};
const axes=[
 ['inflation','물가 압력','전체·근원 PCE의 수준과 최근 상승 속도'],
 ['realEconomy','실물 둔화','산업생산·실질소비·실질소득의 증가 속도'],
 ['labor','고용 둔화','비농업고용의 증가 속도와 감속'],
 ['expectationsEnergy','기대·에너지','기대인플레이션과 유가 상승 부담'],
] as const;

export default function StagflationPanel(){
 const {payload:storedPayload,loading,error}=useStoredIndex<Payload>('/api/stagflation-risk-detail');
 const payload=error?null:storedPayload;
 const score=payload?.status==='READY'&&typeof payload.score==='number'&&Number.isFinite(payload.score)?payload.score:null;
 const trend:MarketFearGreedChartPoint[]=(payload?.trend??[]).map(p=>({date:p.label,score:p.value}));
 const last=trend.at(-1),latestPoint=last&&typeof last.score==='number'?{date:last.date,score:last.score}:null;
 const comparisons=[
  {label:'1주',value:payload?.scoreComparisons?.week??null},
  {label:'1개월',value:payload?.scoreComparisons?.month??null},
  {label:'3개월',value:payload?.scoreComparisons?.threeMonth??null},
  {label:'6개월',value:payload?.scoreComparisons?.sixMonth??null},
  {label:'1년',value:payload?.scoreComparisons?.year??null},
 ];
 const state=score===null?'자료 준비 중':score>=75?'안정':score>=60?'양호':score>=40?'중립':score>=25?'주의':'위험';
 const color=score===null?'#94a3b8':score>=75?'#10b981':score>=60?'#22c55e':score>=40?'#94a3b8':score>=25?'#f59e0b':'#ef4444';
 const ticks=trend.filter((_,i)=>i%3===0||i===trend.length-1).map(p=>p.date);
 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell inflation-target-card stagflation-card" data-testid="stagflation-detail-hero" aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI STAGFLATION" title="미국 스태그플레이션 위험" description="높을수록 동시 위험이 낮음 · 월별 관측" dateLabel="관측 기준월" date={payload?.observationMonth?.slice(0,7)??'확인 중'} source="BEA · BLS · 연준 · EIA"/></div>
   <div className="fg-content-slot"><div className="fg-score-slot"><MarketScoreOrb score={score===null?'—':score.toFixed(1)} state={loading?'확인 중':state} variant="hero" comparisonItems={comparisons} comparisonAriaLabel="스태그플레이션 안전 점수 월별 변화" metaDate={payload?.observationMonth?.slice(0,7)}/></div>
   <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart showExtrema color={color} data={trend} latestPoint={latestPoint} axisTicks={ticks} axisLabels={new Map(trend.map(p=>[p.date,p.date.slice(2,7).replace('-','/')]))} instanceKey="stagflation-monthly" gradientId="stagflation-fill" formatTooltipLabel={d=>d.slice(0,7)} emptyLabel={loading?'확인 중':'승인된 저장 이력이 없습니다'}/></div></div></MarketTrendFrame></div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>데이터 출처</span><strong>BEA · BLS · 연준 · EIA · 현재 개정치 기준 월별 재구성</strong></div></div>
  </section>
  <StagflationLatestPanel/>
  <section className="inflation-explainer" aria-labelledby="stagflation-what-title">
   <p className="cnn-eyebrow">STAGFLATION RISK</p><h1 id="stagflation-what-title">스태그플레이션이란?</h1>
   <p>물가가 높은 가운데 경제 성장과 고용이 함께 둔화되는 상황입니다. <mark className="zg-inflation-keymark">고물가와 실물·고용 둔화가 겹치는 위험</mark>을 살펴봅니다. <strong>안전 점수가 높을수록 이 동시 위험이 낮다는 뜻</strong>입니다. 주식시장 전체의 안전도나 위기 확률, 매수·매도 신호는 아닙니다.</p>
   <div className="inflation-direction-strip"><span>높은 점수 · 동시 위험이 낮은 방향</span><span>낮은 점수 · 고물가·둔화 부담이 큰 방향</span></div>
  </section>
  <section className="inflation-r2-axis-section stagflation-axes" aria-labelledby="stagflation-axis-title">
   <header><div><p className="cnn-eyebrow">STAGFLATION RISK AXES</p><h2 id="stagflation-axis-title">스태그플레이션 위험 평가 · 4개 영역</h2></div><p>아래는 월별 확정 평가의 영역별 위험 강도입니다. <b>높을수록 부담</b>이 크며, 월별 안전 점수와 방향이 반대입니다.</p></header>
   <div className="inflation-r2-axis-grid">{axes.map(([id,label,meaning])=>{const v=payload?.axes?.[id];const ready=payload?.status==='READY'&&typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;return <article key={id} className="inflation-r2-axis-item"><div className="inflation-r2-axis-top"><h3>{label}</h3><strong>{ready?v.toFixed(1):'—'}</strong></div><p>{meaning}</p></article>})}</div>
   <p className="inflation-r2-axis-note">영역 점수의 단순 평균이 최종 점수는 아닙니다. 성장 둔화가 곧 경제의 수축을 뜻하지는 않습니다. 관측월과 발표·갱신 시각도 다릅니다.</p>
  </section>
  <StagflationInputs inputs={payload?.inputs}/>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
