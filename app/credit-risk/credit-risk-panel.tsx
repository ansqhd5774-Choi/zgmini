"use client";

import {useEffect,useMemo,useRef,useState,type FocusEvent} from "react";
import {Info} from "lucide-react";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";

type Row={id:string;name:string;score:number|null;value:number|null;unit:string;observationDate:string|null;source:string;weight?:number};
type Payload={status:string;score:number|null;asOfDate?:string|null;methodologyVersion?:string;core?:Row[];supplementals?:Row[];trend?:Array<{label:string;value:number}>};

const meta:Record<string,{label:string;content:string;criterion:string;help:string}>={
 hyCmdi:{label:"HY CMDI",content:"고위험 회사채 시장의 신용 스트레스",criterion:"낮은 원지수·높은 점수",help:"HY CMDI 원지수는 0에 가까울수록 스트레스가 낮습니다. ZGmini 점수는 이를 반대로 변환해 높을수록 양호하게 표시합니다."},
 igCmdi:{label:"IG CMDI",content:"투자등급 회사채 시장의 신용 스트레스",criterion:"낮은 원지수·높은 점수",help:"IG CMDI가 높아지면 투자등급 회사채 시장의 스트레스가 커진 것입니다. ZGmini 점수는 높을수록 양호합니다."},
 totalCmdi:{label:"Total CMDI",content:"회사채 시장 전체의 종합 스트레스",criterion:"낮은 원지수·높은 점수",help:"NY Fed Market CMDI를 사용합니다. 전체 회사채 시장의 스트레스가 낮을수록 신용 위험 방어에 긍정적입니다."},
 bondVolatility:{label:"채권 변동성",content:"미 국채 금리 전반의 20일 변동성",criterion:"정규화 60점↑",help:"국채시장 변동성이 커지면 회사채 가격발견과 자금조달 여건에도 부담이 될 수 있습니다. 정규화 점수가 높을수록 양호합니다."},
 nfciCredit:{label:"NFCI Credit",content:"시카고 연은의 신용여건 세부지수",criterion:"정규화 60점↑",help:"NFCI Credit은 금융시장의 신용 긴축 정도를 보여줍니다. 현재 메인 신용 위험 산식에는 들어가지 않고 보조지표로 표시합니다."},
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

function dateLabel(v?:string|null){if(!v)return "—";const d=new Date(v.length===10?v+"T00:00:00Z":v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeZone:"Asia/Seoul"}).format(d):v}
function stage(s:number|null|undefined){if(typeof s!=="number"||!Number.isFinite(s))return "확인 필요";if(s>=75)return "매우 양호";if(s>=60)return "양호";if(s>=45)return "중립";if(s>=25)return "신용 주의";return "신용 위험"}
function judge(s:number|null|undefined){if(typeof s!=="number"||!Number.isFinite(s))return {label:"확인 필요",tone:"neutral"};if(s>=60)return {label:"긍정",tone:"positive"};if(s>=45)return {label:"중립",tone:"neutral"};return {label:"부정",tone:"negative"}}
function fmt(r:Row|null|undefined){if(!r||typeof r.value!=="number"||!Number.isFinite(r.value))return "—";const a=Math.abs(r.value),n=a>=100?1:3;return r.value.toFixed(n)+(r.unit?" "+r.unit:"")}
function HelpTip({label,text}:{label:string;text:string}){const [open,setOpen]=useState(false);const root=useRef<HTMLSpanElement>(null);useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close)},[open]);const blur=(e:FocusEvent<HTMLSpanElement>)=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)};return <span ref={root} className="inflation-help" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onBlur={blur}><button type="button" aria-label={label+" 해석 방향"} aria-expanded={open} onFocus={()=>setOpen(true)} onClick={e=>{e.stopPropagation();setOpen(v=>!v)}}><Info size={14}/></button>{open?<span role="tooltip"><strong>해석 방향</strong>{text}</span>:null}</span>}

export default function CreditRiskPanel(){
 const [payload,setPayload]=useState<Payload|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{const c=new AbortController();fetch("/api/credit-risk-detail",{cache:"no-store",signal:c.signal}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<Payload>}).then(setPayload).catch(()=>setPayload(null)).finally(()=>setLoading(false));return()=>c.abort()},[]);
 const score=typeof payload?.score==="number"&&Number.isFinite(payload.score)?payload.score:null;
 const trend=useMemo(()=>(payload?.trend??[]).filter(p=>typeof p.value==="number"&&Number.isFinite(p.value)).map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint)),[payload?.trend]);
 const latest=trend.at(-1),latestPoint:MarketFearGreedChartValidPoint|null=latest?{date:latest.date,score:latest.score as number}:null;
 const axisTicks=trend.filter((_,i)=>i===0||i===trend.length-1||i%4===0).map(p=>p.date),axisLabels=new Map(trend.map(p=>[p.date,p.date.slice(5).replace("-","/")]));
 const prev=trend.at(-2)?.score,first=trend.at(0)?.score;
 const rows=new Map([...(payload?.core??[]),...(payload?.supplementals??[])].map(x=>[x.id,x]));

 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell credit-risk-target-card" data-testid="credit-risk-detail-hero" data-market-state={loading?"loading":score===null?"unavailable":"ready"} aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI CREDIT RISK" title="미국 신용 위험" description="Current vintage · 1Y derived history" dateLabel="데이터 기준일" date={dateLabel(payload?.asOfDate)} source={payload?.methodologyVersion??"CREDIT_RISK_R1"}/></div>
   <div className="fg-content-slot">
    <div className="fg-score-slot"><MarketScoreOrb score={loading||score===null?"—":score.toFixed(1)} state={loading?"확인 중":stage(score)} variant="hero" dayDelta={score!==null&&typeof prev==="number"?score-prev:null} periodDelta={score!==null&&typeof first==="number"&&trend.length>1?score-first:null} periodLabel="1년창 대비" dayLabel="이전 대비" comparisonAriaLabel="신용 위험 방어점수 변화" metaDate={dateLabel(payload?.asOfDate)}/></div>
    <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey="credit-1y" gradientId="credit-risk-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"이력 없음"}/></div></div></MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>차트 원칙</span><strong>최근 1년 Current Vintage 계산 · 미래값 사용 없음</strong></div></div>
  </section>

  <section className="inflation-explainer" aria-labelledby="credit-what-title"><p className="cnn-eyebrow">WHAT IS CREDIT RISK?</p><h1 id="credit-what-title">신용 위험이란?</h1><p>신용 위험은 기업이나 차입자가 약속한 이자와 원금을 제때 갚지 못할 가능성과, 그 가능성을 시장이 더 비싸게 평가하는 정도를 뜻합니다. 회사채 스트레스, 금융여건, 금리 변동성이 함께 악화되면 기업의 자금조달 비용이 급격히 올라갈 수 있습니다.</p><div className="inflation-direction-strip"><span><b>위험 방향</b>CMDI↑ · 신용긴축↑ · 채권변동성↑ · 스프레드↑</span><span><b>안정 방향</b>CMDI↓ · 자금조달 안정 · 채권변동성↓</span></div></section>

  <section className="inflation-indicator-section" aria-labelledby="credit-indicator-title"><header><div><p className="cnn-eyebrow">CREDIT RISK INDICATORS</p><h2 id="credit-indicator-title">신용 위험 분석 지표</h2></div><p>실제 현재값과 내부 점수를 함께 보고 <b>긍정 / 중립 / 부정</b>으로 단순화했습니다. ⓘ에서 해석 방향을 확인하세요.</p></header>
   <div className="inflation-table-wrap"><table className="inflation-indicator-table"><thead><tr><th>지표</th><th>내용</th><th>기준</th><th>현재</th><th>판단</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead><tbody>
    {order.map(id=>{const r=rows.get(id),m=meta[id],j=judge(r?.score);return <tr key={id} data-judgement={j.tone}><th scope="row"><strong>{m.label}</strong><small>저장 데이터</small></th><td>{m.content}</td><td>{m.criterion}</td><td><strong>{fmt(r)}</strong><small>내부점수 {typeof r?.score==="number"?r.score.toFixed(1):"—"} · {dateLabel(r?.observationDate)}</small></td><td><span className="inflation-judgement">{j.label}</span></td><td><HelpTip label={m.label} text={m.help}/></td></tr>})}
    {dev.map(item=><tr key={item[0]} data-development="true"><th scope="row"><strong>{item[0]}</strong></th><td>{item[1]}</td><td>{item[2]}</td><td>—</td><td><span className="inflation-judgement is-development">개발중</span></td><td><HelpTip label={item[0]} text={item[3]+" 현재 ZGmini 데이터 연결 개발 중입니다."}/></td></tr>)}
   </tbody></table></div>
  </section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
