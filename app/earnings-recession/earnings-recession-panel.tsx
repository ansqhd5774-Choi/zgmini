"use client";
import {useStoredIndex} from '../../components/use-stored-index';
import {ContentHelp} from '../content-help';
import {HelpText} from '../help-copy';
import {useMemo} from "react";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";
import {EarningsFavoriteButton,EarningsFavoriteHeaderIcon} from "./earnings-favorite-button";
import "./earnings-indicator-r2.css";

type Indicator={id:string;name:string|null;status:string;score:number|null;value:number|null;unit:string;observationDate:string|null;source:string};
type StoredE1={status:string;score:number|null;methodologyVersion:string;financialPeriodEnd:string|null;updatedAt:string|null;issuerCount:number|null;indicators:Indicator[];components:Record<string,{weight:number|null;coverage:number|null}>;trend:Array<{label:string;value:number}>;persistence:any;missing:string[]};
type Payload={status:string;score:number|null;missingFactors?:string[];asOfDate?:string|null;methodologyVersion?:string;storedE1?:StoredE1};
type Meta={label:string;content:string;criterion:string;help:string};

const r4Meta:Record<string,Meta>={
 epsGrowth:{label:"EPS 성장률",content:"S&P 500 기업들의 주당순이익 성장 강도",criterion:"높고 확산될수록 양호",help:"기업 이익이 전년 동기 대비 얼마나 성장했는지 봅니다. E1-R4는 기업별 EPS 성장률 중앙값을 과거 분포와 비교해 점수화합니다."},
 margin:{label:"영업이익률",content:"매출에서 영업이익이 차지하는 비율",criterion:"높고 유지될수록 양호",help:"영업이익률이 하락하면 비용 압력이나 가격결정력 약화를 의미할 수 있습니다. E1-R4는 기업별 영업이익률 중앙값을 과거 분포와 비교합니다."},
 revenueGrowth:{label:"매출 성장률",content:"기업 매출의 전년 동기 대비 성장 강도",criterion:"플러스·개선",help:"매출 성장은 실제 수요가 얼마나 견조한지 보여줍니다. 이익만 늘고 매출이 약하면 실적 회복의 질이 낮을 수 있습니다."},
 earningsGrowthBreadth:{label:"이익 성장 종목 비율",content:"EPS가 증가한 기업의 비율",criterion:"넓게 확산될수록 양호",help:"소수 대형주의 이익만 증가하는지, 시장 전반으로 이익 성장이 확산되는지를 봅니다. 비율이 높을수록 실적 기반이 넓습니다."},
};
const r4Order=["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"] as const;
const r5Meta:Record<string,Meta>={
 S1:{label:"EPS 성장 강도",content:"기업별 EPS의 전년 동기 대비 성장 강도",criterion:"높을수록 양호",help:"적자·흑자 전환 구간의 왜곡을 줄인 EPS 성장 강도를 기업 전반의 중앙값으로 봅니다."},
 S2:{label:"매출 성장률",content:"기업 매출의 전년 동기 대비 성장",criterion:"높을수록 양호",help:"이익뿐 아니라 실제 매출 수요가 얼마나 견조한지 확인합니다."},
 S3:{label:"영업이익률 수준",content:"비금융기업의 현재 영업 수익성",criterion:"높을수록 양호",help:"현재 매출에서 영업이익이 차지하는 수준을 비교합니다."},
 S4:{label:"영업이익률 변화",content:"전년 동기 대비 영업이익률 변화",criterion:"개선될수록 양호",help:"기업의 가격결정력과 비용 부담이 전년보다 개선되는지 확인합니다."},
 S5:{label:"FCF 마진",content:"잉여현금흐름의 매출 대비 비율",criterion:"높을수록 양호",help:"회계상 이익이 실제 현금 창출로 이어지는지 확인합니다."},
 S6:{label:"BEA 기업이익",content:"미국 전체 기업이익의 전년 대비 변화",criterion:"증가할수록 양호",help:"SEC 개별기업 자료와 별도로 미국 경제 전체의 기업이익 흐름을 교차 확인합니다."},
 S7:{label:"EPS 개선 기업 비율",content:"전년보다 EPS가 좋아진 기업의 비율",criterion:"넓게 확산될수록 양호",help:"소수 대형주가 아니라 기업 전반에서 이익 개선이 나타나는지 봅니다."},
 S8:{label:"흑자 기업 비율",content:"현재 순이익이 흑자인 기업의 비율",criterion:"높을수록 양호",help:"이익 성장률과 별개로 실제 흑자를 내는 기업의 폭을 확인합니다."},
 S9:{label:"이익 개선 업종 비율",content:"전년보다 순이익이 개선된 업종의 비율",criterion:"업종 전반으로 확산될수록 양호",help:"기업 실적 개선이 특정 업종에 집중됐는지 시장 전반으로 확산됐는지 봅니다."},
 S10:{label:"생산자 원가 압력",content:"산업별 투입가격과 산출가격의 압력 차이",criterion:"낮을수록 양호",help:"기업이 받는 원재료·중간재 비용 압력이 판매가격보다 빠르게 오르는지 봅니다. 이 항목은 비용 압력이 낮을수록 점수가 높습니다."},
 S11:{label:"단위노동비용 압력",content:"생산 한 단위당 노동비용의 전년 변화",criterion:"낮을수록 양호",help:"임금 자체가 아니라 생산성까지 반영한 단위노동비용 부담을 봅니다. 압력이 낮을수록 점수가 높습니다."},
 S12:{label:"미래 전망 수정",content:"경영진 EPS 가이던스와 CFO 매출 전망의 수정 방향",criterion:"상향될수록 양호",help:"이미 발표된 실적뿐 아니라 기업 경영진과 CFO가 앞으로의 이익·매출 전망을 상향하는지 확인합니다."},
 S13:{label:"기업 가이던스 방향",content:"상향·유지·하향 가이던스의 순방향 지수",criterion:"상향 우세일수록 양호",help:"비교 가능한 기업 가이던스에서 상향이 하향보다 우세한지 확인합니다."},
};
const r5Order=["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12","S13"] as const;
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
function HelpTip({label,text}:{label:string;text:string}){return <ContentHelp label={label+' 도움말'}><HelpText copy={{meaning:text,reading:'원자료의 단위와 기준선, 관측일을 함께 확인하세요. 원자료의 상승·하락과 시장 평가 점수의 상승·하락은 서로 다를 수 있습니다.',note:'자료가 없거나 개발 중인 항목은 숫자를 표시하지 않습니다. 「—」는 0이 아닙니다.'}}/></ContentHelp>;}

export default function EarningsRecessionPanel(){
 const {payload,loading}=useStoredIndex<Payload>('/api/earnings-recession-detail');
 const diagnosticScore=typeof payload?.score==="number"&&Number.isFinite(payload.score)?payload.score:null,stored=payload?.storedE1,isR5=stored?.methodologyVersion==="E1-R5",activeMeta=isR5?r5Meta:r4Meta,activeOrder=isR5?r5Order:r4Order;
 const trend=useMemo(()=>(stored?.trend??[]).filter(p=>typeof p.value==="number"&&Number.isFinite(p.value)).slice(-8).map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint)),[stored?.trend]);
 const latest=trend.at(-1),latestPoint:MarketFearGreedChartValidPoint|null=latest?{date:latest.date,score:latest.score as number}:null,axisTicks=trend.map(p=>p.date),axisLabels=new Map(trend.map(p=>[p.date,p.date.slice(2,7).replace("-","/")])),rows=new Map((stored?.indicators??[]).map(x=>[x.id,x])),storedScore=typeof stored?.score==="number"&&Number.isFinite(stored.score)?stored.score:null;
 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell earnings-recession-target-card" data-testid="earnings-recession-detail-hero" data-market-state={loading?"loading":payload?.status==="READY"&&diagnosticScore!==null?"ready":"unavailable"} aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI EARNINGS RECESSION" title="미국 실적 침체" description="기업 실적 방어 진단 · E1 저장 실적 추이는 별도" dateLabel="진단 기준일" date={dateLabel(payload?.asOfDate)} source=""/></div>
   <div className="fg-content-slot"><div className="fg-score-slot"><MarketScoreOrb score={loading||diagnosticScore===null?"—":diagnosticScore.toFixed(1)} state={loading?"확인 중":stage(diagnosticScore,payload?.status)} variant="hero" dayDelta={null} periodDelta={null} periodLabel="진단 추이" dayLabel="이전 대비" comparisonAriaLabel="실적 침체 방어점수 상태" metaDate={dateLabel(payload?.asOfDate)}/></div><MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey="earnings-stored" gradientId="earnings-recession-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"E1 저장이력 없음"}/></div></div></MarketTrendFrame></div>
   <div className="fg-footer-slot"><div className="cnn-panel-note earnings-r2-source-note"><span>E1 저장 추이</span><strong>{storedScore===null?"점수 —":storedScore.toFixed(1)+"점"} · {stored?.methodologyVersion??"E1"} · 진단점수와 별도</strong></div></div>
  </section>
  <section className="inflation-explainer" aria-labelledby="earnings-what-title"><p className="cnn-eyebrow">WHAT IS AN EARNINGS RECESSION?</p><h1 id="earnings-what-title">실적 침체란?</h1><p>{isR5?"E1-R5는 실제 이익·매출·마진·현금흐름뿐 아니라 개선의 확산도, 생산·노동 비용 압력, 경영진과 CFO의 향후 전망까지 함께 봅니다.":"실적 침체는 기업들의 이익이 전반적으로 둔화하거나 감소하는 상태입니다. 주가가 오르더라도 EPS 성장, 매출 성장, 이익률, 이익 성장 기업의 폭이 함께 약해지면 기업 펀더멘털이 악화되고 있다는 신호가 될 수 있습니다."}</p><div className="inflation-direction-strip"><span><b>침체 방향</b>EPS·매출·마진↓ · 비용압력↑ · 전망↓</span><span><b>안정 방향</b>실적 개선 · 확산 확대 · 비용압력 완화 · 전망↑</span></div></section>
  <section className="inflation-indicator-section earnings-r2-indicators" aria-labelledby="earnings-indicator-title">
   <header><div><p className="cnn-eyebrow">EARNINGS RECESSION INDICATORS</p><h2 id="earnings-indicator-title">실적 침체 분석 지표</h2></div><p>{isR5?"E1-R5 저장 지표 13개입니다. 관측값과 내부 평가점수의 준비 상태를 구분합니다.":"E1-R4 저장 지표 4개와 개발 후보 5개입니다. 현재 제공된 자료만 표시합니다."}</p></header>
   <div className="earnings-r2-data-caption"><span>{stored?.methodologyVersion??"E1"} 저장 자료</span><strong>{stored?.status??"PARTIAL"}</strong><span>실적 기준 {dateLabel(stored?.financialPeriodEnd)}</span>{typeof stored?.issuerCount==="number"?<span>대상 기업 {stored.issuerCount.toLocaleString("ko-KR")}개</span>:null}</div>
   <div className="inflation-table-wrap earnings-r2-table-wrap"><table className="inflation-indicator-table earnings-r2-table">
    <colgroup><col className="earnings-col-favorite"/><col className="earnings-col-name"/><col className="earnings-col-content"/><col className="earnings-col-criterion"/><col className="earnings-col-current"/><col className="earnings-col-observed"/><col className="earnings-col-judgement"/><col className="earnings-col-help"/></colgroup>
    <thead><tr><th><EarningsFavoriteHeaderIcon/><span className="sr-only">즐겨찾기</span></th><th>지표</th><th>내용</th><th>기준</th><th>현재</th><th>관측일</th><th>판단</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead>
    <tbody>
     {activeOrder.map(id=>{const r=rows.get(id),m=activeMeta[id],j=judge(r?.score,r?.status);return <tr key={id} data-judgement={j.tone}>
      <td><EarningsFavoriteButton id={id} label={m.label}/></td>
      <th scope="row"><strong>{m.label}</strong><small>{isR5?"E1-R5":"E1-R4"} 저장 지표</small></th>
      <td>{m.content}</td><td>{m.criterion}</td>
      <td className="earnings-r2-value"><strong>{fmt(r)}</strong><small>{r?.status==="READY"&&typeof r.score==="number"?"내부점수 "+r.score.toFixed(1):"점수 —"}</small></td>
      <td className="earnings-r2-observed">{dateLabel(r?.observationDate)}</td>
      <td><span className="inflation-judgement">{j.label}</span></td>
      <td><HelpTip label={m.label} text={m.help}/></td>
     </tr>})}
     {!isR5&&dev.map(item=><tr key={item[0]} data-development="true">
      <td><EarningsFavoriteButton id={"development:"+item[0]} label={item[0]}/></td>
      <th scope="row"><strong>{item[0]}</strong><small>개발 후보 · 점수 미반영</small></th>
      <td>{item[1]}</td><td>{item[2]}</td><td>—</td><td>—</td>
      <td><span className="inflation-judgement is-development">개발중</span></td>
      <td><HelpTip label={item[0]} text={item[3]+" 현재 데이터 연결 개발 중이며 점수에 추가하지 않습니다."}/></td>
     </tr>)}
    </tbody>
   </table></div>
   <div className="earnings-r2-mobile-list">
    {activeOrder.map(id=>{const r=rows.get(id),m=activeMeta[id],j=judge(r?.score,r?.status);return <article className="earnings-r2-mobile-card" key={id} data-judgement={j.tone}>
     <div className="earnings-r2-mobile-head"><div className="earnings-r2-mobile-title"><EarningsFavoriteButton id={id} label={m.label}/><div><strong>{m.label}</strong><small>{isR5?"E1-R5":"E1-R4"} 저장 지표</small></div></div><div className="earnings-r2-mobile-actions"><span className="inflation-judgement">{j.label}</span><HelpTip label={m.label} text={m.help}/></div></div>
     <p className="earnings-r2-mobile-content">{m.content}</p>
     <p className="earnings-r2-mobile-criterion"><span>기준</span>{m.criterion}</p>
     <div className="earnings-r2-mobile-metrics">
      <div><span>현재</span><strong>{fmt(r)}</strong><small>{r?.status==="READY"&&typeof r.score==="number"?"내부점수 "+r.score.toFixed(1):"점수 —"}</small></div>
      <div><span>관측일</span><strong>{dateLabel(r?.observationDate)}</strong></div>
     </div>
    </article>})}
    {!isR5&&dev.map(item=><article className="earnings-r2-mobile-card is-development" key={item[0]}>
     <div className="earnings-r2-mobile-head"><div className="earnings-r2-mobile-title"><EarningsFavoriteButton id={"development:"+item[0]} label={item[0]}/><div><strong>{item[0]}</strong><small>개발 후보 · 점수 미반영</small></div></div><div className="earnings-r2-mobile-actions"><span className="inflation-judgement is-development">개발중</span><HelpTip label={item[0]} text={item[3]+" 현재 데이터 연결 개발 중이며 점수에 추가하지 않습니다."}/></div></div>
     <p className="earnings-r2-mobile-content">{item[1]}</p><p className="earnings-r2-mobile-criterion"><span>기준</span>{item[2]}</p>
     <div className="earnings-r2-mobile-metrics"><div><span>현재</span><strong>—</strong></div><div><span>관측일</span><strong>—</strong></div></div>
    </article>)}
   </div>
  </section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
