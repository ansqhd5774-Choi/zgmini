'use client';

import {useRef,useState,type CSSProperties} from 'react';
import {Activity,ArrowRight,ArrowUpRight,BarChart3,Landmark,ShieldAlert,ShieldCheck,Wallet} from 'lucide-react';
import {RISK_CARDS} from '../../components/market-explorer-catalog';
import {LiveScoreValue} from '../../components/live-score-value';
import {useStoredIndex} from '../../components/use-stored-index';
import {MarketFearGreedChart,type MarketFearGreedChartPoint} from '../market-fear-greed-chart';

type RiskCard=(typeof RISK_CARDS)[number];
type StatusScore={status?:string;score?:number|null};
type Snapshot={diagnostics8?:Record<string,StatusScore>};
type TrendRow={label?:string;date?:string;score?:number|null;value?:number|null};
type Detail=StatusScore&{trend?:TrendRow[];riskTrend?:TrendRow[];historyMode?:string;riskHistoryKind?:string;asOfDate?:string};
type RiskView=RiskCard&{index:number;score:number|null};
type Period='1개월'|'3개월'|'6개월'|'1년';

const detailEndpoints:Record<RiskCard['id'],string>={
 inflationStability:'/api/inflation-detail',
 recessionDefense:'/api/recession-detail',
 stagflationSafety:'/api/stagflation-risk-detail',
 creditRiskDefense:'/api/credit-risk-detail',
 earningsRecessionDefense:'/api/earnings-recession-detail',
 assetBubbleSafety:'/api/asset-bubble-detail',
 debtRiskSafety:'/api/debt-risk-detail',
 supplyShockSafety:'/api/supply-shock-detail',
};
const periods:Period[]=['1개월','3개월','6개월','1년'];
const mobileRiskNames:Record<RiskCard['id'],string>={
 inflationStability:'물가',
 recessionDefense:'경기 침체',
 stagflationSafety:'스태그',
 creditRiskDefense:'신용 위험',
 earningsRecessionDefense:'실적 침체',
 assetBubbleSafety:'버블',
 debtRiskSafety:'부채 위험',
 supplyShockSafety:'공급 충격',
};
const months:Record<Period,number>={'1개월':1,'3개월':3,'6개월':6,'1년':12};
const valid=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const scoreOf=(datum:StatusScore|null|undefined)=>datum?.status==='READY'&&valid(datum.score)?datum.score:null;
const tone=(n:number|null)=>n===null?'#a7b9c9':n<25?'#ff416d':n<45?'#ffc43d':n<=55?'#bfd4e4':'#04d4a9';
const state=(n:number|null)=>n===null?'확인 대기':n<25?'취약':n<45?'주의':n<=55?'중립':'양호';
const dateFormat=(d:string)=>d.replaceAll('-','.');
const monthShift=(date:string,amount:number)=>{const year=Number(date.slice(0,4)),month=Number(date.slice(5,7));const day=Number(date.slice(8,10));const base=new Date(Date.UTC(year,month-1,day));base.setUTCMonth(base.getUTCMonth()-amount);return base.toISOString().slice(0,10);};

function parseHistory(detail:Detail|null):Array<{date:string;score:number}>{
 const trend=detail?.trend??detail?.riskTrend??[];
 const unique=new Map<string,number>();
 for(const row of trend){
  const date=row.date??row.label;
  const score=row.value??row.score;
  if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&valid(score))unique.set(date,score);
 }
 return [...unique].sort(([a],[b])=>a.localeCompare(b)).map(([date,score])=>({date,score}));
}

function ScoreHistory({card,score}:{card:RiskCard;score:number|null}){
 const [period,setPeriod]=useState<Period>('1년');
 const {payload,loading,error}=useStoredIndex<Detail>(detailEndpoints[card.id]);
 const history=parseHistory(payload);
 const last=history.at(-1);
 const selected=last?history.filter(p=>p.date>=monthShift(last.date,months[period])):[];
 const consistent=score!==null&&payload?.status==='READY'&&valid(payload.score)&&Math.abs(score-payload.score)<0.05;
 const points:MarketFearGreedChartPoint[]=selected.map(p=>({date:p.date,score:p.score}));
 const ticks=selected.length>1?[selected[0].date,selected.at(-1)!.date]:[];
 const labels=new Map(ticks.map(date=>[date,date.slice(2,7).replace('-','.')] as const));
 const insufficient=selected.length<2;
 return <section className="zg-risk-trend" aria-label={`${card.name} 점수 이력`}>
  <div className="zg-risk-trend-head">
   <div><h3>{card.name} 안정 점수 · 저장 추이</h3><span>실제 관측점만 연결</span></div>
   <div className="zg-risk-periods" role="group" aria-label="차트 기간">
    {periods.map(item=><button type="button" key={item} className={period===item?'is-active':''} aria-pressed={period===item} onClick={()=>setPeriod(item)}>{item}</button>)}
   </div>
  </div>
  <div className="zg-risk-chart">
   {loading&&!payload?<div className="zg-risk-chart-empty">저장 이력을 불러오는 중입니다.</div>
   :error&&!payload?<div className="zg-risk-chart-empty">이력 자료를 가져오지 못했습니다.</div>
   :!consistent?<div className="zg-risk-chart-empty">현재 점수와 이력 자료의 기준을 확인 중입니다.</div>
   :history.length===0?<div className="zg-risk-chart-empty">저장된 점수 이력이 아직 제공되지 않습니다. 현재 점수만 확인할 수 있습니다.</div>
   :insufficient?<div className="zg-risk-chart-empty">선택 기간의 관측점이 {selected.length}개입니다. 차트를 그리려면 2개 이상이 필요합니다.</div>
   :<MarketFearGreedChart
     data={points}
     axisTicks={ticks}
     axisLabels={labels}
     latestPoint={selected.at(-1)!}
     instanceKey={card.id}
     gradientId={`zg-risk-landing-${card.id}`}
     formatTooltipLabel={dateFormat}
     color={tone(score)}
     emptyLabel="저장 이력이 없습니다."
   />}
  </div>
  <p className="zg-risk-history-note">
   {consistent&&last?`관측 ${history.length}개 · 최근 관측 ${dateFormat(last.date)} · ${period} 구간 ${selected.length}개`
     :'점수 또는 이력 결측 시 임의 보간하지 않습니다.'}
   {consistent&&history.length>0&&(payload?.historyMode==='CURRENT_VINTAGE_ONLY'||Boolean(payload?.riskHistoryKind))?' · 현재 기준으로 재구성된 이력':''}
  </p>
 </section>;
}

const explainer=[
 {icon:BarChart3,name:'경기 침체 신호 점검',description:'고용·생산·소비 등 실물경제의 둔화 가능성을 확인할 수 있습니다.',link:'/recession/',cta:'경기 침체 지표 자세히 보기'},
 {icon:Wallet,name:'물가 부담 흐름 확인',description:'물가 상승이 가계와 기업에 미치는 압력을 살펴볼 수 있습니다.',link:'/inflation/',cta:'인플레이션 지표 자세히 보기'},
 {icon:Landmark,name:'금융 스트레스 점검',description:'신용 위험과 자금 조달 환경의 변화를 확인할 수 있습니다.',link:'/credit-risk/',cta:'신용 위험 지표 자세히 보기'},
];

export default function RiskIndicatorsClient(){
 const [selectedId,setSelectedId]=useState<RiskCard['id']|null>(null);
 const featureRef=useRef<HTMLElement>(null);
 const {payload,loading,error}=useStoredIndex<Snapshot>('/api/market-score');
 const {payload:inflation}=useStoredIndex<Detail>('/api/inflation-detail');
 const {payload:asset}=useStoredIndex<Detail>('/api/asset-bubble-detail');
 const {payload:supply}=useStoredIndex<Detail>('/api/supply-shock-detail');
 const {payload:stagflation,error:stagflationError}=useStoredIndex<Detail>('/api/stagflation-risk-detail');
 const cards:RiskView[]=RISK_CARDS.map((card,index)=>{
  const datum=card.id==='inflationStability'?inflation:card.id==='assetBubbleSafety'?asset:card.id==='supplyShockSafety'?supply:card.id==='stagflationSafety'?(stagflationError?null:stagflation):payload?.diagnostics8?.[card.id];
  return {...card,index,score:scoreOf(datum)};
 }).sort((a,b)=>a.score===null&&b.score===null?a.index-b.index:a.score===null?1:b.score===null?-1:a.score-b.score||a.index-b.index);
 const featured=(selectedId?cards.find(card=>card.id===selectedId):null)??cards.find(card=>card.score!==null)??null;
 const manuallySelected=selectedId!==null;
 const ready=cards.filter(card=>card.score!==null).length;
 const selectRisk=(id:RiskCard['id'])=>{
  setSelectedId(id);
  if(window.matchMedia('(min-width: 601px) and (max-width: 950px)').matches){
   featureRef.current?.scrollIntoView({behavior:'smooth',block:'start'});
  }
 };
 return <main className="zg-risk-landing">
  <div className="zg-risk-landing-inner">
   <header className="zg-risk-hero">
    <h1>미국 경제 위험 지표 8가지</h1>
    <p>지금 위험 신호가 강한 영역부터 살펴보세요.</p>
    <span>0~100 안정 점수 · 낮을수록 취약 · 위기 발생 확률 아님</span>
   </header>
   {error&&<p className="zg-risk-api-notice" role="status">최신 종합 자료의 갱신이 지연되고 있습니다. 표시 가능한 저장 점수를 기준으로 안내합니다.</p>}
   <div className="zg-risk-overview">
    <section ref={featureRef} className="zg-risk-feature" style={{'--zg-risk-feature-color':tone(featured?.score??null)} as CSSProperties} aria-label="선택한 경제 위험 지표 분석">
     <header className="zg-risk-feature-head">
      <span className="zg-risk-feature-eyebrow">{manuallySelected?'선택한 위험 지표':'가장 먼저 볼 위험'}</span><span className="zg-risk-feature-divider" aria-hidden="true"/>
      <h2 aria-live="polite">{featured?.name??'점수 확인 중'}</h2>
      <span className="zg-risk-status">{state(featured?.score??null)}</span>
     </header>
     <div className="zg-risk-feature-measure">
      <div className="zg-risk-feature-number"><div><LiveScoreValue value={featured?.score??null}>{featured?.score===null||featured===null?'—':featured.score.toFixed(1)}</LiveScoreValue><span> / 100</span></div><p>{featured?.description??'저장된 점수를 불러오는 중입니다.'}</p></div>
      <div className="zg-risk-feature-meter">
       <span className="zg-risk-meter-title">안정 점수 (0~100)</span>
       <div className="zg-risk-five-band" aria-label={featured?.score===null||featured===null?'점수 미제공':`안정 점수 ${featured.score?.toFixed(1)}점`}>
        {[25,20,10,20,25].map((size,index)=><span key={index} style={{flex:size}}/>)}
        {featured?.score!==null&&featured&&<i className="zg-risk-scale-pointer" style={{left:`${featured.score}%`}}/>}
       </div>
       <div className="zg-risk-five-band-labels"><span>0</span><span>취약</span><span>주의</span><span>중립</span><span>양호</span><span>100</span></div>
      </div>
     </div>
     {featured?<ScoreHistory key={featured.id} card={featured} score={featured.score}/>:<div className="zg-risk-chart zg-risk-chart-empty">이력 확인 대기</div>}
     <div className="zg-risk-feature-bottom">
      <div><ShieldAlert size={21} aria-hidden="true"/><p><strong>{manuallySelected?'선택한 위험의 상태와 저장된 이력을 보여줍니다.':'8개 위험 중 현재 안정 점수가 가장 낮은 영역입니다.'}</strong><span>투자 자산의 손실 또는 위기 발생 확률을 의미하지 않습니다.</span></p></div>
      {featured?<a href={featured.href} className="zg-risk-feature-cta">{featured.name} 상세 분석 <ArrowRight size={17}/></a>:<span className="zg-risk-feature-pending">{loading?'데이터 확인 중':'제공 가능한 점수 없음'}</span>}
     </div>
    </section>
    <section className="zg-risk-ranking" aria-label="8대 경제 위험 지표 순위">
     <header><h2>8개 위험 영역 <small>(안정 점수 낮은 순)</small></h2><p>항목 선택 → 왼쪽 분석 · ↗ 상세 페이지</p></header>
     <ol className="zg-risk-ranking-list">
      {cards.map((card,index)=><li key={card.id}>
       <div className={`zg-risk-ranking-item${featured?.id===card.id?' is-selected':''}`} style={{'--zg-risk-row-color':tone(card.score)} as CSSProperties}>
        <button type="button" className="zg-risk-rank-select" onClick={()=>selectRisk(card.id)} aria-pressed={featured?.id===card.id} aria-label={`${index+1}위 ${card.name}, 안정 점수 ${card.score===null?'미제공':card.score.toFixed(1)+'점'}, 왼쪽 분석에 표시`}>
         <span className="zg-risk-rank">{String(index+1).padStart(2,'0')}</span>
         <strong className="zg-risk-rank-name-full">{card.name}</strong>
         <strong className="zg-risk-rank-name-mobile" aria-hidden="true">{mobileRiskNames[card.id]}</strong>
         <span className="zg-risk-rank-description">{card.description}</span>
         <span className="zg-risk-rank-score"><LiveScoreValue value={card.score}>{card.score===null?'—':card.score.toFixed(1)}</LiveScoreValue></span>
         <span className="zg-risk-rank-status">{state(card.score)}</span>
        </button>
        <a href={card.href} className="zg-risk-rank-detail-link" aria-label={`${card.name} 상세 페이지로 이동`} title={`${card.name} 상세 페이지`}><ArrowUpRight size={18} aria-hidden="true"/></a>
       </div>
      </li>)}
     </ol>
     <p className="zg-risk-ranking-footnote"><ShieldCheck size={14} aria-hidden="true"/>저장 점수 제공 {ready}/8 · 결측은 맨 아래 표시 · 지표마다 관측 시점은 다를 수 있습니다.</p>
    </section>
   </div>
   <p className="zg-risk-mobile-footnote"><ShieldCheck size={14} aria-hidden="true"/>저장 점수 제공 {ready}/8 · 결측은 맨 아래 표시 · 지표마다 관측 시점은 다를 수 있습니다.</p>
   <section className="zg-risk-explainer">
    <div className="zg-risk-explainer-intro"><h2>이 지표는 무엇을 알려줄까요?</h2><p>8가지 위험 지표는 미국 경제의 주요 위험 요인을 점검해 지금 시장이 어디에 취약한지 한눈에 보여줍니다. 각 항목을 클릭하면 점수의 의미와 세부 요인을 확인할 수 있습니다.</p></div>
    {explainer.map(({icon:Icon,name,description,link,cta})=><article key={link}>
     <div className="zg-risk-explainer-icon"><Icon size={22} strokeWidth={1.7}/></div>
     <div><h3>{name}</h3><p>{description}</p><a href={link}>{cta} <ArrowRight size={15}/></a></div>
    </article>)}
   </section>
   <div className="zg-risk-bottom-notes"><Activity size={15}/><span>이 점수는 경제·시장 위험을 비교하기 위한 ZGmini의 평가이며 투자 권유나 확률 예측이 아닙니다. 데이터가 없는 기간은 채우지 않습니다.</span></div>
  </div>
 </main>;
}
