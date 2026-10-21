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
type Payload={status:string;score:number|null;observationMonth?:string;trend?:Array<{label:string;value:number}>;axes?:Record<string,number>;contraction?:Record<string,boolean>};
const axes=[
 ['inflation','물가 압력','전체·근원 PCE의 수준과 최근 상승 속도'],
 ['realEconomy','실물 둔화','산업생산·실질소비·실질소득의 증가 속도'],
 ['labor','고용 둔화','비농업고용의 증가 속도와 감속'],
 ['expectationsEnergy','기대·에너지','기대인플레이션과 유가 상승 부담'],
] as const;
const inputs=[
 ['PCEPI','PCE 물가','가계가 구입하는 상품·서비스의 전반적인 물가','전년 대비 상승률','BEA'],
 ['PCEPILFE','근원 PCE 물가','식품·에너지를 제외한 기조 물가','전년 대비·최근 3개월 연율','BEA'],
 ['INDPRO','산업생산','공장·광산·공익사업의 생산 활동','최근 3개월 연율','연준'],
 ['DPCERA3M086SBEA','실질소비','물가 영향을 제거한 가계 소비','최근 3개월 연율','BEA'],
 ['DSPIC96','실질 가처분소득','가계가 실제로 쓸 수 있는 소득','최근 3개월 연율','BEA'],
 ['PAYEMS','비농업고용','농업 외 사업체의 고용 규모','최근 3개월 연율·직전 기간 대비 감속','BLS'],
 ['EXPINF5YR','5년 기대인플레이션','앞으로의 물가 상승에 대한 기대','기대 물가 수준','클리블랜드 연준'],
 ['MCOILWTICO','WTI 유가','기업·가계에 전해지는 에너지 가격 부담','전년 대비 상승률','EIA'],
] as const;
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
  <section className="cnn-reference-panel fg-card fg-shared-shell inflation-target-card stagflation-card" data-testid="stagflation-detail-hero" aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI STAGFLATION" title="미국 스태그플레이션 위험" description="높을수록 동시 위험이 낮음 · 월별 관측" dateLabel="관측 기준월" date={payload?.observationMonth?.slice(0,7)??'확인 중'} source="BEA · BLS · 연준 · EIA"/></div>
   <div className="fg-content-slot"><div className="fg-score-slot"><MarketScoreOrb score={score===null?'—':score.toFixed(1)} state={loading?'확인 중':state} variant="hero" marketScoreBands comparisonItems={comparisons} comparisonAriaLabel="스태그플레이션 안전 점수 월별 변화" metaDate={payload?.observationMonth?.slice(0,7)}/></div>
   <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart showExtrema marketScoreBands color={color} data={trend} latestPoint={latestPoint} axisTicks={ticks} axisLabels={new Map(trend.map(p=>[p.date,p.date.slice(2,7).replace('-','/')]))} instanceKey="stagflation-monthly" gradientId="stagflation-fill" formatTooltipLabel={d=>d.slice(0,7)} emptyLabel={loading?'확인 중':'승인된 저장 이력이 없습니다'}/></div></div></MarketTrendFrame></div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>데이터 출처</span><strong>BEA · BLS · 연준 · EIA · 현재 개정치 기준 월별 재구성</strong></div></div>
  </section>
  <section className="inflation-explainer" aria-labelledby="stagflation-what-title">
   <p className="cnn-eyebrow">STAGFLATION RISK</p><h1 id="stagflation-what-title">스태그플레이션이란?</h1>
   <p>물가가 높은 가운데 경제 성장과 고용이 함께 둔화되는 상황입니다. <mark className="zg-inflation-keymark">고물가와 실물·고용 둔화가 겹치는 위험</mark>을 살펴봅니다. <strong>안전 점수가 높을수록 이 동시 위험이 낮다는 뜻</strong>입니다. 주식시장 전체의 안전도나 위기 확률, 매수·매도 신호는 아닙니다.</p>
   <div className="inflation-direction-strip"><span>높은 점수 · 동시 위험이 낮은 방향</span><span>낮은 점수 · 고물가·둔화 부담이 큰 방향</span></div>
  </section>
  <section className="inflation-r2-axis-section stagflation-axes" aria-labelledby="stagflation-axis-title">
   <header><div><p className="cnn-eyebrow">STAGFLATION RISK AXES</p><h2 id="stagflation-axis-title">스태그플레이션 위험 평가 · 4개 영역</h2></div><p>아래는 영역별 위험 강도입니다. <b>높을수록 부담</b>이 크며, 위 안전 점수와 방향이 반대입니다.</p></header>
   <div className="inflation-r2-axis-grid">{axes.map(([id,label,meaning])=>{const v=payload?.axes?.[id];const ready=payload?.status==='READY'&&typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;return <article key={id} className="inflation-r2-axis-item"><div className="inflation-r2-axis-top"><h3>{label}</h3><strong>{ready?v.toFixed(1):'—'}</strong></div><p>{meaning}</p></article>})}</div>
   <p className="inflation-r2-axis-note">영역 점수의 단순 평균이 최종 점수는 아닙니다. 성장 둔화가 곧 경제의 수축을 뜻하지는 않습니다. 관측월과 발표·갱신 시각도 다릅니다.</p>
  </section>
  <section className="inflation-indicator-section stagflation-inputs" aria-labelledby="stagflation-input-title">
   <header><div><p className="cnn-eyebrow">STAGFLATION INPUTS</p><h2 id="stagflation-input-title">위험 신호의 근거 · 8개 원자료</h2></div><p>전체·근원 물가, 실물경제, 고용과 기대·에너지를 독립 계산합니다. 아래는 사용하는 자료와 해석 기준이며, 원자료 상승률과 영역별 위험 점수의 단위는 다릅니다.</p></header>
   <div className="inflation-table-wrap stagflation-input-table-wrap"><table className="inflation-indicator-table stagflation-input-table"><thead><tr><th>지표</th><th>내용</th><th>평가에 사용하는 신호</th><th>출처</th></tr></thead><tbody>{inputs.map(([id,label,meaning,signal,provider])=><tr key={id}><th scope="row"><strong>{label}</strong><small>{id}</small></th><td>{meaning}</td><td>{signal}</td><td><a href={'https://fred.stlouisfed.org/series/'+id} target="_blank" rel="noreferrer">{provider} ↗</a></td></tr>)}</tbody></table></div>
   <div className="stagflation-input-mobile">{inputs.map(([id,label,meaning,signal,provider])=><article key={id} className="inflation-r2-mobile-card"><div className="inflation-r2-mobile-head"><div className="inflation-r2-mobile-title"><div><strong>{label}</strong><small>{id}</small></div></div><a href={'https://fred.stlouisfed.org/series/'+id} target="_blank" rel="noreferrer">{provider} ↗</a></div><p className="inflation-r2-mobile-content">{meaning}</p><p className="inflation-r2-mobile-criterion"><span>평가 신호</span>{signal}</p></article>)}</div>
   <p className="inflation-r2-axis-note">물가 2~6% 범위와 비중·정규화는 ZGmini의 설계 기준이며 공식 위기 경계가 아닙니다. 차트는 최근 1년의 현재 개정치 기준 월별 재구성이며 발표 당시 점수나 예측 성과가 아닙니다. 결측값을 보간하거나 기존 유동성 위기 점수와 연결하지 않습니다.</p>
  </section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
