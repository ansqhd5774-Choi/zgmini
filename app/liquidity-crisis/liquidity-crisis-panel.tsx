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
import {LiquidityFavoriteButton,LiquidityFavoriteHeaderIcon} from "./liquidity-favorite-button";
import {liquidityReleaseInfo} from "./liquidity-release-calendar.mjs";
import "./liquidity-indicator-r2.css";
import "./liquidity-hero-typography-r1.css";
import "../shared-risk-indicator-width-r1.css";

type Indicator={id:string;name:string;status:string;score:number|null;value:number|null;unit:string;observationDate:string|null;source:string;previousValue?:number|null;previousObservationDate?:string|null;trend?:InflationMiniTrendPoint[];nextReleaseDate?:string|null};
type Payload={status:string;score:number|null;asOfDate?:string|null;methodologyVersion?:string;indicators?:Indicator[];trend?:Array<{label:string;value:number}>;scoreComparisons?:{week?:number|null;month?:number|null;threeMonth?:number|null;sixMonth?:number|null;year?:number|null}};

const meta:Record<string,{label:string;content:string;criterion:string;help:string}>={
 sofrIorb:{label:"SOFR−IORB 스프레드",content:"담보부 익일자금 금리와 연준 지급금리의 차이",criterion:"0bp 근처",help:"SOFR가 IORB보다 크게 높아지면 단기자금 조달이 빡빡해졌다는 신호가 될 수 있습니다. 0bp 근처가 안정적입니다."},
 obfrIorb:{label:"OBFR−IORB 스프레드",content:"은행 익일자금 금리와 IORB의 차이",criterion:"0bp 근처",help:"은행 간 단기자금 금리가 IORB보다 크게 올라가면 자금시장 스트레스가 커진 것으로 봅니다."},
 repoGap:{label:"DVP−Tri-Party Repo 격차",content:"두 주요 Repo 시장 금리의 괴리",criterion:"낮을수록 양호",help:"Repo 시장 간 금리 괴리가 커지면 시장 분절과 담보·자금 수급 불균형 가능성이 커집니다."},
 sofrIorbRv20:{label:"SOFR−IORB 20일 변동성",content:"단기자금 스프레드의 최근 불안정성",criterion:"낮을수록 양호",help:"스프레드가 크게 흔들릴수록 단기자금시장의 불안정성이 높다는 뜻입니다."},
 bankEmergency:{label:"은행 비상대출 비율",content:"연준 비상대출이 은행자산에서 차지하는 비중",criterion:"0% 근처",help:"비상대출 의존도가 높아지면 은행권 유동성 스트레스를 의미할 수 있습니다."},
 bankReserves:{label:"은행 준비금",content:"은행 시스템이 보유한 연준 준비금 규모",criterion:"준비금 여유 유지",help:"은행 준비금이 역사적 분포에서 충분한 수준일수록 결제·자금조달 완충력이 큽니다."},
 tga:{label:"TGA 4주 변화",content:"미 재무부 일반계정의 4주 유동성 흡수 변화",criterion:"증가 압력 낮을수록",help:"TGA가 빠르게 증가하면 민간 금융시장에서 유동성을 흡수할 수 있습니다."},
 onRrp:{label:"ON RRP 20영업일 변화",content:"연준 역레포에 묶이는 자금의 최근 변화",criterion:"증가 압력 낮을수록",help:"ON RRP 잔액 증가가 빠르면 시중 유동성이 연준으로 이동하는 효과가 있습니다."},
 m2:{label:"M2 YoY",content:"광의 통화량의 전년 대비 증가율",criterion:"통화량 증가세 유지",help:"통화량 증가가 너무 약하면 금융여건이 경색될 수 있습니다."},
 bond2y:{label:"미국 2년물 변동성",content:"단기 국채금리의 20일 실현변동성",criterion:"낮을수록 양호",help:"2년물 변동성 상승은 정책금리 기대와 단기 금융여건의 불확실성을 높입니다."},
 bond5y:{label:"미국 5년물 변동성",content:"중단기 국채금리의 20일 실현변동성",criterion:"낮을수록 양호",help:"5년물 변동성 상승은 금리 기대와 채권시장 유동성 불안을 반영할 수 있습니다."},
 bond10y:{label:"미국 10년물 변동성",content:"장기 기준금리의 20일 실현변동성",criterion:"낮을수록 양호",help:"10년물 금리 변동성이 높아지면 담보·헤지·자금조달 시장 전반의 부담이 커질 수 있습니다."},
 bond30y:{label:"미국 30년물 변동성",content:"초장기 국채금리의 20일 실현변동성",criterion:"낮을수록 양호",help:"30년물의 급격한 변동은 장기채 시장의 유동성 스트레스를 보여줄 수 있습니다."}
};
const order=["sofrIorb","obfrIorb","repoGap","sofrIorbRv20","bankEmergency","bankReserves","tga","onRrp","m2","bond2y","bond5y","bond10y","bond30y"] as const;
const dev=[
 ["NFCI Funding Risk","금융시장의 자금조달 여건","스트레스 완화","자금조달 스트레스에 초점을 둔 세부지표를 추가할 예정입니다."],
 ["Commercial Paper Spread","기업 단기자금 조달 프리미엄","스프레드 축소","기업어음 금리가 안전자산 대비 급등하면 단기자금 경색을 의미할 수 있습니다."],
 ["Cross-currency Basis","달러 조달의 해외시장 스트레스","0에 근접","글로벌 달러 조달 프리미엄을 확인할 예정입니다."],
 ["MMF 자금흐름","머니마켓펀드의 현금 이동","급격한 이탈 없음","단기자금이 급격히 이동하는지 확인할 예정입니다."],
 ["Primary Dealer Financing","프라이머리딜러의 자금중개 여력","안정","국채·Repo 시장의 핵심 중개기관 여력을 확인할 예정입니다."]
] as const;

function kstTodayKey(){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const get=(type:string)=>parts.find(part=>part.type===type)?.value??"";
 return `${get("year")}-${get("month")}-${get("day")}`;
}
function dateLabel(v?:string|null){if(!v)return "—";const d=new Date(v.length===10?v+"T00:00:00Z":v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeZone:"Asia/Seoul"}).format(d):v}
function stage(s:number|null|undefined){if(typeof s!=="number"||!Number.isFinite(s))return "확인 필요";if(s>=75)return "매우 양호";if(s>=60)return "양호";if(s>=45)return "중립";if(s>=25)return "유동성 주의";return "위기 위험"}
function judge(s:number|null|undefined){if(typeof s!=="number"||!Number.isFinite(s))return {label:"확인 필요",tone:"neutral"};if(s>=60)return {label:"긍정",tone:"positive"};if(s>=45)return {label:"중립",tone:"neutral"};return {label:"부정",tone:"negative"}}
function fmt(row:Indicator|null|undefined){if(!row||typeof row.value!=="number"||!Number.isFinite(row.value))return "—";const a=Math.abs(row.value),digits=a>=1000?0:a>=100?1:a>=10?2:3;return row.value.toFixed(digits)+(row.unit?" "+row.unit:"")}
function fmtValue(value:number|null|undefined,unit?:string|null){if(typeof value!=="number"||!Number.isFinite(value))return "—";const abs=Math.abs(value),digits=abs>=1000?0:abs>=100?1:abs>=10?2:3;return value.toFixed(digits)+(unit?" "+unit:"");}
function HelpTip({label,text}:{label:string;text:string}){return <ContentHelp label={label+' 도움말'}><HelpText copy={{meaning:text,reading:'원자료의 단위와 기준선, 관측일을 함께 확인하세요. 원자료의 상승·하락과 시장 평가 점수의 상승·하락은 서로 다를 수 있습니다.',note:'자료가 없거나 개발 중인 항목은 숫자를 표시하지 않습니다. 「—」는 0이 아닙니다.'}}/></ContentHelp>;}

export default function LiquidityCrisisPanel(){
 const {payload,loading}=useStoredIndex<Payload>('/api/liquidity-crisis-detail');
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
 const indicators=new Map((payload?.indicators??[]).map(x=>[x.id,x]));
 const today=kstTodayKey();

 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell liquidity-crisis-target-card" data-testid="liquidity-crisis-detail-hero" data-market-state={loading?"loading":score===null?"unavailable":"ready"} aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI LIQUIDITY CRISIS" title="미국 유동성 위기" description="저장 점수 이력 · 누락 구간 보간 없음" dateLabel="데이터 기준일" date={dateLabel(payload?.asOfDate)} source=""/></div>
   <div className="fg-content-slot">
    <div className="fg-score-slot"><MarketScoreOrb score={loading||score===null?"—":score.toFixed(1)} state={loading?"확인 중":stage(score)} variant="hero" comparisonItems={scoreComparisonItems} comparisonAriaLabel="유동성 위기 방어점수 변화"/></div>
    <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart showExtrema data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey="stored-1y" gradientId="liquidity-crisis-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"저장이력 없음"}/></div></div></MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>차트 원칙</span><strong>최근 1년 창 · 실제 저장점수만 표시 · 임의 보간 없음</strong></div></div>
  </section>

  <section className="inflation-explainer" aria-labelledby="liquidity-what-title">
   <p className="cnn-eyebrow">WHAT IS A LIQUIDITY CRISIS?</p><h1 id="liquidity-what-title">유동성 위기란?</h1>
   <p>유동성 위기는 금융기관과 시장참가자가 필요한 현금을 제때 조달하기 어려워지는 상태입니다. 자산가치가 충분해도 단기자금시장, Repo, 은행 준비금, 통화량, 국채시장 등이 동시에 경색되면 거래와 신용공급이 급격히 위축될 수 있습니다.</p>
   <div className="inflation-direction-strip"><span><b>위기 방향</b>자금금리 괴리↑ · 비상대출↑ · 준비금↓ · 채권변동성↑</span><span><b>안정 방향</b>단기자금 안정 · 충분한 준비금 · 통화량 안정 · 채권변동성↓</span></div>
  </section>


  <section className="inflation-indicator-section liquidity-r2-indicators" aria-labelledby="liquidity-indicator-title">
   <header><div><p className="cnn-eyebrow">LIQUIDITY CRISIS INDICATORS</p><h2 id="liquidity-indicator-title">유동성 위기 분석 지표</h2></div><p>단기자금·은행 준비금·채권시장의 저장 관측값을 함께 봅니다. 판단 색깔은 저장된 평가 점수에 따라 <b>긍정 / 중립 / 부정</b>으로 표시해요.</p></header>
   <div className="inflation-table-wrap liquidity-r2-table-wrap"><table className="inflation-indicator-table liquidity-indicator-table-r2">
    <colgroup><col className="liquidity-col-favorite"/><col className="liquidity-col-name"/><col className="liquidity-col-content"/><col className="liquidity-col-criterion"/><col className="liquidity-col-previous"/><col className="liquidity-col-current"/><col className="liquidity-col-release"/><col className="liquidity-col-judgement"/><col className="liquidity-col-spark"/><col className="liquidity-col-help"/></colgroup>
    <thead><tr><th><LiquidityFavoriteHeaderIcon/><span className="sr-only">즐겨찾기</span></th><th>지표</th><th>내용</th><th>기준</th><th>이전</th><th>현재</th><th>발표</th><th>판단</th><th>미니차트(1Y)</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead>
    <tbody>
     {order.map(id=>{const row=indicators.get(id),m=meta[id],j=judge(row?.score),release=liquidityReleaseInfo(id,today,row?.nextReleaseDate);return <tr key={id} data-judgement={j.tone}>
      <td><LiquidityFavoriteButton id={id} label={m.label}/></td>
      <th scope="row"><strong>{m.label}</strong><small>{row?.unit||"관측지표"}</small></th>
      <td>{m.content}</td><td className="liquidity-r2-criterion">{m.criterion}</td>
      <td className="liquidity-r2-value"><strong>{fmtValue(row?.previousValue,row?.unit)}</strong><small>{dateLabel(row?.previousObservationDate)}</small></td>
      <td className="liquidity-r2-value"><strong>{fmt(row)}</strong><small>{dateLabel(row?.observationDate)}</small></td>
      <td className="liquidity-r2-release"><strong>{release.cadence}</strong><small>{release.text}</small></td>
      <td><span className="inflation-judgement">{j.label}</span></td>
      <td className="liquidity-r2-spark-cell"><InflationMiniChart label={m.label} points={row?.trend}/></td>
      <td><HelpTip label={m.label} text={m.help}/></td>
     </tr>})}
     {dev.map(item=><tr key={item[0]} data-development="true">
      <td><LiquidityFavoriteButton id={`development:${item[0]}`} label={item[0]}/></td>
      <th scope="row"><strong>{item[0]}</strong><small>개발중</small></th><td>{item[1]}</td><td>{item[2]}</td>
      <td>—</td><td>—</td><td>—</td><td><span className="inflation-judgement is-development">개발중</span></td>
      <td className="liquidity-r2-spark-cell">—</td><td><HelpTip label={item[0]} text={item[3]+" 현재 ZGmini 데이터 연결 개발 중입니다."}/></td>
     </tr>)}
    </tbody>
   </table></div>
   <div className="liquidity-r2-mobile-list">
    {order.map(id=>{const row=indicators.get(id),m=meta[id],j=judge(row?.score),release=liquidityReleaseInfo(id,today,row?.nextReleaseDate);return <article className="liquidity-r2-mobile-card" key={id} data-judgement={j.tone}>
     <div className="liquidity-r2-mobile-head"><div className="liquidity-r2-mobile-title"><LiquidityFavoriteButton id={id} label={m.label}/><div><strong>{m.label}</strong><small>{row?.unit||"관측지표"}</small></div></div><div className="liquidity-r2-mobile-actions"><span className="inflation-judgement">{j.label}</span><HelpTip label={m.label} text={m.help}/></div></div>
     <p className="liquidity-r2-mobile-content">{m.content}</p>
     <p className="liquidity-r2-mobile-criterion"><span>기준</span>{m.criterion}</p>
     <div className="liquidity-r2-mobile-spark"><span>미니차트(1Y)</span><InflationMiniChart label={m.label} points={row?.trend}/></div>
     <div className="liquidity-r2-mobile-metrics">
      <div><span>이전</span><strong>{fmtValue(row?.previousValue,row?.unit)}</strong><small>{dateLabel(row?.previousObservationDate)}</small></div>
      <div><span>현재</span><strong>{fmt(row)}</strong><small>{dateLabel(row?.observationDate)}</small></div>
      <div><span>발표</span><strong>{release.cadence}</strong><small>{release.text}</small></div>
     </div>
    </article>})}
    {dev.map(item=><article className="liquidity-r2-mobile-card is-development" key={item[0]}>
     <div className="liquidity-r2-mobile-head"><div className="liquidity-r2-mobile-title"><LiquidityFavoriteButton id={`development:${item[0]}`} label={item[0]}/><div><strong>{item[0]}</strong><small>개발중</small></div></div><div className="liquidity-r2-mobile-actions"><span className="inflation-judgement is-development">개발중</span><HelpTip label={item[0]} text={item[3]+" 현재 ZGmini 데이터 연결 개발 중입니다."}/></div></div>
     <p className="liquidity-r2-mobile-content">{item[1]}</p><p className="liquidity-r2-mobile-criterion"><span>기준</span>{item[2]}</p>
     <div className="liquidity-r2-mobile-metrics"><div><span>이전</span><strong>—</strong></div><div><span>현재</span><strong>—</strong></div><div><span>발표</span><strong>—</strong></div></div>
    </article>)}
   </div>
  </section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
