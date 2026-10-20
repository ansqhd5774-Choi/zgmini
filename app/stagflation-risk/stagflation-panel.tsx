'use client';
import {useStoredIndex} from '../../components/use-stored-index';
import {MarketCardHeader} from '../market-card-header';
import {MarketScoreOrb} from '../market-score-orb';
import {MarketTrendFrame} from '../market-trend-frame';
import {MarketFearGreedChart,type MarketFearGreedChartPoint} from '../market-fear-greed-chart';
import './stagflation.css';
type Payload={status:string;score:number|null;observationMonth?:string;trend?:Array<{label:string;value:number}>;axes?:Record<string,number>;contraction?:Record<string,boolean>};
const axes=[['inflation','물가 압력'],['realEconomy','실물 둔화'],['labor','고용 둔화'],['expectationsEnergy','기대·에너지']] as const;
export default function StagflationPanel(){
 const {payload:storedPayload,loading,error}=useStoredIndex<Payload>('/api/stagflation-risk-detail');
 const payload=error?null:storedPayload;
 const score=payload?.status==='READY'&&typeof payload.score==='number'&&Number.isFinite(payload.score)?payload.score:null;
 const trend:MarketFearGreedChartPoint[]=(payload?.trend??[]).map(p=>({date:p.label,score:p.value}));
 const last=trend.at(-1),latestPoint=last&&typeof last.score==='number'?{date:last.date,score:last.score}:null;
 const difference=(offset:number)=>score!==null&&typeof trend.at(offset)?.score==='number'?score-(trend.at(offset)!.score as number):null;
 const comparisons=[{label:'1개월',value:difference(-2)},{label:'1년',value:difference(-13)}];
 const state=score===null?'자료 준비 중':score>=75?'안정':score>=60?'양호':score>=40?'중립':score>=25?'주의':'위험';
 const color=score===null?'#94a3b8':score>=75?'#10b981':score>=60?'#22c55e':score>=40?'#94a3b8':score>=25?'#f59e0b':'#ef4444';
 const ticks=trend.filter((_,i)=>i%3===0||i===trend.length-1).map(p=>p.date);
 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell stagflation-card" aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI STAGFLATION" title="미국 스태그플레이션 위험" description="높을수록 동시 위험이 낮음 · 월별 관측" dateLabel="관측 기준월" date={payload?.observationMonth?.slice(0,7)??'확인 중'} source="BEA · BLS · 연준 · EIA"/></div>
   <div className="fg-content-slot"><div className="fg-score-slot"><MarketScoreOrb score={score===null?'—':score.toFixed(1)} state={loading?'확인 중':state} variant="hero" marketScoreBands comparisonItems={comparisons} comparisonAriaLabel="스태그플레이션 안전 점수 월별 변화"/></div>
   <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart showExtrema marketScoreBands color={color} data={trend} latestPoint={latestPoint} axisTicks={ticks} axisLabels={new Map(trend.map(p=>[p.date,p.date.slice(2,7).replace('-','/')]))} instanceKey="stagflation-monthly" gradientId="stagflation-fill" formatTooltipLabel={d=>d.slice(0,7)} emptyLabel={loading?'확인 중':'승인된 저장 이력이 없습니다'}/></div></div></MarketTrendFrame></div>
   <div className="fg-footer-slot"><p className="cnn-panel-note">최근 1년 · 현재 개정치 기준 월별 재구성 · 발표 당시 점수나 위기 확률이 아닙니다.</p></div>
  </section>
  <section className="inflation-explainer stagflation-explanation"><h1>스태그플레이션이란?</h1><p>물가가 높은 가운데 경제 성장과 고용이 함께 둔화되는 상황입니다. 물가만 오르거나 경기만 나빠지는 위험과 구분해 살펴봅니다.</p><p>안전 점수는 높을수록 이 동시 위험이 낮다는 뜻입니다. 주식시장 전체의 안전도나 매수·매도 신호는 아닙니다.</p></section>
  <section className="inflation-indicator-section stagflation-axes" aria-label="영역별 위험 강도">{axes.map(([id,label])=>{const v=payload?.axes?.[id];return <article key={id}><h2>{label}</h2><strong>{typeof v==='number'&&Number.isFinite(v)?v.toFixed(1):'—'}</strong><p>위험 강도 · 높을수록 부담</p></article>})}</section>
  <section className="inflation-explainer stagflation-explanation"><h2>어떤 자료를 함께 보나요?</h2><p>전체·근원 PCE 물가, 산업생산, 실질소비, 실질소득, 비농업고용, 기대인플레이션과 WTI를 독립 계산합니다. 물가 압력과 실물·고용 둔화가 함께 나타날 때 위험이 커지며, 최근 3개월의 지속성을 반영합니다.</p><p>성장률이 양수여도 증가 속도가 약해질 수 있습니다. 성장 둔화가 곧 경제의 수축을 뜻하지는 않습니다. 자료의 관측월과 발표·갱신 시각도 다릅니다.</p><h2>점수와 차트의 기준</h2><p>물가 2~6% 범위, 영역 비중과 정규화는 ZGmini의 설계 기준이며 공식 위기 경계가 아닙니다. 월별 재구성에는 개정된 원자료가 사용되므로 과거 값이 달라질 수 있습니다. 결측값을 보간하거나 기존 유동성 위기 점수와 연결하지 않습니다.</p><a href="https://fred.stlouisfed.org/series/PCEPI">BEA PCE 원자료</a> · <a href="/recession/">경기침체 지표</a> · <a href="/economic-indicators/liquidity/">유동성 지표</a></section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
