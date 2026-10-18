"use client";
import {useStoredIndex} from '../../components/use-stored-index';
import {ContentHelp} from '../content-help';
import {HelpText} from '../help-copy';


import {useMemo} from "react";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";
import {InflationMiniChart,type InflationMiniTrendPoint} from "../inflation/inflation-mini-chart";
import {CreditFavoriteButton,CreditFavoriteHeaderIcon} from "./credit-favorite-button";
import {creditReleaseInfo} from "./credit-release-calendar.mjs";
import "./credit-indicator-r2.css";
import "./credit-hero-typography-r1.css";
import "../shared-risk-indicator-width-r1.css";

type Indicator={id:string;name:string;status?:string;score:number|null;value:number|null;unit:string;observationDate:string|null;source:string;weight?:number;previousValue?:number|null;previousObservationDate?:string|null;trend?:InflationMiniTrendPoint[];nextReleaseDate?:string|null};
type Payload={status:string;score:number|null;asOfDate?:string|null;methodologyVersion?:string;core?:Indicator[];supplementals?:Indicator[];trend?:Array<{label:string;value:number}>;scoreComparisons?:{week?:number|null;month?:number|null;threeMonth?:number|null;sixMonth?:number|null;year?:number|null}};

const meta:Record<string,{label:string;content:string;criterion:string;help:string}>={
 hyCmdi:{label:"HY CMDI",content:"고위험 회사채 시장의 신용 스트레스",criterion:"지수 낮을수록 양호",help:"HY CMDI 원지수는 0에 가까울수록 스트레스가 낮습니다. ZGmini 점수는 이를 반대로 변환해 높을수록 양호하게 표시합니다."},
 igCmdi:{label:"IG CMDI",content:"투자등급 회사채 시장의 신용 스트레스",criterion:"지수 낮을수록 양호",help:"IG CMDI가 높아지면 투자등급 회사채 시장의 스트레스가 커진 것입니다. ZGmini 점수는 높을수록 양호합니다."},
 totalCmdi:{label:"Total CMDI",content:"회사채 시장 전체의 종합 스트레스",criterion:"지수 낮을수록 양호",help:"NY Fed Market CMDI를 사용합니다. 전체 회사채 시장의 스트레스가 낮을수록 신용 위험 방어에 긍정적입니다."},
 bondVolatility:{label:"채권 변동성",content:"미 국채 금리 전반의 20일 변동성",criterion:"변동성 낮을수록 양호",help:"국채시장 변동성이 커지면 회사채 가격발견과 자금조달 여건에도 부담이 될 수 있습니다. 정규화 점수가 높을수록 양호합니다."},
 nfciCredit:{label:"NFCI Credit",content:"시카고 연은의 신용여건 세부지수",criterion:"긴축 완화·낮은 지수",help:"NFCI Credit은 금융시장의 신용 긴축 정도를 보여줍니다. 현재 메인 신용 위험 산식에는 들어가지 않고 보조지표로 표시합니다."},
 bond2y:{label:"미국 2년물 변동성",content:"단기 국채금리의 20일 실현변동성",criterion:"낮을수록 양호",help:"단기 금리 급변은 자금조달 비용과 헤지 비용을 높일 수 있어 신용시장에 부담이 됩니다."},
 bond5y:{label:"미국 5년물 변동성",content:"중단기 국채금리의 20일 실현변동성",criterion:"낮을수록 양호",help:"5년물 변동성이 낮을수록 기업채권의 가격발견과 자금조달 환경이 안정적입니다."},
 bond10y:{label:"미국 10년물 변동성",content:"장기 기준금리의 20일 실현변동성",criterion:"낮을수록 양호",help:"10년물 변동성 급등은 장기 회사채 스프레드와 자금조달 불확실성을 키울 수 있습니다."},
 bond30y:{label:"미국 30년물 변동성",content:"초장기 국채금리의 20일 실현변동성",criterion:"낮을수록 양호",help:"초장기 금리의 큰 변동은 장기 듀레이션 자산과 회사채 시장의 스트레스를 키울 수 있습니다."},
};
const order=["hyCmdi","igCmdi","totalCmdi","bondVolatility","nfciCredit","bond2y","bond5y","bond10y","bond30y"] as const;
const dev=[
 ["HY OAS","하이일드 회사채의 국채 대비 스프레드","스프레드 축소","고위험 회사채의 직접적인 위험 프리미엄을 추가할 예정입니다."],
 ["IG OAS","투자등급 회사채의 국채 대비 스프레드","스프레드 축소","투자등급 기업의 조달 프리미엄을 추가할 예정입니다."],
 ["Corporate Default Rate","기업 부도율","낮을수록 양호","실제 기업 부도 발생률을 신용 위험 보조지표로 추가할 예정입니다."],
 ["CDX HY / IG","신용부도스왑 시장 위험 프리미엄","스프레드 축소","CDS 지수의 급등으로 시장이 가격에 반영하는 신용 위험을 추적할 예정입니다."],
 ["SLOOS 기업대출 기준","은행의 기업 대출 심사 강도","긴축 완화","은행의 기업대출 기준 강화 여부를 추가할 예정입니다."]
] as const;

function kstTodayKey(){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const get=(type:string)=>parts.find(part=>part.type===type)?.value??"";
 return `${get("year")}-${get("month")}-${get("day")}`;
}
function dateLabel(v?:string|null){if(!v)return "—";const d=new Date(v.length===10?v+"T00:00:00Z":v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeZone:"Asia/Seoul"}).format(d):v}
function stage(s:number|null|undefined){if(typeof s!=="number"||!Number.isFinite(s))return "확인 필요";if(s>=75)return "매우 양호";if(s>=60)return "양호";if(s>=45)return "중립";if(s>=25)return "신용 주의";return "신용 위험"}
function judge(s:number|null|undefined){if(typeof s!=="number"||!Number.isFinite(s))return {label:"확인 필요",tone:"neutral"};if(s>=60)return {label:"긍정",tone:"positive"};if(s>=45)return {label:"중립",tone:"neutral"};return {label:"부정",tone:"negative"}}
function fmt(row:Indicator|null|undefined){if(!row||typeof row.value!=="number"||!Number.isFinite(row.value))return "—";const a=Math.abs(row.value),digits=a>=1000?0:a>=100?1:a>=10?2:3;return row.value.toFixed(digits)+(row.unit?" "+row.unit:"")}
function fmtValue(value:number|null|undefined,unit?:string|null){if(typeof value!=="number"||!Number.isFinite(value))return "—";const abs=Math.abs(value),digits=abs>=1000?0:abs>=100?1:abs>=10?2:3;return value.toFixed(digits)+(unit?" "+unit:"");}
function HelpTip({label,text}:{label:string;text:string}){return <ContentHelp label={label+' 도움말'}><HelpText copy={{meaning:text,reading:'원자료의 단위와 기준선, 관측일을 함께 확인하세요. 원자료의 상승·하락과 시장 평가 점수의 상승·하락은 서로 다를 수 있습니다.',note:'자료가 없거나 개발 중인 항목은 숫자를 표시하지 않습니다. 「—」는 0이 아닙니다.'}}/></ContentHelp>;}

export default function CreditRiskPanel(){
 const {payload,loading}=useStoredIndex<Payload>('/api/credit-risk-detail');
 const score=typeof payload?.score==="number"&&Number.isFinite(payload.score)?payload.score:null;
 const trend=useMemo(()=>{
  // Only actual stored observations: retain the latest saved point per month.
  const points=(payload?.trend??[]).filter(p=>typeof p.label==="string"&&typeof p.value==="number"&&Number.isFinite(p.value)).sort((a,b)=>a.label.localeCompare(b.label));
  const byMonth=new Map<string,{label:string;value:number}>();
  for(const p of points)byMonth.set(p.label.slice(0,7),p);
  return [...byMonth.values()].slice(-13).map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint));
 },[payload?.trend]);
 const latest=trend.at(-1),latestPoint:MarketFearGreedChartValidPoint|null=latest?{date:latest.date,score:latest.score as number}:null;
 const axisLabels=new Map(trend.map(p=>[p.date,p.date.slice(5,7)])),axisTicks=trend.filter((_,i)=>i===0||i===trend.length-1||i%2===0).map(p=>p.date);
 const scoreComparisonItems=[
  {label:"1주",value:payload?.scoreComparisons?.week??null},
  {label:"1개월",value:payload?.scoreComparisons?.month??null},
  {label:"3개월",value:payload?.scoreComparisons?.threeMonth??null},
  {label:"6개월",value:payload?.scoreComparisons?.sixMonth??null},
  {label:"1년",value:payload?.scoreComparisons?.year??null},
 ];
 const indicators=new Map([...(payload?.core??[]),...(payload?.supplementals??[])].map(x=>[x.id,x]));
 const today=kstTodayKey();

 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell credit-risk-target-card" data-testid="credit-risk-detail-hero" data-market-state={loading?"loading":score===null?"unavailable":"ready"} aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI CREDIT RISK" title="미국 신용 위험" description="현재 개정 자료 기반 · 최초 발표 자료 아님" dateLabel="데이터 기준일" date={dateLabel(payload?.asOfDate)} source=""/></div>
   <div className="fg-content-slot">
    <div className="fg-score-slot"><MarketScoreOrb score={loading||score===null?"—":score.toFixed(1)} state={loading?"확인 중":stage(score)} variant="hero" comparisonItems={scoreComparisonItems} comparisonAriaLabel="신용 위험 방어점수 변화"/></div>
    <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart showExtrema data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey="stored-1y" gradientId="credit-risk-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"저장이력 없음"}/></div></div></MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>차트 원칙</span><strong>최근 1년 현재 개정 자료 계산 · 당시 예측 성과 아님</strong></div></div>
  </section>

  <section className="inflation-explainer" aria-labelledby="credit-what-title"><p className="cnn-eyebrow">WHAT IS CREDIT RISK?</p><h1 id="credit-what-title">신용 위험이란?</h1><p>신용 위험은 기업이나 차입자가 약속한 이자와 원금을 제때 갚지 못할 가능성과, 그 가능성을 시장이 더 비싸게 평가하는 정도를 뜻합니다. 회사채 스트레스, 금융여건, 금리 변동성이 함께 악화되면 기업의 자금조달 비용이 급격히 올라갈 수 있습니다.</p><div className="inflation-direction-strip"><span><b>위험 방향</b>CMDI↑ · 신용긴축↑ · 채권변동성↑ · 스프레드↑</span><span><b>안정 방향</b>CMDI↓ · 자금조달 안정 · 채권변동성↓</span></div></section>


<section className="inflation-indicator-section credit-r2-indicators" aria-labelledby="credit-indicator-title">
   <header><div><p className="cnn-eyebrow">CREDIT RISK INDICATORS</p><h2 id="credit-indicator-title">신용 위험 분석 지표</h2></div><p>회사채·신용여건·국채 변동성의 저장 관측값을 함께 봅니다. 판단 색깔은 저장된 평가 점수에 따라 <b>긍정 / 중립 / 부정</b>으로 표시해요.</p></header>
   <div className="inflation-table-wrap credit-r2-table-wrap"><table className="inflation-indicator-table credit-indicator-table-r2">
    <colgroup><col className="credit-col-favorite"/><col className="credit-col-name"/><col className="credit-col-content"/><col className="credit-col-criterion"/><col className="credit-col-previous"/><col className="credit-col-current"/><col className="credit-col-release"/><col className="credit-col-judgement"/><col className="credit-col-spark"/><col className="credit-col-help"/></colgroup>
    <thead><tr><th><CreditFavoriteHeaderIcon/><span className="sr-only">즐겨찾기</span></th><th>지표</th><th>내용</th><th>기준</th><th>이전</th><th>현재</th><th>발표</th><th>판단</th><th>미니차트(1Y)</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead>
    <tbody>
     {order.map(id=>{const row=indicators.get(id),m=meta[id],j=judge(row?.score),release=creditReleaseInfo(id,today,row?.nextReleaseDate);return <tr key={id} data-judgement={j.tone}>
      <td><CreditFavoriteButton id={id} label={m.label}/></td>
      <th scope="row"><strong>{m.label}</strong><small>{row?.unit||"관측지표"}</small></th>
      <td>{m.content}</td><td className="credit-r2-criterion">{m.criterion}</td>
      <td className="credit-r2-value"><strong>{fmtValue(row?.previousValue,row?.unit)}</strong><small>{dateLabel(row?.previousObservationDate)}</small></td>
      <td className="credit-r2-value"><strong>{fmt(row)}</strong><small>{dateLabel(row?.observationDate)}</small></td>
      <td className="credit-r2-release"><strong>{release.cadence}</strong><small>{release.text}</small></td>
      <td><span className="inflation-judgement">{j.label}</span></td>
      <td className="credit-r2-spark-cell"><InflationMiniChart label={m.label} points={row?.trend}/></td>
      <td><HelpTip label={m.label} text={m.help}/></td>
     </tr>})}
     {dev.map(item=><tr key={item[0]} data-development="true">
      <td><CreditFavoriteButton id={`development:${item[0]}`} label={item[0]}/></td>
      <th scope="row"><strong>{item[0]}</strong><small>개발중</small></th><td>{item[1]}</td><td>{item[2]}</td>
      <td>—</td><td>—</td><td>—</td><td><span className="inflation-judgement is-development">개발중</span></td>
      <td className="credit-r2-spark-cell">—</td><td><HelpTip label={item[0]} text={item[3]+" 현재 ZGmini 데이터 연결 개발 중입니다."}/></td>
     </tr>)}
    </tbody>
   </table></div>
   <div className="credit-r2-mobile-list">
    {order.map(id=>{const row=indicators.get(id),m=meta[id],j=judge(row?.score),release=creditReleaseInfo(id,today,row?.nextReleaseDate);return <article className="credit-r2-mobile-card" key={id} data-judgement={j.tone}>
     <div className="credit-r2-mobile-head"><div className="credit-r2-mobile-title"><CreditFavoriteButton id={id} label={m.label}/><div><strong>{m.label}</strong><small>{row?.unit||"관측지표"}</small></div></div><div className="credit-r2-mobile-actions"><span className="inflation-judgement">{j.label}</span><HelpTip label={m.label} text={m.help}/></div></div>
     <p className="credit-r2-mobile-content">{m.content}</p>
     <p className="credit-r2-mobile-criterion"><span>기준</span>{m.criterion}</p>
     <div className="credit-r2-mobile-spark"><span>미니차트(1Y)</span><InflationMiniChart label={m.label} points={row?.trend}/></div>
     <div className="credit-r2-mobile-metrics">
      <div><span>이전</span><strong>{fmtValue(row?.previousValue,row?.unit)}</strong><small>{dateLabel(row?.previousObservationDate)}</small></div>
      <div><span>현재</span><strong>{fmt(row)}</strong><small>{dateLabel(row?.observationDate)}</small></div>
      <div><span>발표</span><strong>{release.cadence}</strong><small>{release.text}</small></div>
     </div>
    </article>})}
    {dev.map(item=><article className="credit-r2-mobile-card is-development" key={item[0]}>
     <div className="credit-r2-mobile-head"><div className="credit-r2-mobile-title"><CreditFavoriteButton id={`development:${item[0]}`} label={item[0]}/><div><strong>{item[0]}</strong><small>개발중</small></div></div><div className="credit-r2-mobile-actions"><span className="inflation-judgement is-development">개발중</span><HelpTip label={item[0]} text={item[3]+" 현재 ZGmini 데이터 연결 개발 중입니다."}/></div></div>
     <p className="credit-r2-mobile-content">{item[1]}</p><p className="credit-r2-mobile-criterion"><span>기준</span>{item[2]}</p>
     <div className="credit-r2-mobile-metrics"><div><span>이전</span><strong>—</strong></div><div><span>현재</span><strong>—</strong></div><div><span>발표</span><strong>—</strong></div></div>
    </article>)}
   </div>
  </section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
