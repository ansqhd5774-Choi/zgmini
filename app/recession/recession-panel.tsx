"use client";

import {useEffect,useMemo,useRef,useState,type FocusEvent} from "react";
import {Info} from "lucide-react";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";

type ComponentRow={id:string;value:number|null;score:number|null;observationDate:string|null;weight:number};
type SupplementalRow={id:string;name:string|null;status:string;score:number|null;value:number|null;displayValue:string|null;unit:string|null;observationDate:string|null;source:string|null};
type Payload={
 status:string;score:number|null;asOfDate?:string|null;methodologyVersion?:string;historyMode?:string;lookAheadSafe?:boolean;
 trend?:Array<{label:string;value:number}>;components?:ComponentRow[];supplementals?:SupplementalRow[];
};

const componentMeta:Record<string,{label:string;content:string;unit:string;criterion:string;help:string}>={
 nfp:{label:"비농업고용",content:"고용자 수의 최근 3개월 성장 속도",unit:"%",criterion:"정규화 60점↑",help:"고용 성장률이 장기 분포에서 높을수록 경기 방어에 긍정적입니다. 지속적인 고용 감소는 침체 위험을 높입니다."},
 realGdp:{label:"실질 GDP",content:"물가효과를 제거한 경제 전체 생산",unit:"%",criterion:"정규화 60점↑",help:"2개 분기의 실질 GDP 성장 속도를 봅니다. 장기 분포보다 강하면 긍정적이고 수축하면 부정적입니다."},
 industrialProduction:{label:"산업생산",content:"광공업·제조업 생산 활동",unit:"%",criterion:"정규화 60점↑",help:"최근 3개월 생산 속도가 장기 분포에서 높을수록 긍정적입니다. 생산 감소가 이어지면 침체 신호로 봅니다."},
 realPce:{label:"실질 PCE",content:"물가효과를 제거한 개인소비지출",unit:"%",criterion:"정규화 60점↑",help:"미국 경제의 핵심인 소비가 실제 구매력 기준으로 증가하는지 봅니다. 실질 소비 둔화·감소는 부정적입니다."},
 sahmGap:{label:"Sahm Gap",content:"실업률 급등 여부를 보는 침체 경보",unit:"%p",criterion:"0.50%p 미만",help:"3개월 평균 실업률이 최근 12개월 최저점보다 0.50%p 이상 높아지면 Sahm Rule 침체 신호로 알려져 있습니다. 낮을수록 안전합니다."},
 retailSales:{label:"실질 소매판매",content:"물가를 제거한 가계 상품소비",unit:"%",criterion:"정규화 60점↑",help:"최근 실질 소매판매 성장률이 장기 분포에서 높을수록 경기 방어에 긍정적입니다."},
 disposableIncome:{label:"실질 가처분소득",content:"가계가 실제로 쓸 수 있는 소득",unit:"%",criterion:"정규화 60점↑",help:"세후·물가조정 소득이 증가하면 소비 지속력이 높아집니다. 둔화나 감소는 경기 방어력을 약화시킵니다."},
};

const supplementalMeta:Record<string,{label:string;content:string;criterion:string;help:string}>={
 initialClaims:{label:"신규 실업수당 4W",content:"해고 증가를 빠르게 포착하는 고용 선행지표",criterion:"정규화 60점↑",help:"청구건수가 낮고 안정적일수록 긍정적입니다. ZGmini의 저장 이력 정규화 점수 60점 이상을 양호 기준으로 봅니다."},
 yieldCurve:{label:"장단기 금리차",content:"금리곡선이 보내는 경기 선행 신호",criterion:"정규화 60점↑",help:"금리곡선은 단순 양·음만으로 판단하지 않고 ZGmini 금리환경 정규화 점수로 봅니다. 낮은 점수는 경기 선행 신호가 불리한 상태를 의미합니다."},
 hyCreditStress:{label:"HY 신용 스트레스",content:"고위험 회사채 시장의 자금경색 정도",criterion:"정규화 60점↑",help:"하이일드 시장 스트레스가 낮을수록 기업 자금조달 환경이 양호합니다. 정규화 점수가 높을수록 긍정적입니다."},
 creditConditions:{label:"신용여건",content:"금융시장의 전반적인 신용 긴축 정도",criterion:"정규화 60점↑",help:"신용이 급격히 긴축되면 기업과 가계 활동이 위축될 수 있습니다. 정규화 점수가 높을수록 경기 방어에 유리합니다."},
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
function HelpTip({label,text}:{label:string;text:string}){
 const [open,setOpen]=useState(false); const root=useRef<HTMLSpanElement>(null);
 useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close)},[open]);
 const blur=(e:FocusEvent<HTMLSpanElement>)=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)};
 return <span ref={root} className="inflation-help" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onBlur={blur}>
  <button type="button" aria-label={`${label} 해석 방향`} aria-expanded={open} onFocus={()=>setOpen(true)} onClick={e=>{e.stopPropagation();setOpen(v=>!v)}}><Info size={14}/></button>
  {open?<span role="tooltip"><strong>해석 방향</strong>{text}</span>:null}
 </span>;
}

export default function RecessionPanel(){
 const [payload,setPayload]=useState<Payload|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{const c=new AbortController();fetch("/api/recession-detail",{cache:"no-store",signal:c.signal}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<Payload>}).then(setPayload).catch(()=>setPayload(null)).finally(()=>setLoading(false));return()=>c.abort()},[]);
 const score=typeof payload?.score==="number"&&Number.isFinite(payload.score)?payload.score:null;
 const trend=useMemo(()=>(payload?.trend??[]).filter(p=>typeof p.value==="number"&&Number.isFinite(p.value)).slice(-12).map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint)),[payload?.trend]);
 const latest=trend.at(-1),latestPoint:MarketFearGreedChartValidPoint|null=latest?{date:latest.date,score:latest.score as number}:null;
 const axisLabels=new Map(trend.map(p=>[p.date,p.date.slice(5,7)])),axisTicks=trend.filter((_,i)=>i===0||i===trend.length-1||i%2===0).map(p=>p.date);
 const previous=trend.at(-2)?.score,threeMonth=trend.at(-4)?.score;
 const components=new Map((payload?.components??[]).map(x=>[x.id,x]));
 const supplementals=payload?.supplementals??[];

 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell recession-target-card" data-testid="recession-detail-hero" data-market-state={loading?"loading":score===null?"unavailable":"ready"} aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI RECESSION R13" title="미국 경기침체" description="Stored inputs · Current vintage" dateLabel="데이터 기준일" date={dateLabel(payload?.asOfDate)} source={payload?.methodologyVersion??"RECESSION_R13"}/></div>
   <div className="fg-content-slot">
    <div className="fg-score-slot"><MarketScoreOrb score={loading||score===null?"—":score.toFixed(1)} state={loading?"확인 중":stage(score)} variant="hero" dayDelta={score!==null&&typeof previous==="number"?score-previous:null} periodDelta={score!==null&&typeof threeMonth==="number"?score-threeMonth:null} periodLabel="3개월 대비" dayLabel="전월 대비" comparisonAriaLabel="경기침체 방어점수 변화" metaDate={dateLabel(payload?.asOfDate)}/></div>
    <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey="1Y" gradientId="recession-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"이력 없음"}/></div></div></MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>데이터 성격</span><strong>저장 입력 기반 Current Vintage · 높을수록 경기 방어 양호</strong></div></div>
  </section>

  <section className="inflation-explainer" aria-labelledby="recession-what-title">
   <p className="cnn-eyebrow">WHAT IS A RECESSION?</p>
   <h1 id="recession-what-title">경기침체란?</h1>
   <p>경기침체는 경제활동이 넓은 범위에서 상당 기간 감소하는 상태입니다. GDP 한 번의 감소만으로 판단하기보다 고용, 생산, 소비, 소득, 신용환경처럼 여러 지표가 동시에 약해지는지를 함께 확인해야 합니다.</p>
   <div className="inflation-direction-strip"><span><b>침체 위험</b>고용↓ · 생산↓ · 소비↓ · 소득↓ · 신용긴축↑</span><span><b>경기 방어</b>고용 유지 · 실질성장 지속 · 소비·소득 견조</span></div>
  </section>

  <section className="inflation-indicator-section" aria-labelledby="recession-indicator-title">
   <header><div><p className="cnn-eyebrow">RECESSION INDICATORS</p><h2 id="recession-indicator-title">경기침체 분석 지표</h2></div><p>현재값과 승인 점수를 함께 보고 <b>긍정 / 중립 / 부정</b>으로 단순화했습니다. ⓘ에서 해석 방향을 확인하세요.</p></header>
   <div className="inflation-table-wrap"><table className="inflation-indicator-table">
    <thead><tr><th>지표</th><th>내용</th><th>기준</th><th>현재</th><th>판단</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead>
    <tbody>
     {Object.entries(componentMeta).map(([id,meta])=>{const row=components.get(id),j=judgement(row?.score);return <tr key={id} data-judgement={j.tone}>
      <th scope="row"><strong>{meta.label}</strong><small>R13 핵심 · 가중치 {row?Math.round(row.weight*100):"—"}%</small></th>
      <td>{meta.content}</td><td>{meta.criterion}</td>
      <td><strong>{fmt(row?.value,meta.unit)}</strong><small>내부점수 {typeof row?.score==="number"?row.score.toFixed(1):"—"} · {dateLabel(row?.observationDate)}</small></td>
      <td><span className="inflation-judgement">{j.label}</span></td><td><HelpTip label={meta.label} text={meta.help}/></td>
     </tr>})}
     {supplementals.map(row=>{const meta=supplementalMeta[row.id];if(!meta)return null;const j=judgement(row.score);return <tr key={row.id} data-judgement={j.tone}>
      <th scope="row"><strong>{meta.label}</strong><small>보조지표 · {row.source??"저장 데이터"}</small></th>
      <td>{meta.content}</td><td>{meta.criterion}</td>
      <td><strong>{row.displayValue??fmt(row.value,row.unit??"")}</strong><small>내부점수 {typeof row.score==="number"?row.score.toFixed(1):"—"} · {dateLabel(row.observationDate)}</small></td>
      <td><span className="inflation-judgement">{j.label}</span></td><td><HelpTip label={meta.label} text={meta.help}/></td>
     </tr>})}
     {developmentCandidates.map(item=><tr key={item.label} data-development="true">
      <th scope="row"><strong>{item.label}</strong></th><td>{item.content}</td><td>{item.criterion}</td><td>—</td>
      <td><span className="inflation-judgement is-development">개발중</span></td><td><HelpTip label={item.label} text={`${item.help} 현재 ZGmini 데이터 연결 개발 중입니다.`}/></td>
     </tr>)}
    </tbody>
   </table></div>
  </section>

  <details className="inflation-methodology">
   <summary>ZGmini 경기침체 점수 산식 보기</summary>
   <div><p>현재 R13 점수는 비농업고용 25%, 실질 GDP 15%, 산업생산 15%, 실질 PCE 15%, 실업률(Sahm Gap) 10%, 실질 소매판매 10%, 실질 가처분소득 10%를 사용합니다.</p><p><b>주의:</b> 현재 R13은 저장된 입력을 사용하지만 Current Vintage 기준이며 point-in-time 빈티지 검증은 아직 완료되지 않았습니다.</p></div>
  </details>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
