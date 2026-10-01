"use client";

import {useEffect,useMemo,useState} from "react";
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

const axisDefs=[
 {id:"TARGET_STABILITY",title:"목표 안정성",question:"기조 물가는 2% 목표에 가까워지고 있는가?",meaning:"Core PCE와 Core CPI를 함께 보며 연준 목표와의 거리를 평가합니다.",pressure:"2% 목표에서 이탈",stable:"2% 목표에 근접",features:["CORE_PCE","CORE_CPI"]},
 {id:"UNDERLYING_MOMENTUM",title:"기조 모멘텀",question:"최근 기조 물가의 속도는 둔화되고 있는가?",meaning:"Core CPI 3개월 연율과 Median·Trimmed Mean CPI를 함께 봅니다.",pressure:"기조 물가 재가속",stable:"기조 물가 둔화",features:["CORE_CPI_3M","MEDIAN_CPI","TRIM16_CPI"]},
 {id:"HEADLINE_PRESSURE",title:"헤드라인 물가 압력",question:"전체 소비물가 압력은 얼마나 강한가?",meaning:"Headline PCE의 초기 발표 기준 물가 압력을 평가합니다.",pressure:"헤드라인 압력 확대",stable:"헤드라인 압력 완화",features:["HEADLINE_PCE"]},
 {id:"EXPECTATIONS",title:"기대 인플레이션",question:"시장은 중장기 물가를 얼마나 높게 보고 있는가?",meaning:"5년 기대 인플레이션을 통해 기대가 고착되는지 확인합니다.",pressure:"기대 인플레 상승",stable:"기대 인플레 안정",features:["INF_EXPECT"]},
 {id:"SUPPLY_PIPELINE",title:"공급 파이프라인",question:"에너지·생산자·수입물가 압력은 커지고 있는가?",meaning:"WTI·휘발유·PPI·수입물가를 묶어 공급 측 압력을 봅니다.",pressure:"공급비용 압력 확대",stable:"공급비용 압력 완화",features:["WTI","GASOLINE","PPI_FINAL","PPI_CORE_FD","IMPORT_EX_FUEL"]},
 {id:"LABOR_COST_PERSISTENCE",title:"노동비용 지속성",question:"임금과 노동비용이 서비스 물가를 계속 밀어 올리는가?",meaning:"임금·ECI·단위노동비용을 통해 끈적한 물가 압력을 평가합니다.",pressure:"노동비용 압력 확대",stable:"노동비용 압력 완화",features:["WAGE_YOY","ECI_COST","UNIT_LABOR_COST"]},
 {id:"DEMAND_CONTEXT",title:"수요 환경",question:"실물 수요가 물가 압력을 지지하고 있는가?",meaning:"산업생산의 최근 속도를 이용해 수요 측 배경을 확인합니다.",pressure:"수요 과열 방향",stable:"수요 압력 완화",features:["INDPRO"]},
] as const;

const featureMeta:Record<string,{label:string;unit:string;note:string}>={
 CORE_PCE:{label:"Core PCE",unit:"%",note:"YoY · 초기발표 빈티지"},
 CORE_CPI:{label:"Core CPI",unit:"%",note:"YoY"},
 CORE_CPI_3M:{label:"Core CPI 3M",unit:"%",note:"3개월 연율"},
 MEDIAN_CPI:{label:"Median CPI",unit:"%",note:"3개월 연율"},
 TRIM16_CPI:{label:"16% Trimmed Mean CPI",unit:"%",note:"3개월 연율"},
 HEADLINE_PCE:{label:"Headline PCE",unit:"%",note:"YoY · 초기발표 빈티지"},
 INF_EXPECT:{label:"5Y 기대 인플레이션",unit:"%",note:"수준"},
 WTI:{label:"WTI",unit:"%",note:"3개월 변화"},
 GASOLINE:{label:"미국 휘발유",unit:"%",note:"3개월 변화"},
 PPI_FINAL:{label:"PPI Final Demand",unit:"%",note:"3개월 연율"},
 PPI_CORE_FD:{label:"Core PPI Final Demand",unit:"%",note:"3개월 연율"},
 IMPORT_EX_FUEL:{label:"수입물가 ex Fuel",unit:"%",note:"YoY"},
 WAGE_YOY:{label:"평균 시간당 임금",unit:"%",note:"YoY"},
 ECI_COST:{label:"Employment Cost Index",unit:"%",note:"YoY"},
 UNIT_LABOR_COST:{label:"Unit Labor Cost",unit:"",note:"저장값"},
 INDPRO:{label:"산업생산",unit:"%",note:"3개월 연율"},
};

const developmentCandidates=[
 "Shelter CPI",
 "Core Services ex-Housing",
 "Supercore Services",
 "Michigan Inflation Expectations",
 "NY Fed Inflation Expectations",
 "ISM Prices Paid",
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
function tone(score:number|null|undefined){
 const s=stage(score);
 return s.includes("압력")?"fear":s.includes("안정")?"greed":"neutral";
}
function formatRaw(feature:string,row:FeatureRow|null|undefined){
 if(!row||typeof row.value!=="number"||!Number.isFinite(row.value))return "—";
 const meta=featureMeta[feature];
 const digits=Math.abs(row.value)>=100?1:2;
 return `${row.value.toFixed(digits)}${meta?.unit??""}`;
}

export default function InflationPanel(){
 const [payload,setPayload]=useState<InflationPayload|null>(null);
 const [loading,setLoading]=useState(true);
 const [period,setPeriod]=useState<3|6|12>(12);

 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/inflation-detail",{cache:"no-store",signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<InflationPayload>})
   .then(setPayload).catch(()=>setPayload(null)).finally(()=>setLoading(false));
  return()=>controller.abort();
 },[]);

 const score=typeof payload?.score==="number"&&Number.isFinite(payload.score)?payload.score:null;
 const allTrend=useMemo(()=>Array.isArray(payload?.trend)?payload!.trend!.filter(p=>typeof p.value==="number"&&Number.isFinite(p.value)):[],[payload?.trend]);
 const trend=allTrend.slice(-period).map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint));
 const latest=trend.at(-1);
 const latestPoint:MarketFearGreedChartValidPoint|null=latest&&typeof latest.score==="number"?{date:latest.date,score:latest.score}:null;
 const axisLabels=new Map(trend.map(p=>[p.date,p.date.slice(5,7)]));
 const axisTicks=trend.filter((_,i)=>i===0||i===trend.length-1||i%2===0).map(p=>p.date);
 const previous=allTrend.at(-2)?.value;
 const threeMonth=allTrend.at(-4)?.value;
 const previousDelta=score!==null&&typeof previous==="number"?score-previous:null;
 const threeMonthDelta=score!==null&&typeof threeMonth==="number"?score-threeMonth:null;
 const axes=payload?.axes??{};
 const features=payload?.features??{};
 const readyAxes=axisDefs.filter(x=>typeof axes[x.id]==="number").length;

 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell inflation-target-card" data-testid="inflation-detail-hero" data-market-state={loading?"loading":score===null?"unavailable":"ready"} aria-busy={loading}>
   <div className="fg-header-slot">
    <MarketCardHeader
     flag="/flags/us.svg"
     eyebrow="ZGMINI INFLATION R2"
     title="미국 인플레이션"
     description="Stored PIT History · 7축"
     dateLabel="데이터 기준일"
     date={dateLabel(payload?.asOfDate)}
     source={payload?.methodologyVersion??"INFLATION_R2"}
    />
   </div>
   <div className="fg-content-slot">
    <div className="fg-score-slot">
     <MarketScoreOrb
      score={loading||score===null?"—":score.toFixed(1)}
      state={loading?"확인 중":stage(score)}
      variant="hero"
      dayDelta={previousDelta}
      periodDelta={threeMonthDelta}
      periodLabel="3개월 대비"
      dayLabel="전월 대비"
      comparisonAriaLabel="인플레이션 안정성 점수 변화"
      metaDate={dateLabel(payload?.asOfDate)}
     />
    </div>
    <MarketTrendFrame className="fg-analysis-slot">
     <div className="fg-period-slot">
      <div role="group" aria-label="인플레이션 점수 추이 기간" className="cnn-period-toolbar">
       {[3,6,12].map(n=><button key={n} type="button" className="cnn-period-button" aria-pressed={period===n} onClick={()=>setPeriod(n as 3|6|12)}>{n===12?"1년":`${n}개월`}</button>)}
      </div>
     </div>
     <div className="fg-chart-slot">
      <div className="fg-renderer">
       <MarketFearGreedChart data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey={String(period)} gradientId="inflation-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"이력 없음"}/>
      </div>
     </div>
    </MarketTrendFrame>
   </div>
   <div className="fg-footer-slot">
    <div className="cnn-panel-note"><span>데이터 출처</span><strong>저장된 초기발표 이력만 사용 · Live fallback 없음</strong></div>
   </div>
  </section>

  <section className="cnn-education-panel" aria-labelledby="inflation-detail-title">
   <header className="cnn-education-header">
    <div>
     <p className="cnn-eyebrow">INFLATION R2 · 7 VALIDATED AXES</p>
     <h1 id="inflation-detail-title">인플레이션을 7개 축으로 이해하기</h1>
     <p>대시보드의 대표 4개만 반복하지 않고 Inflation R2의 전체 7개 축과 실제 하위 지표를 모두 보여줍니다.</p>
    </div>
    <div className="cnn-education-status" aria-label="확인된 인플레이션 축 수"><strong>{loading?"—":`${readyAxes}/7`}</strong><span>현재 확인된 축</span></div>
   </header>

   <div className="cnn-method-strip">
    <div><strong>저장 원자료</strong><span>초기발표 PIT / PCE same-vintage</span></div>
    <b aria-hidden="true">→</b>
    <div><strong>16개 하위 feature</strong><span>실제 저장값을 정규화</span></div>
    <b aria-hidden="true">→</b>
    <div><strong>7개 축 평균</strong><span>높을수록 물가 안정</span></div>
   </div>

   <div className="cnn-composite-formula" aria-label="Inflation R2 종합점수 구조">
    <div><span>검증 축</span><strong>{loading?"—":`${readyAxes}/7`}</strong></div>
    <b aria-hidden="true">× 동일비중</b>
    <div><span>산식</span><strong>1 / 7</strong></div>
    <b aria-hidden="true">→</b>
    <div className="is-total"><span>현재 안정성 점수</span><strong>{score===null?"—":score.toFixed(1)}</strong></div>
   </div>
   <p className="cnn-composite-caption">Inflation R2의 승인 산식과 저장 데이터만 읽습니다. 상세페이지가 별도 점수를 계산하거나 대시보드 점수를 대체하지 않습니다.</p>

   <div className="cnn-score-guide" aria-label="인플레이션 안정성 점수 해석 구간">
    <span><b>0–&lt;25</b><small>강한 물가 압력</small></span>
    <span><b>25–&lt;45</b><small>물가 압력</small></span>
    <span><b>45–&lt;60</b><small>중립</small></span>
    <span><b>60–&lt;75</b><small>안정</small></span>
    <span><b>75–100</b><small>매우 안정</small></span>
   </div>

   <section className="cnn-component-overview" aria-labelledby="inflation-overview-title">
    <div className="cnn-component-overview-head"><div><p className="cnn-eyebrow">CURRENT AXIS SNAPSHOT</p><h2 id="inflation-overview-title">7개 축 한눈에 보기</h2></div><span>축 점수 → 상태 → 구성 지표 순서로 읽으세요.</span></div>
    <div className="cnn-component-overview-list" role="list">
     {axisDefs.map((def,index)=>{
      const value=typeof axes[def.id]==="number"?axes[def.id]!:null;
      return <div className="cnn-component-overview-row" data-tone={tone(value)} role="listitem" key={def.id}>
       <div className="cnn-component-overview-name"><span>{String(index+1).padStart(2,"0")}</span><strong>{def.title}</strong></div>
       <div className="cnn-component-overview-value"><small>축 점수</small><strong>{value===null?"—":value.toFixed(1)}</strong></div>
       <div className="cnn-component-overview-score"><small>구성 지표</small><strong>{def.features.length}개</strong></div>
       <div className="cnn-component-overview-rating"><small>현재 상태</small><strong>{stage(value)}</strong></div>
      </div>;
     })}
    </div>
   </section>

   <div className="cnn-component-education-grid">
    {axisDefs.map((def,index)=>{
     const axisScore=typeof axes[def.id]==="number"?axes[def.id]!:null;
     return <article className="cnn-education-card" key={def.id} data-tone={tone(axisScore)} data-layout={index===axisDefs.length-1?"wide":"standard"}>
      <div className="cnn-education-card-head"><span className="cnn-component-number">{String(index+1).padStart(2,"0")}</span><div><h2>{def.title}</h2><p>{def.question}</p></div><span className="cnn-component-rating">{stage(axisScore)}</span></div>
      <p className="cnn-component-meaning">{def.meaning}</p>

      <div className="cnn-component-metrics">
       <div><span>축 점수</span><strong>{axisScore===null?"—":`${axisScore.toFixed(1)} / 100`}</strong></div>
       <div><span>구성 지표</span><strong>{def.features.length}개</strong></div>
       <div><span>기준일</span><strong>{dateLabel(payload?.asOfDate)}</strong></div>
       <div className="cnn-component-score"><span>산식 상태</span><strong>{axisScore===null?"확인 필요":"READY"}</strong></div>
      </div>

      <div className="cnn-component-scorebar" aria-label={axisScore===null?`${def.title} 점수 확인 필요`:`${def.title} 점수 ${axisScore.toFixed(1)}점`}>
       <div className="cnn-component-scorebar-track">{axisScore!==null?<i style={{left:`${axisScore}%`}} aria-hidden="true"/>:null}</div>
       <div className="cnn-component-scorebar-ticks" aria-hidden="true"><span>0</span><span>25</span><span>45</span><span>60</span><span>75</span><span>100</span></div>
      </div>

      <div className="cnn-component-direction" aria-label={`${def.title} 해석 방향`}><span><b>압력 방향</b>{def.pressure}</span><span><b>안정 방향</b>{def.stable}</span></div>

      <div className="cnn-component-reading-grid">
       <div className="cnn-component-reading is-raw">
        <strong>실제 하위 지표</strong>
        {def.features.map(feature=>{
         const row=features[feature]; const meta=featureMeta[feature];
         return <p key={feature}><b>{meta.label}</b> · {formatRaw(feature,row)} · 정규화 {typeof row?.score==="number"?row.score.toFixed(1):"—"}점 <small>({meta.note} · {dateLabel(row?.observationDate)})</small></p>;
        })}
       </div>
       <div className="cnn-component-reading is-score">
        <strong>축 해석</strong>
        <p>{axisScore===null?"검증 가능한 축 점수가 없습니다.":`${axisScore.toFixed(1)} / 100 · ${stage(axisScore)}. 이 값은 해당 축의 승인 구성요소만으로 계산된 저장 이력 기반 점수입니다.`}</p>
        <small>임의값·실시간 provider fallback을 사용하지 않습니다.</small>
       </div>
      </div>
     </article>;
    })}
   </div>

   <section className="cnn-component-overview" aria-labelledby="inflation-dev-title">
    <div className="cnn-component-overview-head"><div><p className="cnn-eyebrow">NEXT INDICATORS</p><h2 id="inflation-dev-title">추가 예정 지표</h2></div><span>아직 승인 데이터 연결 전이므로 숫자를 표시하지 않습니다.</span></div>
    <div className="cnn-component-overview-list" role="list">
     {developmentCandidates.map((name,index)=><div className="cnn-component-overview-row" data-tone="neutral" role="listitem" key={name}>
      <div className="cnn-component-overview-name"><span>{String(index+1).padStart(2,"0")}</span><strong>{name}</strong></div>
      <div className="cnn-component-overview-value"><small>현재값</small><strong>—</strong></div>
      <div className="cnn-component-overview-score"><small>점수</small><strong>—</strong></div>
      <div className="cnn-component-overview-rating"><small>상태</small><strong>개발 작업중...</strong></div>
     </div>)}
    </div>
   </section>

   <aside className="cnn-education-note"><strong>데이터 원칙</strong><p>API는 저장 전용, 상세페이지와 산식은 저장된 데이터만 읽습니다. 현재 연결되지 않은 지표는 이름만 공개하고 ‘개발 작업중...’으로 표시합니다.</p></aside>
   <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
  </section>
 </>;
}
