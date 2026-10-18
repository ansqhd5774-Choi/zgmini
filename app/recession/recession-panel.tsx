"use client";
import {useStoredIndex} from '../../components/use-stored-index';
import {ContentHelp} from '../content-help';
import {HelpText} from '../help-copy';
import {useMemo} from "react";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";
import "./recession-indicator-r2.css";
import "./recession-hero-parity-r2.css";
import {RecessionFavoriteButton,RecessionFavoriteHeaderIcon} from "./recession-favorite-button";
import {InflationMiniChart,type InflationMiniTrendPoint} from "../inflation/inflation-mini-chart";

type ComponentRow={id:string;value:number|null;score:number|null;observationDate:string|null;weight:number;previousValue?:number|null;previousObservationDate?:string|null;trend?:InflationMiniTrendPoint[];nextReleaseDate?:string|null};
type SupplementalRow={id:string;name:string|null;status:string;score:number|null;value:number|null;displayValue:string|null;unit:string|null;observationDate:string|null;source:string|null;previousValue?:number|null;previousObservationDate?:string|null;trend?:InflationMiniTrendPoint[];nextReleaseDate?:string|null};
type Payload={
 status:string;score:number|null;asOfDate?:string|null;methodologyVersion?:string;historyMode?:string;lookAheadSafe?:boolean;
 trend?:Array<{label:string;value:number}>;components?:ComponentRow[];supplementals?:SupplementalRow[];
};

const componentMeta:Record<string,{label:string;content:string;unit:string;criterion:string;help:string;cadence:string}>={
 nfp:{label:"비농업고용",content:"고용자 수의 최근 3개월 성장 속도",unit:"%",criterion:"정규화 60점↑",cadence:"월간",help:"고용 성장률이 장기 분포에서 높을수록 경기 방어에 긍정적입니다. 지속적인 고용 감소는 침체 위험을 높입니다."},
 realGdp:{label:"실질 GDP",content:"물가효과를 제거한 경제 전체 생산",unit:"%",criterion:"정규화 60점↑",cadence:"분기",help:"2개 분기의 실질 GDP 성장 속도를 봅니다. 장기 분포보다 강하면 긍정적이고 수축하면 부정적입니다."},
 industrialProduction:{label:"산업생산",content:"광공업·제조업 생산 활동",unit:"%",criterion:"정규화 60점↑",cadence:"월간",help:"최근 3개월 생산 속도가 장기 분포에서 높을수록 긍정적입니다. 생산 감소가 이어지면 침체 신호로 봅니다."},
 realPce:{label:"실질 PCE",content:"물가효과를 제거한 개인소비지출",unit:"%",criterion:"정규화 60점↑",cadence:"월간",help:"미국 경제의 핵심인 소비가 실제 구매력 기준으로 증가하는지 봅니다. 실질 소비 둔화·감소는 부정적입니다."},
 sahmGap:{label:"Sahm Gap",content:"실업률 급등 여부를 보는 침체 경보",unit:"%p",criterion:"0.50%p 미만",cadence:"월간",help:"3개월 평균 실업률이 최근 12개월 최저점보다 0.50%p 이상 높아지면 Sahm Rule 침체 신호로 알려져 있습니다. 낮을수록 안전합니다."},
 retailSales:{label:"실질 소매판매",content:"물가를 제거한 가계 상품소비",unit:"%",criterion:"정규화 60점↑",cadence:"월간",help:"최근 실질 소매판매 성장률이 장기 분포에서 높을수록 경기 방어에 긍정적입니다."},
 disposableIncome:{label:"실질 가처분소득",content:"가계가 실제로 쓸 수 있는 소득",unit:"%",criterion:"정규화 60점↑",cadence:"월간",help:"세후·물가조정 소득이 증가하면 소비 지속력이 높아집니다. 둔화나 감소는 경기 방어력을 약화시킵니다."},
};

const supplementalMeta:Record<string,{label:string;content:string;criterion:string;help:string;cadence:string}>={
 initialClaims:{label:"신규 실업수당 4W",content:"해고 증가를 빠르게 포착하는 고용 선행지표",criterion:"정규화 60점↑",cadence:"주간",help:"청구건수가 낮고 안정적일수록 긍정적입니다. ZGmini의 저장 이력 정규화 점수 60점 이상을 양호 기준으로 봅니다."},
 yieldCurve:{label:"장단기 금리차",content:"금리곡선이 보내는 경기 선행 신호",criterion:"정규화 60점↑",cadence:"거래일",help:"금리곡선은 단순 양·음만으로 판단하지 않고 ZGmini 금리환경 정규화 점수로 봅니다. 낮은 점수는 경기 선행 신호가 불리한 상태를 의미합니다."},
 hyCreditStress:{label:"HY 신용 스트레스",content:"고위험 회사채 시장의 자금경색 정도",criterion:"정규화 60점↑",cadence:"비정기",help:"하이일드 시장 스트레스가 낮을수록 기업 자금조달 환경이 양호합니다. 정규화 점수가 높을수록 긍정적입니다."},
 creditConditions:{label:"신용여건",content:"금융시장의 전반적인 신용 긴축 정도",criterion:"정규화 60점↑",cadence:"주간",help:"신용이 급격히 긴축되면 기업과 가계 활동이 위축될 수 있습니다. 정규화 점수가 높을수록 경기 방어에 유리합니다."},
};

const developmentCandidates=[
 {label:"Conference Board LEI",content:"대표 경기선행지수",criterion:"6개월 추세 개선",help:"여러 선행지표를 묶어 경기 전환점을 추적하는 지수입니다."},
 {label:"ISM 제조업 신규주문",content:"기업 신규수요의 선행 흐름",criterion:"50 이상·상승",help:"50 이상은 대체로 확장 방향이며 신규주문 둔화는 생산 약화의 선행 신호가 될 수 있습니다."},
 {label:"주택착공·건축허가",content:"금리 민감도가 높은 주택 경기",criterion:"추세 개선",help:"주택 착공과 허가는 경기와 금리에 민감해 선행성이 높은 지표로 활용됩니다."},
 {label:"SLOOS 대출태도",content:"은행의 기업·가계 대출기준",criterion:"긴축 완화",help:"은행 대출기준이 빠르게 강화되면 신용공급이 줄어 경기침체 위험을 높일 수 있습니다."},
 {label:"소비자신뢰",content:"가계의 경기·소득 기대",criterion:"추세 개선",help:"소비자 기대가 급격히 악화되면 소비 둔화로 연결될 수 있어 보조 침체지표로 활용합니다."},
];

function dateLabel(value?:string|null){
 if(!value)return "—";
 const d=new Date(value.length===10?value+"T00:00:00Z":value);
 return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeZone:"Asia/Seoul"}).format(d):value;
}
function stage(score:number|null|undefined){
 if(typeof score!=="number"||!Number.isFinite(score))return "확인 필요";
 if(score>=75)return "매우 양호";
 if(score>=60)return "양호";
 if(score>=45)return "중립";
 if(score>=25)return "침체 주의";
 return "침체 위험";
}
function judgement(score:number|null|undefined){
 if(typeof score!=="number"||!Number.isFinite(score))return {label:"확인 필요",tone:"neutral"};
 if(score>=60)return {label:"긍정",tone:"positive"};
 if(score>=45)return {label:"중립",tone:"neutral"};
 return {label:"부정",tone:"negative"};
}
function fmt(value:number|null|undefined,unit=""){
 if(typeof value!=="number"||!Number.isFinite(value))return "—";
 const digits=Math.abs(value)>=100?0:2;
 return `${value.toFixed(digits)}${unit}`;
}
function scoreLabel(value:number|null|undefined){return typeof value==="number"&&Number.isFinite(value)?value.toFixed(1):"—";}
function previousLabel(row?:{previousValue?:number|null;previousObservationDate?:string|null},unit=""){
 return fmt(row?.previousValue,unit);
}
function releaseLabel(row:{nextReleaseDate?:string|null},cadence:string){
 // Do not synthesize a release date from frequency.
 return {cadence,date:row.nextReleaseDate?dateLabel(row.nextReleaseDate):"일정 미정"};
}
function HelpTip({label,text}:{label:string;text:string}){return <ContentHelp label={label+' 도움말'}><HelpText copy={{meaning:text,reading:'원자료의 단위와 기준선, 관측일을 함께 확인하세요. 원자료의 상승·하락과 시장 평가 점수의 상승·하락은 서로 다를 수 있습니다.',note:'자료가 없거나 개발 중인 항목은 숫자를 표시하지 않습니다. 「—」는 0이 아닙니다.'}}/></ContentHelp>;}

export default function RecessionPanel(){
 const {payload,loading}=useStoredIndex<Payload>('/api/recession-detail');
 const score=typeof payload?.score==="number"&&Number.isFinite(payload.score)?payload.score:null;
 const trend=useMemo(()=>(payload?.trend??[]).filter(p=>typeof p.value==="number"&&Number.isFinite(p.value)).slice(-12).map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint)),[payload?.trend]);
 const latest=trend.at(-1),latestPoint:MarketFearGreedChartValidPoint|null=latest?{date:latest.date,score:latest.score as number}:null;
 const axisLabels=new Map(trend.map(p=>[p.date,p.date.slice(5,7)])),axisTicks=trend.filter((_,i)=>i===0||i===trend.length-1||i%2===0).map(p=>p.date);
 // Only compare matching calendar anchors in stored Current Vintage history.
 // Unavailable week/year observations must remain null, never estimated.
 const scoreComparisonItems=useMemo(()=>{
  const byDate=new Map(trend.map(point=>[point.date,point.score]));
  const anchor=payload?.asOfDate?.slice(0,10);
  const anchorScore=anchor?byDate.get(anchor):null;
  const subtract=(days=0,months=0,years=0)=>{
   if(!anchor||typeof anchorScore!=="number")return null;
   const [year,month,day]=anchor.split("-").map(Number);
   const total=(year-years)*12+(month-1)-months;
   const targetYear=Math.floor(total/12),targetMonth=((total%12)+12)%12;
   const maxDay=new Date(Date.UTC(targetYear,targetMonth+1,0)).getUTCDate();
   const date=new Date(Date.UTC(targetYear,targetMonth,Math.min(day,maxDay)-days)).toISOString().slice(0,10);
   const past=byDate.get(date);
   return typeof past==="number"?anchorScore-past:null;
  };
  return [
   {label:"1주",value:subtract(7)},
   {label:"1개월",value:subtract(0,1)},
   {label:"3개월",value:subtract(0,3)},
   {label:"6개월",value:subtract(0,6)},
   {label:"1년",value:subtract(0,0,1)},
  ];
 },[trend,payload?.asOfDate]);
 const components=new Map((payload?.components??[]).map(x=>[x.id,x]));
 const supplementals=payload?.supplementals??[];

 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell recession-target-card" data-testid="recession-detail-hero" data-market-state={loading?"loading":score===null?"unavailable":"ready"} aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI RECESSION R13" title="미국 경기침체" description="현재 개정 통계 기반 · 초기발표 자료 아님" dateLabel="데이터 기준일" date={dateLabel(payload?.asOfDate)} source={payload?.methodologyVersion??"RECESSION_R13"}/></div>
   <div className="fg-content-slot">
    <div className="fg-score-slot"><MarketScoreOrb score={loading||score===null?"—":score.toFixed(1)} state={loading?"확인 중":stage(score)} variant="hero" comparisonItems={scoreComparisonItems} comparisonAriaLabel="경기침체 방어점수 변화" metaDate={dateLabel(payload?.asOfDate)}/></div>
    <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart showExtrema data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey="1Y" gradientId="recession-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"이력 없음"}/></div></div></MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>데이터 출처</span><strong>현재 개정 통계 기반 · 침체 확률 아님</strong></div></div>
  </section>

  <section className="inflation-explainer" aria-labelledby="recession-what-title">
   <p className="cnn-eyebrow">WHAT IS A RECESSION?</p>
   <h1 id="recession-what-title">미국 경기침체란?</h1>
   <p>경기침체는 <mark className="zg-recession-keymark">고용·생산·소비 등 경제활동이 여러 분야에서 상당 기간 약해지는 상태</mark>예요. GDP가 2개 분기 연속 감소했는지만 보는 대신 <strong>일자리·소비·소득·산업생산</strong> 등 여러 신호를 함께 살펴봐요.</p>
   <div className="inflation-direction-strip"><span><b>침체 위험</b>고용↓ · 생산↓ · 소비↓ · 소득↓ · 신용긴축↑</span><span><b>경기 방어</b>고용 유지 · 실질성장 지속 · 소비·소득 견조</span></div>
  </section>

  <section className="inflation-indicator-section recession-r2-indicators" aria-labelledby="recession-indicator-title">
   <header><div><p className="cnn-eyebrow">RECESSION INDICATORS</p><h2 id="recession-indicator-title">미국 경기침체 분석 지표</h2></div><p>실업률 기반 Sahm Rule, GDP, 고용, 생산, 소비와 장단기 금리차·신용여건을 함께 보고 <b>긍정 / 중립 / 부정</b>으로 단순화했습니다.</p></header>
   <p className="recession-data-availability">이전 값·1년 추이·발표 예정일은 저장된 자료가 있을 때만 표시합니다. ‘—’는 0이 아니며, 보조지표와 개발 후보는 경기 방어점수 구성에서 구분합니다.</p>
   <div className="inflation-table-wrap recession-r2-table-wrap"><table className="inflation-indicator-table recession-indicator-table-r2">
    <thead><tr><th className="recession-r2-favorite-head"><span className="sr-only">즐겨찾기</span><RecessionFavoriteHeaderIcon/></th><th>지표</th><th>내용</th><th>기준</th><th>이전</th><th>현재</th><th>발표</th><th>판단</th><th>미니차트(1Y)</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead>
    <tbody>
     {Object.entries(componentMeta).map(([id,meta])=>{const row=components.get(id),j=judgement(row?.score),release=releaseLabel(row??{},meta.cadence);return <tr key={id} data-judgement={j.tone}>
      <td className="recession-r2-favorite-cell"><RecessionFavoriteButton id={id} label={meta.label}/></td>
      <th scope="row"><strong>{meta.label}</strong><small>핵심지표 · 방어점수 구성</small></th>
      <td>{meta.content}</td><td className="recession-r2-criterion">{meta.criterion}</td>
      <td className="recession-r2-value"><strong>{previousLabel(row,meta.unit)}</strong><small>{dateLabel(row?.previousObservationDate)}</small></td>
      <td className="recession-r2-value"><strong>{fmt(row?.value,meta.unit)}</strong><small>내부점수 {scoreLabel(row?.score)} · {dateLabel(row?.observationDate)}</small></td>
      <td className="recession-r2-release"><strong>{release.cadence}</strong><small>{release.date}</small></td>
      <td><span className="inflation-judgement">{j.label}</span></td>
      <td className="recession-r2-spark-cell"><InflationMiniChart label={meta.label} points={row?.trend}/></td>
      <td><HelpTip label={meta.label} text={meta.help}/></td>
     </tr>})}
     {supplementals.map(row=>{const meta=supplementalMeta[row.id];if(!meta)return null;const j=judgement(row.score),release=releaseLabel(row,meta.cadence);return <tr key={row.id} data-judgement={j.tone}>
      <td className="recession-r2-favorite-cell"><RecessionFavoriteButton id={row.id} label={meta.label}/></td>
      <th scope="row"><strong>{meta.label}</strong><small>보조지표 · 교차 확인</small></th>
      <td>{meta.content}</td><td className="recession-r2-criterion">{meta.criterion}</td>
      <td className="recession-r2-value"><strong>{previousLabel(row,row.unit??"")}</strong><small>{dateLabel(row.previousObservationDate)}</small></td>
      <td className="recession-r2-value"><strong>{row.displayValue??fmt(row.value,row.unit??"")}</strong><small>내부점수 {scoreLabel(row.score)} · {dateLabel(row.observationDate)}</small></td>
      <td className="recession-r2-release"><strong>{release.cadence}</strong><small>{release.date}</small></td>
      <td><span className="inflation-judgement">{j.label}</span></td>
      <td className="recession-r2-spark-cell"><InflationMiniChart label={meta.label} points={row.trend}/></td>
      <td><HelpTip label={meta.label} text={meta.help}/></td>
     </tr>})}
     {developmentCandidates.map(item=><tr key={item.label} data-development="true">
      <td className="recession-r2-favorite-cell"><RecessionFavoriteButton id={`development:${item.label}`} label={item.label}/></td>
      <th scope="row"><strong>{item.label}</strong><small>개발 후보 · 점수 미반영</small></th><td>{item.content}</td><td>{item.criterion}</td>
      <td>—</td><td>—</td><td>—</td><td><span className="inflation-judgement is-development">개발중</span></td>
      <td className="recession-r2-spark-cell">—</td><td><HelpTip label={item.label} text={`${item.help} 데이터 연결 전입니다. 현재 경기침체 점수에 포함하지 않습니다.`}/></td>
     </tr>)}
    </tbody>
   </table></div>

   <div className="recession-r2-mobile-list">
    {Object.entries(componentMeta).map(([id,meta])=>{const row=components.get(id),j=judgement(row?.score),release=releaseLabel(row??{},meta.cadence);return <article className="recession-r2-mobile-card" key={id} data-judgement={j.tone}>
     <div className="recession-r2-mobile-head">
      <div className="recession-r2-mobile-title"><RecessionFavoriteButton id={id} label={meta.label}/><div><strong>{meta.label}</strong><small>핵심지표 · 방어점수 구성</small></div></div>
      <div className="recession-r2-mobile-actions"><span className="inflation-judgement">{j.label}</span><HelpTip label={meta.label} text={meta.help}/></div>
     </div>
     <p className="recession-r2-mobile-content">{meta.content}</p>
     <p className="recession-r2-mobile-criterion"><span>기준</span>{meta.criterion}</p>
     <div className="recession-r2-mobile-spark"><span>미니차트(1Y)</span><InflationMiniChart label={meta.label} points={row?.trend}/></div>
     <div className="recession-r2-mobile-metrics">
      <div><span>이전</span><strong>{previousLabel(row,meta.unit)}</strong><small>{dateLabel(row?.previousObservationDate)}</small></div>
      <div><span>현재</span><strong>{fmt(row?.value,meta.unit)}</strong><small>{dateLabel(row?.observationDate)} · 점수 {scoreLabel(row?.score)}</small></div>
      <div><span>발표</span><strong>{release.cadence}</strong><small>{release.date}</small></div>
     </div>
    </article>})}
    {supplementals.map(row=>{const meta=supplementalMeta[row.id];if(!meta)return null;const j=judgement(row.score),release=releaseLabel(row,meta.cadence);return <article className="recession-r2-mobile-card" key={row.id} data-judgement={j.tone}>
     <div className="recession-r2-mobile-head">
      <div className="recession-r2-mobile-title"><RecessionFavoriteButton id={row.id} label={meta.label}/><div><strong>{meta.label}</strong><small>보조지표 · 교차 확인</small></div></div>
      <div className="recession-r2-mobile-actions"><span className="inflation-judgement">{j.label}</span><HelpTip label={meta.label} text={meta.help}/></div>
     </div>
     <p className="recession-r2-mobile-content">{meta.content}</p>
     <p className="recession-r2-mobile-criterion"><span>기준</span>{meta.criterion}</p>
     <div className="recession-r2-mobile-spark"><span>미니차트(1Y)</span><InflationMiniChart label={meta.label} points={row.trend}/></div>
     <div className="recession-r2-mobile-metrics">
      <div><span>이전</span><strong>{previousLabel(row,row.unit??"")}</strong><small>{dateLabel(row.previousObservationDate)}</small></div>
      <div><span>현재</span><strong>{row.displayValue??fmt(row.value,row.unit??"")}</strong><small>{dateLabel(row.observationDate)} · 점수 {scoreLabel(row.score)}</small></div>
      <div><span>발표</span><strong>{release.cadence}</strong><small>{release.date}</small></div>
     </div>
    </article>})}
    {developmentCandidates.map(item=><article className="recession-r2-mobile-card is-development" key={item.label}>
     <div className="recession-r2-mobile-head">
      <div className="recession-r2-mobile-title"><RecessionFavoriteButton id={`development:${item.label}`} label={item.label}/><div><strong>{item.label}</strong><small>개발 후보 · 점수 미반영</small></div></div>
      <div className="recession-r2-mobile-actions"><span className="inflation-judgement is-development">개발중</span><HelpTip label={item.label} text={`${item.help} 데이터 연결 전입니다. 현재 경기침체 점수에 포함하지 않습니다.`}/></div>
     </div>
     <p className="recession-r2-mobile-content">{item.content}</p>
     <p className="recession-r2-mobile-criterion"><span>기준</span>{item.criterion}</p>
     <div className="recession-r2-mobile-metrics">
      <div><span>이전</span><strong>—</strong><small>미산출</small></div>
      <div><span>현재</span><strong>—</strong><small>미산출</small></div>
      <div><span>발표</span><strong>—</strong><small>데이터 연결 전</small></div>
     </div>
    </article>)}
   </div>
  </section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
