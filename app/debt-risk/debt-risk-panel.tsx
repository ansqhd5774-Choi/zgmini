"use client";
import {useStoredIndex} from '../../components/use-stored-index';
import {ContentHelp} from '../content-help';
import {HelpText} from '../help-copy';


import {useMemo} from "react";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";
import {InflationMiniChart} from "../inflation/inflation-mini-chart";
import {DebtFavoriteButton,DebtFavoriteHeaderIcon} from "./debt-favorite-button";
import "./debt-indicator-r2.css";
import "../risk-last3-hero-parity-r2.css";
import "../shared-risk-indicator-width-r1.css";

type Row={id:string;name:string;status:string;score:number|null;value:number|null;unit:string;observationDate:string|null;source:string;weight:number;previousValue?:number|null;previousObservationDate?:string|null;trend?:Array<{date:string;value:number}>;nextReleaseDate?:string|null};
type Payload={status:string;score:number|null;asOfDate?:string|null;methodologyVersion?:string;missingFactors?:string[];indicators?:Row[];trend?:Array<{label:string;value:number}>;scoreComparisons?:{week?:number|null;month?:number|null;threeMonth?:number|null;sixMonth?:number|null;year?:number|null}};
const meta:Record<string,{label:string;content:string;criterion:string;help:string}>={
 dsr:{label:"Debt Service Ratio",content:"가계·기업이 소득에서 원리금 상환에 쓰는 부담",criterion:"낮을수록 양호",help:"DSR이 높아지면 소득 대비 부채 상환 부담이 커집니다. BIS 장기분포에서 낮을수록 안전점수가 높습니다."},
 debtGdp:{label:"민간부채/GDP",content:"민간 비금융부문 부채의 경제 규모 대비 수준",criterion:"장기분포 대비 낮을수록 양호",help:"부채가 GDP보다 빠르게 누적될수록 경기 충격과 금리 상승에 취약해질 수 있습니다."},
 rateBurden:{label:"금리부담",content:"기업 총부가가치 대비 순이자 비용",criterion:"낮을수록 양호",help:"기업이 생산한 부가가치 중 이자비용 비중이 커질수록 재무 부담이 높아집니다."},
 creditStress:{label:"신용스트레스",content:"부채시장 전반의 신용 경색 정도",criterion:"낮은 스트레스",help:"저장된 입력이 연결되지 않은 경우 점수를 임의 생성하지 않습니다."},
 debtServiceCapacity:{label:"부채상환능력",content:"이익이 이자비용을 얼마나 충분히 감당하는지 측정",criterion:"높고 개선될수록 양호",help:"세전이익/순이자비용 수준과 4분기 변화의 점수를 50:50으로 결합합니다."},
};
const order=["dsr","debtGdp","rateBurden","creditStress","debtServiceCapacity"] as const;
const dev=[
 ["가계 연체율","가계대출의 실제 상환 부실 정도","낮을수록 양호","가계 부채의 실제 부실 진행 여부를 추가할 예정입니다."],
 ["기업 부도율","기업채권·대출의 실제 부도 발생률","낮을수록 양호","기업 부채의 실현 신용손실을 추가할 예정입니다."],
 ["Refinancing Wall","향후 만기 도래 부채 집중도","분산될수록 양호","고금리 환경에서 대규모 차환이 몰리는 위험을 추가할 예정입니다."],
 ["Interest Coverage Breadth","이자보상배율 취약기업 비율","취약기업 감소","평균값 외에 상환 취약 기업이 시장에 얼마나 넓게 분포하는지 추가할 예정입니다."],
] as const;

function dateLabel(v?:string|null){if(!v)return "—";const d=new Date(v.length===10?v+"T00:00:00Z":v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeZone:"Asia/Seoul"}).format(d):v}
function stage(s:number|null|undefined){if(typeof s!=="number"||!Number.isFinite(s))return "데이터 준비 중";if(s>=75)return "매우 양호";if(s>=60)return "양호";if(s>=45)return "중립";if(s>=25)return "부채 주의";return "부채 위험"}
function judge(s:number|null|undefined,status?:string){if(status!=="READY"||typeof s!=="number"||!Number.isFinite(s))return {label:"데이터 준비 중",tone:"neutral"};if(s>=60)return {label:"긍정",tone:"positive"};if(s>=45)return {label:"중립",tone:"neutral"};return {label:"부정",tone:"negative"}}
function fmt(r:Row|null|undefined){if(!r||typeof r.value!=="number"||!Number.isFinite(r.value))return "—";const n=Math.abs(r.value)>=100?1:3;return r.value.toFixed(n)+(r.unit?" "+r.unit:"")}
function fmtValue(value:number|null|undefined,unit?:string|null){if(typeof value!=="number"||!Number.isFinite(value))return "—";const n=Math.abs(value)>=100?1:3;return value.toFixed(n)+(unit?" "+unit:"")}
function releaseLabel(value?:string|null){return value&&Number.isFinite(Date.parse(value))?dateLabel(value):"—"}
function HelpTip({label,text}:{label:string;text:string}){return <ContentHelp label={label+' 도움말'}><HelpText copy={{meaning:text,reading:'원자료의 단위와 기준선, 관측일을 함께 확인하세요. 원자료의 상승·하락과 시장 평가 점수의 상승·하락은 서로 다를 수 있습니다.',note:'자료가 없거나 개발 중인 항목은 숫자를 표시하지 않습니다. 「—」는 0이 아닙니다.'}}/></ContentHelp>;}

export default function DebtRiskPanel(){
 const {payload,loading}=useStoredIndex<Payload>('/api/debt-risk-detail');
 const score=typeof payload?.score==="number"&&Number.isFinite(payload.score)?payload.score:null;
 const trend=useMemo(()=>(payload?.trend??[]).filter(p=>typeof p.value==="number"&&Number.isFinite(p.value)).map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint)),[payload?.trend]);
 const latest=trend.at(-1),latestPoint:MarketFearGreedChartValidPoint|null=latest?{date:latest.date,score:latest.score as number}:null;
 const axisTicks=trend.map(p=>p.date),axisLabels=new Map(trend.map(p=>[p.date,p.date.slice(2,7).replace("-","/")]));
 const scoreComparisonItems=[
  {label:"1주",value:payload?.scoreComparisons?.week??null},
  {label:"1개월",value:payload?.scoreComparisons?.month??null},
  {label:"3개월",value:payload?.scoreComparisons?.threeMonth??null},
  {label:"6개월",value:payload?.scoreComparisons?.sixMonth??null},
  {label:"1년",value:payload?.scoreComparisons?.year??null},
 ];
 const rows=new Map((payload?.indicators??[]).map(x=>[x.id,x]));
 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell debt-risk-target-card" data-testid="debt-risk-detail-hero" data-market-state={loading?"loading":score===null?"unavailable":"ready"} aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI DEBT RISK R7" title="미국 부채 위험" description="저장된 현재 개정 자료 기반" dateLabel="데이터 기준일" date={dateLabel(payload?.asOfDate)} source={payload?.methodologyVersion??"DEBT_RISK_R7"}/></div>
   <div className="fg-content-slot"><div className="fg-score-slot"><MarketScoreOrb score={loading||score===null?"—":score.toFixed(1)} state={loading?"확인 중":stage(score)} variant="hero" comparisonItems={scoreComparisonItems} comparisonAriaLabel="부채 위험 안전점수 변화"/></div>
    <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart showExtrema data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey="debt-risk" gradientId="debt-risk-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"완성 점수 저장이력 없음"}/></div></div></MarketTrendFrame></div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>점수 원칙</span><strong>5개 구성요소 완전 입력 시만 계산 · 결측 재가중 없음</strong></div></div>
  </section>
  <section className="inflation-explainer" aria-labelledby="debt-risk-what-title"><p className="cnn-eyebrow">WHAT IS DEBT RISK?</p><h1 id="debt-risk-what-title">부채 위험이란?</h1><p>부채 위험은 가계와 기업이 쌓아온 부채가 소득과 이익에 비해 과도해져 금리 상승이나 경기 둔화 때 원리금 상환이 어려워질 가능성을 뜻합니다. 부채 규모만이 아니라 실제 상환 부담, 이자비용, 신용시장 스트레스, 이익 대비 상환능력을 함께 봐야 합니다.</p><div className="inflation-direction-strip"><span><b>위험 방향</b>DSR↑ · 부채/GDP↑ · 금리부담↑ · 신용스트레스↑</span><span><b>안정 방향</b>상환부담↓ · 이익 대비 이자여력↑ · 신용여건 안정</span></div></section>
  <section className="inflation-indicator-section debt-r2-indicators" aria-labelledby="debt-risk-indicator-title"><header><div><p className="cnn-eyebrow">DEBT RISK INDICATORS</p><h2 id="debt-risk-indicator-title">부채 위험 분석 지표</h2></div><p>실제 저장값만 표시하며, 이전 값·발표일·1년 미니차트에 자료가 없으면 <b>—</b>로 나타냅니다. 결측은 0이 아닙니다.</p></header>
   <div className="inflation-table-wrap debt-r2-table-wrap"><table className="inflation-indicator-table debt-indicator-table-r2">
    <colgroup><col className="debt-col-favorite"/><col className="debt-col-name"/><col className="debt-col-content"/><col className="debt-col-criterion"/><col className="debt-col-previous"/><col className="debt-col-current"/><col className="debt-col-release"/><col className="debt-col-judgement"/><col className="debt-col-spark"/><col className="debt-col-help"/></colgroup>
    <thead><tr><th><DebtFavoriteHeaderIcon/><span className="sr-only">즐겨찾기</span></th><th>지표</th><th>내용</th><th>기준</th><th>이전</th><th>현재</th><th>발표</th><th>판단</th><th>미니차트(1Y)</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead>
    <tbody>
     {order.map(id=>{const row=rows.get(id),m=meta[id],j=judge(row?.score,row?.status);return <tr key={id} data-judgement={j.tone}>
      <td><DebtFavoriteButton id={id} label={m.label}/></td>
      <th scope="row"><strong>{m.label}</strong><small>{row?.status==="READY"?"저장 데이터":"자료 확인 중"}</small></th>
      <td>{m.content}</td><td className="debt-r2-criterion">{m.criterion}</td>
      <td className="debt-r2-value"><strong>{fmtValue(row?.previousValue,row?.unit)}</strong><small>{dateLabel(row?.previousObservationDate)}</small></td>
      <td className="debt-r2-value"><strong>{fmt(row)}</strong><small>{dateLabel(row?.observationDate)}</small></td>
      <td className="debt-r2-release"><strong>{releaseLabel(row?.nextReleaseDate)}</strong><small>확인된 일정만</small></td>
      <td><span className="inflation-judgement">{j.label}</span></td>
      <td className="debt-r2-spark-cell"><InflationMiniChart label={m.label} points={row?.trend}/></td>
      <td><HelpTip label={m.label} text={m.help}/></td>
     </tr>})}
     {dev.map(item=><tr key={item[0]} data-development="true">
      <td><DebtFavoriteButton id={`development:${item[0]}`} label={item[0]}/></td>
      <th scope="row"><strong>{item[0]}</strong><small>개발중</small></th><td>{item[1]}</td><td>{item[2]}</td>
      <td>—</td><td>—</td><td>—</td><td><span className="inflation-judgement is-development">개발중</span></td>
      <td className="debt-r2-spark-cell">—</td><td><HelpTip label={item[0]} text={item[3]+" 현재 ZGmini 데이터 연결 개발 중입니다."}/></td>
     </tr>)}
    </tbody>
   </table></div>
   <div className="debt-r2-mobile-list">
    {order.map(id=>{const row=rows.get(id),m=meta[id],j=judge(row?.score,row?.status);return <article className="debt-r2-mobile-card" key={id} data-judgement={j.tone}>
     <div className="debt-r2-mobile-head"><div className="debt-r2-mobile-title"><DebtFavoriteButton id={id} label={m.label}/><div><strong>{m.label}</strong><small>{row?.status==="READY"?"저장 데이터":"자료 확인 중"}</small></div></div><div className="debt-r2-mobile-actions"><span className="inflation-judgement">{j.label}</span><HelpTip label={m.label} text={m.help}/></div></div>
     <p className="debt-r2-mobile-content">{m.content}</p>
     <p className="debt-r2-mobile-criterion"><span>기준</span>{m.criterion}</p>
     <div className="debt-r2-mobile-spark"><span>미니차트(1Y)</span><InflationMiniChart label={m.label} points={row?.trend}/></div>
     <div className="debt-r2-mobile-metrics">
      <div><span>이전</span><strong>{fmtValue(row?.previousValue,row?.unit)}</strong><small>{dateLabel(row?.previousObservationDate)}</small></div>
      <div><span>현재</span><strong>{fmt(row)}</strong><small>{dateLabel(row?.observationDate)}</small></div>
      <div><span>발표</span><strong>{releaseLabel(row?.nextReleaseDate)}</strong><small>확인된 일정만</small></div>
     </div>
    </article>})}
    {dev.map(item=><article className="debt-r2-mobile-card is-development" key={item[0]}>
     <div className="debt-r2-mobile-head"><div className="debt-r2-mobile-title"><DebtFavoriteButton id={`development:${item[0]}`} label={item[0]}/><div><strong>{item[0]}</strong><small>개발중</small></div></div><div className="debt-r2-mobile-actions"><span className="inflation-judgement is-development">개발중</span><HelpTip label={item[0]} text={item[3]+" 현재 ZGmini 데이터 연결 개발 중입니다."}/></div></div>
     <p className="debt-r2-mobile-content">{item[1]}</p><p className="debt-r2-mobile-criterion"><span>기준</span>{item[2]}</p>
     <div className="debt-r2-mobile-metrics"><div><span>이전</span><strong>—</strong></div><div><span>현재</span><strong>—</strong></div><div><span>발표</span><strong>—</strong></div></div>
    </article>)}
   </div></section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
