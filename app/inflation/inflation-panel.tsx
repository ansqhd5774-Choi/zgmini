"use client";

import {useEffect,useMemo,useRef,useState,type FocusEvent} from "react";
import {Info} from "lucide-react";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";

type FeatureRow={
  observationDate:string|null;
  availableAt:string|null;
  value:number|null;
  center:number|null;
  scale:number|null;
  risk:number|null;
  score:number|null;
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

type FeatureMeta={
 label:string;
 content:string;
 unit:string;
 note:string;
 criterion:"TWO"|"ZERO"|"PAST_MEDIAN"|"PAST_MEDIAN_ABS";
 help:string;
};

const featureOrder=[
 "CORE_PCE","CORE_CPI","CORE_CPI_3M","MEDIAN_CPI","TRIM16_CPI","HEADLINE_PCE","INF_EXPECT",
 "PPI_FINAL","PPI_CORE_FD","IMPORT_EX_FUEL","WTI","GASOLINE","WAGE_YOY","ECI_COST","UNIT_LABOR_COST","INDPRO",
] as const;

const featureMeta:Record<string,FeatureMeta>={
 CORE_PCE:{label:"Core PCE",content:"연준이 중시하는 기조 소비물가",unit:"%",note:"YoY · 초기발표",criterion:"TWO",help:"2%에 가까울수록 물가 안정에 긍정적입니다. 2%에서 멀어질수록 기조 물가 압력이 남아 있는 것으로 봅니다."},
 CORE_CPI:{label:"Core CPI",content:"식품·에너지를 제외한 소비자물가",unit:"%",note:"YoY",criterion:"TWO",help:"2% 근처가 안정 방향입니다. 현재 수준이 높더라도 최근 값이 둔화하면 개선 방향으로 해석할 수 있습니다."},
 CORE_CPI_3M:{label:"Core CPI 3M",content:"최근 3개월의 기조 물가 속도",unit:"%",note:"3개월 연율",criterion:"TWO",help:"최근 물가 속도를 빠르게 확인하는 지표입니다. 2% 부근으로 낮아질수록 긍정적이고 재가속하면 부정적입니다."},
 MEDIAN_CPI:{label:"Median CPI",content:"품목별 중간값으로 본 끈적한 물가",unit:"%",note:"3개월 연율",criterion:"TWO",help:"극단적인 가격 변동 영향을 줄여 기조 물가를 봅니다. 2% 근처로 둔화할수록 긍정적입니다."},
 TRIM16_CPI:{label:"16% Trimmed Mean CPI",content:"가격 급등락 품목을 제거한 기조 물가",unit:"%",note:"3개월 연율",criterion:"TWO",help:"이상치 영향을 줄인 물가입니다. 2%에 가까워질수록 광범위한 물가 압력이 완화되는 방향입니다."},
 HEADLINE_PCE:{label:"Headline PCE",content:"전체 개인소비지출 물가",unit:"%",note:"YoY · 초기발표",criterion:"TWO",help:"식품·에너지를 포함한 전체 소비물가입니다. 2% 부근이 안정 방향이며 크게 높으면 부정적입니다."},
 INF_EXPECT:{label:"5Y 기대 인플레이션",content:"시장이 예상하는 중기 물가 수준",unit:"%",note:"수준",criterion:"TWO",help:"기대 인플레이션이 2% 근처에서 안정되면 긍정적입니다. 지속 상승하면 물가 기대 고착 위험으로 봅니다."},
 PPI_FINAL:{label:"PPI Final Demand",content:"최종수요 생산자 가격 압력",unit:"%",note:"3개월 연율",criterion:"PAST_MEDIAN",help:"생산단계 가격 상승률이 과거 정상 범위보다 높아질수록 향후 소비자물가 압력에 부정적입니다."},
 PPI_CORE_FD:{label:"Core PPI Final Demand",content:"식품·에너지 등을 제외한 생산자물가",unit:"%",note:"3개월 연율",criterion:"PAST_MEDIAN",help:"기조 생산비용 압력을 봅니다. 과거 중앙값보다 크게 높으면 부정적이고 낮아지면 긍정적입니다."},
 IMPORT_EX_FUEL:{label:"수입물가 ex Fuel",content:"연료를 제외한 수입 가격 압력",unit:"%",note:"YoY",criterion:"PAST_MEDIAN",help:"수입가격이 과거 정상 범위보다 높아지면 국내 물가로 전가될 가능성이 있어 부정적으로 해석합니다."},
 WTI:{label:"WTI",content:"국제유가의 단기 비용 압력",unit:"%",note:"3개월 변화",criterion:"ZERO",help:"3개월 유가 변화가 0% 근처면 안정적입니다. 급등할수록 에너지와 운송비를 통해 물가 압력이 커질 수 있습니다."},
 GASOLINE:{label:"미국 휘발유",content:"소비자가 체감하는 에너지 가격",unit:"%",note:"3개월 변화",criterion:"ZERO",help:"3개월 변화율이 0% 근처면 안정 방향입니다. 빠른 상승은 소비자물가와 기대인플레이션에 부정적입니다."},
 WAGE_YOY:{label:"평균 시간당 임금",content:"임금에서 오는 서비스 물가 압력",unit:"%",note:"YoY",criterion:"PAST_MEDIAN",help:"임금 상승률이 과거 정상 범위를 크게 웃돌면 서비스 물가가 오래 유지될 수 있어 부정적입니다."},
 ECI_COST:{label:"Employment Cost Index",content:"임금·복리후생을 포함한 고용비용",unit:"%",note:"YoY",criterion:"PAST_MEDIAN",help:"기업의 전체 노동비용을 봅니다. 과거 중앙값을 크게 웃도는 상승률은 지속적인 물가 압력으로 해석합니다."},
 UNIT_LABOR_COST:{label:"Unit Labor Cost",content:"생산 한 단위당 노동비용",unit:"",note:"저장값",criterion:"PAST_MEDIAN",help:"단위노동비용이 과거 정상 범위보다 높아지면 기업의 가격 전가 압력이 커질 수 있습니다."},
 INDPRO:{label:"산업생산",content:"수요·생산 활동의 물가 배경",unit:"%",note:"3개월 연율",criterion:"PAST_MEDIAN_ABS",help:"수요 환경은 너무 강하거나 너무 약한 극단 모두 위험으로 봅니다. 과거 중앙 수준에 가까울수록 안정적으로 평가합니다."},
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
function formatRaw(feature:string,row:FeatureRow|null|undefined){
 if(!row||typeof row.value!=="number"||!Number.isFinite(row.value))return "—";
 const meta=featureMeta[feature],digits=Math.abs(row.value)>=100?1:2;
 return `${row.value.toFixed(digits)}${meta?.unit??""}`;
}
function formatCriterion(feature:string,row:FeatureRow|null|undefined){
 const meta=featureMeta[feature];
 if(meta.criterion==="TWO")return "2% 근처";
 if(meta.criterion==="ZERO")return "0% 근처";
 if(typeof row?.center==="number"&&Number.isFinite(row.center)){
  const value=row.center.toFixed(Math.abs(row.center)>=10?1:2);
  return meta.criterion==="PAST_MEDIAN_ABS"?`과거 중앙값 ${value} 근처`:`과거 중앙값 ${value} 이하·근처`;
 }
 return meta.criterion==="PAST_MEDIAN_ABS"?"과거 정상 범위":"과거 중앙값 이하·근처";
}

function HelpTip({label,text}:{label:string;text:string}){
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  if(!open)return;
  const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};
  document.addEventListener("pointerdown",close);
  return()=>document.removeEventListener("pointerdown",close);
 },[open]);
 const blur=(event:FocusEvent<HTMLSpanElement>)=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)};
 return <span ref={root} className="inflation-help" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onBlur={blur}>
  <button type="button" aria-label={`${label} 해석 방향`} aria-expanded={open} onFocus={()=>setOpen(true)} onClick={event=>{event.stopPropagation();setOpen(v=>!v)}}><Info size={14}/></button>
  {open?<span role="tooltip"><strong>해석 방향</strong>{text}</span>:null}
 </span>;
}

export default function InflationPanel(){
 const [payload,setPayload]=useState<InflationPayload|null>(null);
 const [loading,setLoading]=useState(true);


 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/inflation-detail",{cache:"no-store",signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<InflationPayload>})
   .then(setPayload).catch(()=>setPayload(null)).finally(()=>setLoading(false));
  return()=>controller.abort();
 },[]);

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

  <section className="inflation-indicator-section" aria-labelledby="inflation-indicator-title">
   <header>
    <div><p className="cnn-eyebrow">INFLATION INDICATORS</p><h2 id="inflation-indicator-title">인플레이션 분석 지표</h2></div>
    <p>저장된 정규화 점수의 구간을 <b>긍정 / 중립 / 부정</b>으로 단순화했습니다. ⓘ에서 해석 방향을 확인할 수 있습니다.</p>
   </header>
   <div className="inflation-table-wrap">
    <table className="inflation-indicator-table">
     <thead><tr><th>지표</th><th>내용</th><th>기준</th><th>현재</th><th>판단</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead>
     <tbody>
      {featureOrder.map(feature=>{
       const row=features[feature],meta=featureMeta[feature],result=judgement(row?.score);
       return <tr key={feature} data-judgement={result.tone}>
        <th scope="row"><strong>{meta.label}</strong><small>{meta.note}</small></th>
        <td>{meta.content}</td>
        <td>{formatCriterion(feature,row)}</td>
        <td><strong>{formatRaw(feature,row)}</strong><small>{dateLabel(row?.observationDate)}</small></td>
        <td><span className="inflation-judgement">{result.label}</span></td>
        <td><HelpTip label={meta.label} text={meta.help}/></td>
       </tr>;
      })}
      {developmentCandidates.map(item=><tr key={item.label} data-development="true">
       <th scope="row"><strong>{item.label}</strong></th>
       <td>{item.content}</td>
       <td>{item.criterion}</td>
       <td>—</td>
       <td><span className="inflation-judgement is-development">개발중</span></td>
       <td><HelpTip label={item.label} text={`${item.help} 현재 ZGmini 데이터 연결 개발 중입니다.`}/></td>
      </tr>)}
     </tbody>
    </table>
   </div>
  </section>

  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
