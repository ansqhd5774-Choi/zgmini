"use client";

import {useEffect,useMemo,useRef,useState,type FocusEvent} from "react";
import {Info} from "lucide-react";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";

type Indicator={id:string;name:string|null;status:string;score:number|null;value:number|null;unit:string;observationDate:string|null;source:string};
type StoredE1={status:string;score:number|null;methodologyVersion:string;financialPeriodEnd:string|null;updatedAt:string|null;issuerCount:number|null;indicators:Indicator[];components:Record<string,{weight:number;coverage:number|null}>;trend:Array<{label:string;value:number}>;persistence:any;missing:string[]};
type Payload={status:string;score:number|null;missingFactors?:string[];asOfDate?:string|null;methodologyVersion?:string;storedE1?:StoredE1};

const meta:Record<string,{label:string;content:string;criterion:string;help:string}>={
 epsGrowth:{label:"EPS 성장률",content:"S&P 500 기업들의 주당순이익 성장 강도",criterion:"높고 확산될수록 양호",help:"기업 이익이 전년 동기 대비 얼마나 성장했는지 봅니다. E1-R4는 기업별 EPS 성장률 중앙값을 과거 분포와 비교해 점수화합니다."},
 margin:{label:"영업이익률",content:"매출에서 영업이익이 차지하는 비율",criterion:"높고 유지될수록 양호",help:"영업이익률이 하락하면 비용 압력이나 가격결정력 약화를 의미할 수 있습니다. E1-R4는 기업별 영업이익률 중앙값을 과거 분포와 비교합니다."},
 revenueGrowth:{label:"매출 성장률",content:"기업 매출의 전년 동기 대비 성장 강도",criterion:"플러스·개선",help:"매출 성장은 실제 수요가 얼마나 견조한지 보여줍니다. 이익만 늘고 매출이 약하면 실적 회복의 질이 낮을 수 있습니다."},
 earningsGrowthBreadth:{label:"이익 성장 종목 비율",content:"EPS가 증가한 기업의 비율",criterion:"넓게 확산될수록 양호",help:"소수 대형주의 이익만 증가하는지, 시장 전반으로 이익 성장이 확산되는지를 봅니다. 비율이 높을수록 실적 기반이 넓습니다."},
};
const order=["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"] as const;

const dev=[
 ["순이익률","순이익 기준 최종 수익성","안정·개선","영업단계를 넘어 최종 순이익 수익성까지 연결할 예정입니다."],
 ["Forward EPS Revision","향후 이익 전망의 상향·하향 조정","상향 우세","애널리스트 이익 전망 수정 방향을 실적 선행지표로 추가할 예정입니다."],
 ["Earnings Surprise Breadth","시장 예상치를 상회한 기업 비율","상회 기업 증가","실적 발표가 예상보다 강한 기업이 얼마나 넓게 분포하는지 추가할 예정입니다."],
 ["Guidance Breadth","기업 가이던스 상향·하향 폭","상향 우세","기업이 제시하는 향후 매출·이익 전망의 방향을 추가할 예정입니다."],
 ["Free Cash Flow Margin","현금흐름 기준 수익성","안정·개선","회계상 이익이 실제 현금창출로 이어지는지 확인할 예정입니다."]
] as const;

function dateLabel(v?:string|null){if(!v)return "—";const d=new Date(v.length===10?v+"T00:00:00Z":v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeZone:"Asia/Seoul"}).format(d):v}
function stage(s:number|null|undefined,status?:string){if(status!=="READY"||typeof s!=="number"||!Number.isFinite(s))return "데이터 준비 중";if(s>=75)return "매우 양호";if(s>=60)return "양호";if(s>=45)return "중립";if(s>=25)return "실적 주의";return "실적 침체 위험"}
function judge(s:number|null|undefined,status?:string){if(status!=="READY"||typeof s!=="number"||!Number.isFinite(s))return {label:"데이터 준비 중",tone:"neutral"};if(s>=60)return {label:"긍정",tone:"positive"};if(s>=45)return {label:"중립",tone:"neutral"};return {label:"부정",tone:"negative"}}
function fmt(r:Indicator|null|undefined){if(!r||typeof r.value!=="number"||!Number.isFinite(r.value))return "—";return r.value.toFixed(2)+(r.unit?" "+r.unit:"")}
function HelpTip({label,text}:{label:string;text:string}){const [open,setOpen]=useState(false);const root=useRef<HTMLSpanElement>(null);useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close)},[open]);const blur=(e:FocusEvent<HTMLSpanElement>)=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)};return <span ref={root} className="inflation-help" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onBlur={blur}><button type="button" aria-label={label+" 해석 방향"} aria-expanded={open} onFocus={()=>setOpen(true)} onClick={e=>{e.stopPropagation();setOpen(v=>!v)}}><Info size={14}/></button>{open?<span role="tooltip"><strong>해석 방향</strong>{text}</span>:null}</span>}

export default function EarningsRecessionPanel(){
 const [payload,setPayload]=useState<Payload|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{const c=new AbortController();fetch("/api/earnings-recession-detail",{cache:"no-store",signal:c.signal}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<Payload>}).then(setPayload).catch(()=>setPayload(null)).finally(()=>setLoading(false));return()=>c.abort()},[]);
 const diagnosticScore=typeof payload?.score==="number"&&Number.isFinite(payload.score)?payload.score:null;
 const stored=payload?.storedE1;
 const trend=useMemo(()=>(stored?.trend??[]).filter(p=>typeof p.value==="number"&&Number.isFinite(p.value)).slice(-5).map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint)),[stored?.trend]);
 const latest=trend.at(-1),latestPoint:MarketFearGreedChartValidPoint|null=latest?{date:latest.date,score:latest.score as number}:null;
 const axisTicks=trend.map(p=>p.date),axisLabels=new Map(trend.map(p=>[p.date,p.date.slice(2,7).replace("-","/")]));
 const rows=new Map((stored?.indicators??[]).map(x=>[x.id,x]));
 const previous=trend.at(-2)?.score,first=trend.at(0)?.score;
 const storedScore=typeof stored?.score==="number"&&Number.isFinite(stored.score)?stored.score:null;

 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell earnings-recession-target-card" data-testid="earnings-recession-detail-hero" data-market-state={loading?"loading":payload?.status==="READY"?"ready":"unavailable"} aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI EARNINGS RECESSION" title="미국 실적 침체" description="Main diagnostic + stored E1-R4" dateLabel="데이터 기준일" date={dateLabel(payload?.asOfDate)} source={payload?.methodologyVersion??"EARNINGS_RECESSION_R1"}/></div>
   <div className="fg-content-slot">
    <div className="fg-score-slot"><MarketScoreOrb score={loading||diagnosticScore===null?"—":diagnosticScore.toFixed(1)} state={loading?"확인 중":stage(diagnosticScore,payload?.status)} variant="hero" dayDelta={null} periodDelta={null} periodLabel="진단 추이" dayLabel="이전 대비" comparisonAriaLabel="실적 침체 방어점수 상태" metaDate={dateLabel(payload?.asOfDate)}/></div>
    <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey="earnings-stored" gradientId="earnings-recession-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"E1 저장이력 없음"}/></div></div></MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>E1 저장점수</span><strong>{storedScore===null?"데이터 준비 중":storedScore.toFixed(1)+"점"} · 메인 진단점수 대체 아님 · 저장 분기점수만 표시</strong></div></div>
  </section>

  <section className="inflation-explainer" aria-labelledby="earnings-what-title">
   <p className="cnn-eyebrow">WHAT IS AN EARNINGS RECESSION?</p><h1 id="earnings-what-title">실적 침체란?</h1>
   <p>실적 침체는 기업들의 이익이 전반적으로 둔화하거나 감소하는 상태입니다. 주가가 오르더라도 EPS 성장, 매출 성장, 이익률, 이익 성장 기업의 폭이 함께 약해지면 기업 펀더멘털이 악화되고 있다는 신호가 될 수 있습니다.</p>
   <div className="inflation-direction-strip"><span><b>침체 방향</b>EPS↓ · 매출↓ · 이익률↓ · 성장기업 폭↓</span><span><b>안정 방향</b>이익·매출 성장 · 마진 유지 · 성장 폭 확대</span></div>
  </section>

  <section className="inflation-indicator-section" aria-labelledby="earnings-indicator-title">
   <header><div><p className="cnn-eyebrow">EARNINGS RECESSION INDICATORS</p><h2 id="earnings-indicator-title">실적 침체 분석 지표</h2></div><p>E1-R4 저장 데이터가 있으면 실제값을 표시합니다. 메인 진단 미연결 상태와 저장 데이터 존재 여부를 구분합니다.</p></header>
   <div className="inflation-table-wrap"><table className="inflation-indicator-table"><thead><tr><th>지표</th><th>내용</th><th>기준</th><th>현재</th><th>판단</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead><tbody>
    {order.map(id=>{const r=rows.get(id),m=meta[id],j=judge(r?.score,r?.status);const comp=stored?.components?.[id];return <tr key={id} data-judgement={j.tone}><th scope="row"><strong>{m.label}</strong><small>저장 데이터</small></th><td>{m.content}</td><td>{m.criterion}</td><td><strong>{fmt(r)}</strong><small>{r?.status==="READY"?"내부점수 "+(r.score?.toFixed(1)??"—")+" · "+dateLabel(r.observationDate):"저장 데이터 준비 중"}</small></td><td><span className="inflation-judgement">{j.label}</span></td><td><HelpTip label={m.label} text={m.help}/></td></tr>})}
    {dev.map(item=><tr key={item[0]} data-development="true"><th scope="row"><strong>{item[0]}</strong></th><td>{item[1]}</td><td>{item[2]}</td><td>—</td><td><span className="inflation-judgement is-development">개발중</span></td><td><HelpTip label={item[0]} text={item[3]+" 현재 ZGmini 데이터 연결 개발 중입니다."}/></td></tr>)}
   </tbody></table></div>
  </section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
