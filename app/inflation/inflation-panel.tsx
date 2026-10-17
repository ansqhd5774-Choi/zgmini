"use client";
import {useStoredIndex} from '../../components/use-stored-index';
import {ContentHelp} from '../content-help';
import {HelpText} from '../help-copy';

import {useMemo} from "react";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";
import {InflationFavoriteButton,InflationFavoriteHeaderIcon} from "./inflation-favorite-button";
import {InflationMiniChart,type InflationMiniTrendPoint} from "./inflation-mini-chart";
import "./inflation-indicator-r2.css";

type FeatureRow={
  observationDate:string|null;
  availableAt:string|null;
  value:number|null;
  center:number|null;
  scale:number|null;
  risk:number|null;
  score:number|null;
  previousObservationDate?:string|null;
  previousAvailableAt?:string|null;
  previousValue?:number|null;
  trend?:InflationMiniTrendPoint[];
};
type InflationPayload={
  status:string;
  score:number|null;
  asOfDate?:string|null;
  updatedAt?:string|null;
  methodologyVersion?:string;
  interpretation?:string;
  axes?:Record<string,number|null>;
  features?:Record<string,FeatureRow|null>;
  trend?:Array<{label:string;value:number}>;
};

type ReleaseScheduleKey="PCE"|"CPI"|"PPI"|"IMPORT"|"EMPLOYMENT"|"ECI"|"PRODUCTIVITY"|"INDPRO"|null;
type ReleaseUrgency="unknown"|"distant"|"month"|"fortnight"|"week"|"imminent";
type FeatureMeta={
 label:string;
 content:string;
 unit:string;
 note:string;
 criterion:"TWO"|"ZERO"|"PAST_MEDIAN"|"PAST_MEDIAN_ABS";
 cadence:"월간"|"분기";
 schedule:ReleaseScheduleKey;
 help:string;
};

const featureOrder=[
 "CORE_PCE","CORE_CPI","CORE_CPI_3M","MEDIAN_CPI","TRIM16_CPI","HEADLINE_PCE","INF_EXPECT",
 "PPI_FINAL","PPI_CORE_FD","IMPORT_EX_FUEL","WTI","GASOLINE","WAGE_YOY","ECI_COST","UNIT_LABOR_COST","INDPRO",
] as const;

const featureMeta:Record<string,FeatureMeta>={
 CORE_PCE:{label:"Core PCE",content:"연준이 중시하는 기조 소비물가",unit:"%",note:"YoY · 초기발표",criterion:"TWO",cadence:"월간",schedule:"PCE",help:"2%에 가까울수록 물가 안정에 긍정적입니다. 2%에서 멀어질수록 기조 물가 압력이 남아 있는 것으로 봅니다."},
 CORE_CPI:{label:"Core CPI",content:"식품·에너지를 제외한 소비자물가",unit:"%",note:"YoY",criterion:"TWO",cadence:"월간",schedule:"CPI",help:"2% 근처가 안정 방향입니다. 현재 수준이 높더라도 최근 값이 둔화하면 개선 방향으로 해석할 수 있습니다."},
 CORE_CPI_3M:{label:"Core CPI 3M",content:"최근 3개월의 기조 물가 속도",unit:"%",note:"3개월 연율",criterion:"TWO",cadence:"월간",schedule:"CPI",help:"최근 물가 속도를 빠르게 확인하는 지표입니다. 2% 부근으로 낮아질수록 긍정적이고 재가속하면 부정적입니다."},
 MEDIAN_CPI:{label:"Median CPI",content:"품목별 중간값으로 본 끈적한 물가",unit:"%",note:"3개월 연율",criterion:"TWO",cadence:"월간",schedule:"CPI",help:"극단적인 가격 변동 영향을 줄여 기조 물가를 봅니다. Cleveland Fed가 BLS 월간 CPI 세부자료를 바탕으로 계산하며 2% 근처로 둔화할수록 긍정적입니다."},
 TRIM16_CPI:{label:"16% Trimmed Mean CPI",content:"가격 급등락 품목을 제거한 기조 물가",unit:"%",note:"3개월 연율",criterion:"TWO",cadence:"월간",schedule:"CPI",help:"이상치 영향을 줄인 물가입니다. Cleveland Fed가 BLS 월간 CPI 세부자료를 바탕으로 계산하며 2%에 가까워질수록 광범위한 물가 압력이 완화되는 방향입니다."},
 HEADLINE_PCE:{label:"Headline PCE",content:"전체 개인소비지출 물가",unit:"%",note:"YoY · 초기발표",criterion:"TWO",cadence:"월간",schedule:"PCE",help:"식품·에너지를 포함한 전체 소비물가입니다. 2% 부근이 안정 방향이며 크게 높으면 부정적입니다."},
 INF_EXPECT:{label:"5Y 기대 인플레이션",content:"시장이 예상하는 중기 물가 수준",unit:"%",note:"수준",criterion:"TWO",cadence:"월간",schedule:null,help:"Cleveland Fed의 월간 기대 인플레이션 추정치입니다. 2% 근처에서 안정되면 긍정적이며 공식 다음 공개일이 없으면 일정 미정으로 표시합니다."},
 PPI_FINAL:{label:"PPI Final Demand",content:"최종수요 생산자 가격 압력",unit:"%",note:"3개월 연율",criterion:"PAST_MEDIAN",cadence:"월간",schedule:"PPI",help:"생산단계 가격 상승률이 과거 정상 범위보다 높아질수록 향후 소비자물가 압력에 부정적입니다."},
 PPI_CORE_FD:{label:"Core PPI Final Demand",content:"식품·에너지 등을 제외한 생산자물가",unit:"%",note:"3개월 연율",criterion:"PAST_MEDIAN",cadence:"월간",schedule:"PPI",help:"기조 생산비용 압력을 봅니다. 과거 중앙값보다 크게 높으면 부정적이고 낮아지면 긍정적입니다."},
 IMPORT_EX_FUEL:{label:"수입물가 ex Fuel",content:"연료를 제외한 수입 가격 압력",unit:"%",note:"YoY",criterion:"PAST_MEDIAN",cadence:"월간",schedule:"IMPORT",help:"수입가격이 과거 정상 범위보다 높아지면 국내 물가로 전가될 가능성이 있어 부정적으로 해석합니다."},
 WTI:{label:"WTI",content:"국제유가의 단기 비용 압력",unit:"%",note:"3개월 변화",criterion:"ZERO",cadence:"월간",schedule:null,help:"저장된 EIA/FRED 월간 WTI를 사용합니다. 3개월 변화가 0% 근처면 안정적이며 공식 다음 공개일을 확인할 수 없으면 일정 미정으로 표시합니다."},
 GASOLINE:{label:"미국 휘발유",content:"소비자가 체감하는 에너지 가격",unit:"%",note:"3개월 변화",criterion:"ZERO",cadence:"월간",schedule:null,help:"저장된 EIA/FRED 월간 휘발유 가격을 사용합니다. 3개월 변화율이 0% 근처면 안정 방향이며 공식 다음 공개일을 확인할 수 없으면 일정 미정으로 표시합니다."},
 WAGE_YOY:{label:"평균 시간당 임금",content:"임금에서 오는 서비스 물가 압력",unit:"%",note:"YoY",criterion:"PAST_MEDIAN",cadence:"월간",schedule:"EMPLOYMENT",help:"임금 상승률이 과거 정상 범위를 크게 웃돌면 서비스 물가가 오래 유지될 수 있어 부정적입니다."},
 ECI_COST:{label:"Employment Cost Index",content:"임금·복리후생을 포함한 고용비용",unit:"%",note:"YoY",criterion:"PAST_MEDIAN",cadence:"분기",schedule:"ECI",help:"기업의 전체 노동비용을 봅니다. 과거 중앙값을 크게 웃도는 상승률은 지속적인 물가 압력으로 해석합니다."},
 UNIT_LABOR_COST:{label:"Unit Labor Cost",content:"생산 한 단위당 노동비용",unit:"",note:"저장값",criterion:"PAST_MEDIAN",cadence:"분기",schedule:"PRODUCTIVITY",help:"단위노동비용이 과거 정상 범위보다 높아지면 기업의 가격 전가 압력이 커질 수 있습니다."},
 INDPRO:{label:"산업생산",content:"수요·생산 활동의 물가 배경",unit:"%",note:"3개월 연율",criterion:"PAST_MEDIAN_ABS",cadence:"월간",schedule:"INDPRO",help:"수요 환경은 너무 강하거나 너무 약한 극단 모두 위험으로 봅니다. 과거 중앙 수준에 가까울수록 안정적으로 평가합니다."},
};

// Official calendars verified 2026-10-16:
// BEA Personal Income and Outlays; BLS CPI/PPI/Import Prices/Employment/ECI/Productivity;
// Federal Reserve G.17 Industrial Production. Unknown provider dates stay "일정 미정".
const releaseSchedules:Record<Exclude<ReleaseScheduleKey,null>,string[]>={
 PCE:["2026-10-29","2026-11-25","2026-12-23","2027-01-28","2027-02-25","2027-03-31","2027-04-29","2027-05-27"],
 CPI:["2026-11-10","2026-12-10","2027-01-13","2027-02-11","2027-03-10","2027-04-13","2027-05-12","2027-06-10","2027-07-14","2027-08-11","2027-09-14","2027-10-14","2027-11-10","2027-12-10"],
 PPI:["2026-11-13","2026-12-15","2027-01-14","2027-02-12","2027-03-12","2027-04-14","2027-05-13","2027-06-11","2027-07-15","2027-08-10","2027-09-10","2027-10-15","2027-11-12","2027-12-15"],
 IMPORT:["2026-11-17","2026-12-17","2027-01-15","2027-02-17","2027-03-17","2027-04-16","2027-05-14","2027-06-16","2027-07-16","2027-08-13","2027-09-17","2027-10-19","2027-11-16","2027-12-16"],
 EMPLOYMENT:["2026-11-06","2026-12-04","2027-01-08","2027-02-05","2027-03-05","2027-04-02","2027-05-07","2027-06-04","2027-07-02","2027-08-06","2027-09-03","2027-10-08","2027-11-05"],
 ECI:["2026-10-30","2027-01-29","2027-04-30","2027-07-30","2027-10-29"],
 PRODUCTIVITY:["2026-11-05","2026-12-08","2027-02-04","2027-03-04","2027-05-06","2027-06-03","2027-08-05","2027-09-02","2027-11-04","2027-12-07"],
 INDPRO:["2026-10-16","2026-11-17","2026-12-16","2027-01-15","2027-02-17","2027-03-15","2027-04-15","2027-05-17","2027-06-16","2027-07-16","2027-08-17","2027-09-16","2027-10-18","2027-11-17","2027-12-16"],
};

const developmentCandidates=[
 {label:"Shelter CPI",content:"주거비 인플레이션",criterion:"지속 둔화",help:"주거비는 CPI에서 비중이 큽니다. 상승률이 지속적으로 둔화하는지 확인할 예정입니다."},
 {label:"Core Services ex-Housing",content:"주거비 제외 핵심 서비스 물가",criterion:"지속 둔화",help:"서비스 부문의 끈적한 물가 압력을 확인하기 위한 지표입니다."},
 {label:"Supercore Services",content:"연준이 주목하는 서비스 기조 물가",criterion:"지속 둔화",help:"노동집약적 서비스 물가의 지속성을 확인하기 위한 보조 지표입니다."},
 {label:"Michigan 기대인플레",content:"소비자 장단기 기대물가",criterion:"안정",help:"소비자의 기대가 높아지면 임금·가격 결정에 영향을 줄 수 있어 기대의 안정 여부를 봅니다."},
 {label:"NY Fed 기대인플레",content:"가계가 예상하는 향후 물가",criterion:"안정",help:"가계의 1년·3년 등 기대 인플레이션이 재상승하는지 확인하기 위한 지표입니다."},
 {label:"ISM Prices Paid",content:"기업 구매단계 가격 압력",criterion:"50 부근 안정",help:"기업이 체감하는 투입가격 압력을 보여주며 급등하면 선행 물가 압력으로 볼 수 있습니다."},
];

function dateLabel(value?:string|null){
 if(!value)return "—";
 const d=new Date(value.length===10?value+"T00:00:00Z":value);
 return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeZone:"Asia/Seoul"}).format(d):value;
}
function shortDateLabel(value:string){
 const [,month,day]=value.split("-");
 return `${month}.${day}`;
}
function kstTodayKey(){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const get=(type:string)=>parts.find(part=>part.type===type)?.value??"";
 return `${get("year")}-${get("month")}-${get("day")}`;
}
function daysBetween(from:string,to:string){
 return Math.round((Date.parse(to+"T00:00:00Z")-Date.parse(from+"T00:00:00Z"))/86400000);
}
function releaseUrgency(days:number|null):ReleaseUrgency{
 if(days===null)return "unknown";
 if(days<=3)return "imminent";
 if(days<=7)return "week";
 if(days<=14)return "fortnight";
 if(days<=30)return "month";
 return "distant";
}
function releaseInfo(feature:string,today:string){
 const meta=featureMeta[feature];
 const next=meta.schedule?releaseSchedules[meta.schedule].find(date=>date>=today)??null:null;
 const days=next?daysBetween(today,next):null;
 return {
  cadence:meta.cadence,
  next,
  countdown:days===null?"일정 미정":days===0?"오늘":`D-${days}`,
  urgency:releaseUrgency(days),
 };
}
function stage(score:number|null|undefined){
 if(typeof score!=="number"||!Number.isFinite(score))return "확인 필요";
 if(score>=75)return "매우 안정";
 if(score>=60)return "안정";
 if(score>=45)return "중립";
 if(score>=25)return "물가 압력";
 return "강한 물가 압력";
}
function judgement(score:number|null|undefined){
 if(typeof score!=="number"||!Number.isFinite(score))return {label:"확인 필요",tone:"neutral"};
 if(score>=60)return {label:"긍정",tone:"positive"};
 if(score>=45)return {label:"중립",tone:"neutral"};
 return {label:"부정",tone:"negative"};
}
function formatFeatureValue(feature:string,value:number|null|undefined){
 if(typeof value!=="number"||!Number.isFinite(value))return "—";
 const meta=featureMeta[feature],digits=Math.abs(value)>=100?1:2;
 return `${value.toFixed(digits)}${meta?.unit??""}`;
}
function formatRaw(feature:string,row:FeatureRow|null|undefined){return formatFeatureValue(feature,row?.value);}
function formatPrevious(feature:string,row:FeatureRow|null|undefined){return formatFeatureValue(feature,row?.previousValue);}
function formatCriterion(feature:string,row:FeatureRow|null|undefined){
 const meta=featureMeta[feature];
 if(meta.criterion==="TWO")return "목표 2%";
 if(meta.criterion==="ZERO")return "중립 0%";
 if(typeof row?.center==="number"&&Number.isFinite(row.center)){
  const value=row.center.toFixed(Math.abs(row.center)>=10?1:2);
  return `중앙값 ${value}${meta.unit}`;
 }
 return meta.criterion==="PAST_MEDIAN_ABS"?"중앙값 기준":"중앙값 이하";
}

function HelpTip({label,text}:{label:string;text:string}){return <ContentHelp label={label+' 도움말'}><HelpText copy={{meaning:text,reading:'원자료의 단위와 기준선, 발표일을 함께 확인하세요. 원자료의 상승·하락과 시장 평가 점수의 상승·하락은 서로 다를 수 있습니다.',note:'자료가 없거나 개발 중인 항목은 숫자를 표시하지 않습니다. 「—」는 0이 아닙니다.'}}/></ContentHelp>;}

export default function InflationPanel(){
 const {payload,loading}=useStoredIndex<InflationPayload>('/api/inflation-detail');

 const score=typeof payload?.score==="number"&&Number.isFinite(payload.score)?payload.score:null;
 const allTrend=useMemo(()=>Array.isArray(payload?.trend)?payload!.trend!.filter(p=>typeof p.value==="number"&&Number.isFinite(p.value)):[],[payload?.trend]);
 const trend=allTrend.slice(-12).map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint));
 const latest=trend.at(-1);
 const latestPoint:MarketFearGreedChartValidPoint|null=latest&&typeof latest.score==="number"?{date:latest.date,score:latest.score}:null;
 const axisLabels=new Map(trend.map(p=>[p.date,p.date.slice(5,7)]));
 const axisTicks=trend.filter((_,i)=>i===0||i===trend.length-1||i%2===0).map(p=>p.date);
 const previous=allTrend.at(-2)?.value,threeMonth=allTrend.at(-4)?.value;
 const previousDelta=score!==null&&typeof previous==="number"?score-previous:null;
 const threeMonthDelta=score!==null&&typeof threeMonth==="number"?score-threeMonth:null;
 const features=payload?.features??{};
 const today=kstTodayKey();

 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell inflation-target-card" data-testid="inflation-detail-hero" data-market-state={loading?"loading":score===null?"unavailable":"ready"} aria-busy={loading}>
   <div className="fg-header-slot">
    <MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI INFLATION R2" title="미국 인플레이션" description="초기발표 당시 자료 기반" dateLabel="데이터 기준일" date={dateLabel(payload?.asOfDate)} source={payload?.methodologyVersion??"INFLATION_R2"}/>
   </div>
   <div className="fg-content-slot">
    <div className="fg-score-slot">
     <MarketScoreOrb score={loading||score===null?"—":score.toFixed(1)} state={loading?"확인 중":stage(score)} variant="hero" dayDelta={previousDelta} periodDelta={threeMonthDelta} periodLabel="3개월 대비" dayLabel="전월 대비" comparisonAriaLabel="인플레이션 안정성 점수 변화" metaDate={dateLabel(payload?.asOfDate)}/>
    </div>
    <MarketTrendFrame className="fg-analysis-slot">
     <div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey="1Y" gradientId="inflation-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"이력 없음"}/></div></div>
    </MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>데이터 출처</span><strong>저장된 초기발표 이력만 사용 · 실시간 대체 조회 없음</strong></div></div>
  </section>

  <section className="inflation-explainer" aria-labelledby="inflation-what-title">
   <p className="cnn-eyebrow">WHAT IS INFLATION?</p>
   <h1 id="inflation-what-title">인플레이션이란?</h1>
   <p>인플레이션은 상품과 서비스의 전반적인 가격 수준이 지속적으로 오르는 현상입니다. 한두 품목의 가격만 보는 것이 아니라 소비자물가, 생산자물가, 임금, 에너지, 기대인플레이션처럼 서로 다른 지표가 같은 방향으로 움직이는지 함께 확인해야 합니다.</p>
   <div className="inflation-direction-strip">
    <span><b>물가 압력</b>기조 물가↑ · 비용↑ · 임금↑ · 기대물가↑</span>
    <span><b>물가 안정</b>2% 목표 접근 · 비용 안정 · 기대물가 안정</span>
   </div>
  </section>

  <section className="inflation-indicator-section inflation-r2-indicators" aria-labelledby="inflation-indicator-title">
   <header>
    <div><p className="cnn-eyebrow">INFLATION INDICATORS</p><h2 id="inflation-indicator-title">인플레이션 분석 지표</h2></div>
    <p>이전·현재값과 공식 발표 일정을 함께 표시합니다. 저장된 정규화 점수는 <b>긍정 / 중립 / 부정</b>으로 단순화했습니다.</p>
   </header>

   <div className="inflation-table-wrap inflation-r2-table-wrap">
    <table className="inflation-indicator-table inflation-indicator-table-r2">
     <thead><tr><th className="inflation-r2-favorite-head"><span className="sr-only">즐겨찾기</span><InflationFavoriteHeaderIcon/></th><th>지표</th><th>내용</th><th>기준</th><th>이전</th><th>현재</th><th>발표</th><th>판단</th><th>미니차트(1Y)</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead>
     <tbody>
      {featureOrder.map(feature=>{
       const row=features[feature],meta=featureMeta[feature],result=judgement(row?.score),release=releaseInfo(feature,today);
       return <tr key={feature} data-judgement={result.tone}>
        <td className="inflation-r2-favorite-cell"><InflationFavoriteButton id={feature} label={meta.label}/></td>
        <th scope="row"><strong>{meta.label}</strong><small>{meta.note}</small></th>
        <td>{meta.content}</td>
        <td className="inflation-r2-criterion">{formatCriterion(feature,row)}</td>
        <td className="inflation-r2-value"><strong>{formatPrevious(feature,row)}</strong><small>{dateLabel(row?.previousAvailableAt)}</small></td>
        <td className="inflation-r2-value"><strong>{formatRaw(feature,row)}</strong><small>{dateLabel(row?.availableAt)}</small></td>
        <td className={`inflation-r2-release release-${release.urgency}`}><strong>{release.cadence}</strong><small>{release.next?`${shortDateLabel(release.next)} · ${release.countdown}`:release.countdown}</small></td>
        <td><span className="inflation-judgement">{result.label}</span></td>
        <td className="inflation-r2-spark-cell"><InflationMiniChart label={meta.label} points={row?.trend}/></td>
        <td><HelpTip label={meta.label} text={meta.help}/></td>
       </tr>;
      })}
      {developmentCandidates.map(item=><tr key={item.label} data-development="true">
       <td className="inflation-r2-favorite-cell"><InflationFavoriteButton id={`development:${item.label}`} label={item.label}/></td>
       <th scope="row"><strong>{item.label}</strong></th>
       <td>{item.content}</td>
       <td>{item.criterion}</td>
       <td>—</td><td>—</td><td>—</td>
       <td><span className="inflation-judgement is-development">개발중</span></td>
       <td className="inflation-r2-spark-cell">—</td>
       <td><HelpTip label={item.label} text={`${item.help} 현재 ZGmini 데이터 연결 개발 중입니다.`}/></td>
      </tr>)}
     </tbody>
    </table>
   </div>

   <div className="inflation-r2-mobile-list">
    {featureOrder.map(feature=>{
     const row=features[feature],meta=featureMeta[feature],result=judgement(row?.score),release=releaseInfo(feature,today);
     return <article className="inflation-r2-mobile-card" key={feature} data-judgement={result.tone}>
      <div className="inflation-r2-mobile-head">
       <div className="inflation-r2-mobile-title"><InflationFavoriteButton id={feature} label={meta.label}/><div><strong>{meta.label}</strong><small>{meta.note}</small></div></div>
       <div className="inflation-r2-mobile-actions"><span className="inflation-judgement">{result.label}</span><HelpTip label={meta.label} text={meta.help}/></div>
      </div>
      <p className="inflation-r2-mobile-content">{meta.content}</p>
      <p className="inflation-r2-mobile-criterion"><span>기준</span>{formatCriterion(feature,row)}</p>
      <div className="inflation-r2-mobile-spark"><span>미니차트(1Y)</span><InflationMiniChart label={meta.label} points={row?.trend}/></div>
      <div className="inflation-r2-mobile-metrics">
       <div><span>이전</span><strong>{formatPrevious(feature,row)}</strong><small>{dateLabel(row?.previousAvailableAt)}</small></div>
       <div><span>현재</span><strong>{formatRaw(feature,row)}</strong><small>{dateLabel(row?.availableAt)}</small></div>
       <div className={`release-${release.urgency}`}><span>발표</span><strong>{release.cadence}</strong><small>{release.next?`${shortDateLabel(release.next)} · ${release.countdown}`:release.countdown}</small></div>
      </div>
     </article>;
    })}
    {developmentCandidates.map(item=><article className="inflation-r2-mobile-card is-development" key={item.label}>
     <div className="inflation-r2-mobile-head">
      <div className="inflation-r2-mobile-title"><InflationFavoriteButton id={`development:${item.label}`} label={item.label}/><div><strong>{item.label}</strong></div></div>
      <div className="inflation-r2-mobile-actions"><span className="inflation-judgement is-development">개발중</span><HelpTip label={item.label} text={`${item.help} 현재 ZGmini 데이터 연결 개발 중입니다.`}/></div>
     </div>
     <p className="inflation-r2-mobile-content">{item.content}</p>
     <p className="inflation-r2-mobile-criterion"><span>기준</span>{item.criterion}</p>
    </article>)}
   </div>
  </section>

  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
