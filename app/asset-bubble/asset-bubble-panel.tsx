"use client";
import {ContentHelp} from '../content-help';
import {HelpText} from '../help-copy';


import {useEffect,useMemo,useRef,useState,type FocusEvent} from "react";
import {Info} from "lucide-react";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";

type Row={id:string;name:string;status:string;score:number|null;value:number|null;unit:string;observationDate:string|null;source:string;weight:number};
export type Payload={status:string;score:number|null;asOfDate?:string|null;methodologyVersion?:string;missingFactors?:string[];indicators?:Row[];trend?:Array<{label:string;value:number}>;diagnosticQuarter?:string|null;scoreObservationQuarter?:string|null;sourceStoredAt?:number|null;historyMode?:string;rightsStatus?:string;publicationPolicy?:string;notes?:string[]};
const meta:Record<string,{label:string;content:string;criterion:string;help:string}>={
 valuationPressure:{label:"밸류에이션 압력",content:"주식시장 가치가 명목 GDP 대비 얼마나 높은지 측정",criterion:"장기분포 대비 낮을수록 양호",help:"금융·비금융 상장주식 가치 합계를 명목 GDP와 비교합니다. 장기 분포에서 밸류에이션 압력이 높을수록 버블 위험이 커져 안전점수는 낮아집니다."},
 priceAcceleration:{label:"가격가속",content:"최근 3개월 상승속도가 12개월 추세보다 얼마나 빨라졌는지 측정",criterion:"급격한 가속이 없을수록 양호",help:"단순 수익률이 아니라 단기 가격 상승속도의 가속을 봅니다. 짧은 기간 가격이 장기 추세보다 빠르게 치솟으면 버블 위험 신호가 강해집니다."},
 riskAssetShare:{label:"위험자산 비중",content:"가계·시장 내 위험자산 비중의 4분기 변화",criterion:"급격한 증가가 없을수록 양호",help:"위험자산 비중이 빠르게 커지면 투자자 포지셔닝이 공격적으로 변한 것으로 해석합니다. 장기 분포 대비 증가폭이 작을수록 안전점수가 높습니다."},
 speculativeFlows:{label:"투기성 자금흐름",content:"주가 가속 국면에서 위험자산으로 유입되는 자금 강도",criterion:"가격가속+과도한 유입이 없을수록 양호",help:"가격가속이 양수일 때 최근 자금유입 규모가 장기 분포에서 얼마나 과도한지 봅니다. 가격가속이 없으면 이 구성요소는 안전한 방향으로 처리합니다."},
 breadthDivergence:{label:"시장폭 괴리",content:"지수 상승과 시장 참여 폭 사이의 불균형",criterion:"상승 참여가 넓을수록 양호",help:"소수 종목만 지수를 끌어올리고 상승 참여 종목이 줄면 시장폭 괴리 위험이 커질 수 있습니다. 저장된 승인 시장폭 점수를 사용합니다."},
 excessLiquidity:{label:"과잉유동성",content:"M2 증가율이 명목 GDP 증가율을 웃도는 정도",criterion:"과도한 초과 증가가 없을수록 양호",help:"통화량이 실물경제 성장보다 훨씬 빠르게 늘면 자산가격을 밀어올릴 유동성 압력이 커질 수 있습니다. 장기 분포 대비 초과유동성이 낮을수록 안전점수가 높습니다."},
};
const order=["valuationPressure","priceAcceleration","riskAssetShare","speculativeFlows","breadthDivergence","excessLiquidity"] as const;
const dev=[
 ["주택가격 밸류에이션","주택가격의 소득·임대료 대비 고평가 정도","장기평균 근처","주식 외 부동산 자산의 버블 압력을 별도로 추가할 예정입니다."],
 ["마진대출·레버리지","투자자 레버리지 확대 정도","급증 없음","증권신용과 레버리지 확대가 자산가격 과열과 함께 진행되는지 추가할 예정입니다."],
 ["IPO·신규발행 과열","신규 상장·주식공급의 과열 정도","과도한 발행 없음","신규 주식공급과 IPO 활동이 투기적 과열 수준인지 확인할 예정입니다."],
 ["옵션 투기수요","단기 콜옵션 등 고위험 거래 쏠림","극단적 쏠림 없음","파생상품 시장에서 나타나는 투기적 위험선호를 추가할 예정입니다."],
] as const;

function dateLabel(v?:string|null){if(!v)return "—";const d=new Date(v.length===10?v+"T00:00:00Z":v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeZone:"Asia/Seoul"}).format(d):v}
function stage(s:number|null|undefined){if(typeof s!=="number"||!Number.isFinite(s))return "데이터 준비 중";if(s>=75)return "매우 양호";if(s>=60)return "양호";if(s>=45)return "중립";if(s>=25)return "버블 주의";return "버블 위험"}
function judge(s:number|null|undefined,status?:string){if(status!=="READY"||typeof s!=="number"||!Number.isFinite(s))return {label:"데이터 준비 중",tone:"neutral"};if(s>=60)return {label:"긍정",tone:"positive"};if(s>=45)return {label:"중립",tone:"neutral"};return {label:"부정",tone:"negative"}}
function fmt(r:Row|null|undefined){if(!r||typeof r.value!=="number"||!Number.isFinite(r.value))return "—";const n=Math.abs(r.value)>=100?1:3;return r.value.toFixed(n)+(r.unit?" "+r.unit:"")}
function HelpTip({label,text}:{label:string;text:string}){return <ContentHelp label={label+' 도움말'}><HelpText copy={{meaning:text,reading:'원자료의 단위와 기준선, 관측일을 함께 확인하세요. 원자료의 상승·하락과 시장 평가 점수의 상승·하락은 서로 다를 수 있습니다.',note:'자료가 없거나 개발 중인 항목은 숫자를 표시하지 않습니다. 「—」는 0이 아닙니다.'}}/></ContentHelp>;}

export default function AssetBubblePanel({initialPayload}:{initialPayload?:Payload}={}){
 const [payload,setPayload]=useState<Payload|null>(initialPayload??null),[loading,setLoading]=useState(!initialPayload);
 useEffect(()=>{if(initialPayload){setPayload(initialPayload);setLoading(false);return;}const c=new AbortController();fetch("/api/asset-bubble-detail",{cache:"no-store",signal:c.signal}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<Payload>}).then(setPayload).catch(()=>setPayload(null)).finally(()=>setLoading(false));return()=>c.abort()},[initialPayload]);
 const candidate=payload?.methodologyVersion==='ASSET_BUBBLE_R10_CANDIDATE';
 const publishedCurrentVintage=payload?.publicationPolicy==='USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES';
 const score=(!candidate||payload?.status==='READY')&&typeof payload?.score==="number"&&Number.isFinite(payload.score)?payload.score:null;
 const trend=useMemo(()=>(payload?.trend??[]).filter(p=>typeof p.value==="number"&&Number.isFinite(p.value)).map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint)),[payload?.trend]);
 const latest=trend.at(-1),latestPoint:MarketFearGreedChartValidPoint|null=latest?{date:latest.date,score:latest.score as number}:null;
 const axisTicks=trend.map(p=>p.date),axisLabels=new Map(trend.map(p=>[p.date,p.date.slice(2,7).replace("-","/")]));
 const previous=trend.at(-2)?.score,first=trend.at(0)?.score;
 const rows=new Map((payload?.indicators??[]).map(x=>[x.id,x]));
 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell asset-bubble-target-card" data-testid="asset-bubble-detail-hero" data-market-state={loading?"loading":score===null?"unavailable":"ready"} aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow={candidate?(publishedCurrentVintage?'ZGMINI ASSET BUBBLE R10 · 참고 지표':'ZGMINI ASSET BUBBLE R10 · 연구 후보'):'ZGMINI ASSET BUBBLE R9'} title="미국 자산 버블" description="저장된 현재 개정 자료 기반" dateLabel="데이터 기준일" date={dateLabel(payload?.asOfDate)} source={payload?.methodologyVersion??"ASSET_BUBBLE_R9"}/></div>
   <div className="fg-content-slot">
    <div className="fg-score-slot"><MarketScoreOrb score={loading||score===null?"—":score.toFixed(1)} state={loading?"확인 중":stage(score)} variant="hero" dayDelta={score!==null&&typeof previous==="number"?score-previous:null} periodDelta={score!==null&&typeof first==="number"&&trend.length>1?score-first:null} periodLabel="1년 내 첫 점 대비" dayLabel="이전 분기 대비" comparisonAriaLabel="자산 버블 안전점수 변화" metaDate={dateLabel(payload?.asOfDate)}/></div>
    <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey="asset-bubble-1y" gradientId="asset-bubble-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"계산 가능한 최근 1년 이력 없음"}/></div></div></MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>차트 원칙</span><strong>최근 1년 · 계산 가능한 실제 분기점수만 표시 · 임의 보간 없음</strong></div></div>
  </section>
  {candidate&&<p role="status">종합 상태: {payload?.status} · 평가 분기: {payload?.scoreObservationQuarter??'—'} · 구성요소 진단 분기: {payload?.diagnosticQuarter??'—'} · 최근 저장: {dateLabel(payload?.sourceStoredAt?new Date(payload.sourceStoredAt).toISOString():null)}<br/>{payload?.notes?.join(' ')} {!publishedCurrentVintage&&'공개 전환 전 검증 중입니다.'}</p>}
  <section className="inflation-explainer" aria-labelledby="asset-bubble-what-title">
   <p className="cnn-eyebrow">WHAT IS AN ASSET BUBBLE?</p><h1 id="asset-bubble-what-title">자산 버블이란?</h1>
   <p>자산 버블은 주식·부동산 같은 자산가격이 펀더멘털과 장기 추세에 비해 과도하게 상승하고, 그 과정에서 레버리지와 투기적 자금이 몰리는 상태입니다. 단순히 가격이 높다는 이유만으로 버블이라 판단하지 않고 밸류에이션, 가격가속, 위험선호, 자금흐름, 시장폭, 유동성이 함께 과열되는지를 봐야 합니다.</p>
   <div className="inflation-direction-strip"><span><b>버블 위험</b>고평가↑ · 가격가속↑ · 위험자산 쏠림↑ · 투기자금↑</span><span><b>안정 방향</b>밸류에이션 안정 · 폭넓은 상승 · 유동성 과잉 완화</span></div>
  </section>
  <section className="inflation-indicator-section" aria-labelledby="asset-bubble-indicator-title">
   <header><div><p className="cnn-eyebrow">ASSET BUBBLE INDICATORS</p><h2 id="asset-bubble-indicator-title">자산 버블 분석 지표</h2></div><p>실제 저장 입력으로 계산 가능한 값만 표시합니다. <b>긍정 / 중립 / 부정</b>은 각 구성 안전점수 기준이며, ⓘ에서 해석 방향을 확인하세요.</p></header>
   <div className="inflation-table-wrap"><table className="inflation-indicator-table"><thead><tr><th>지표</th><th>내용</th><th>기준</th><th>현재</th><th>판단</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead><tbody>
    {order.map(id=>{const r=rows.get(id),m=meta[id],j=judge(r?.score,r?.status);return <tr key={id} data-judgement={j.tone}><th scope="row"><strong>{m.label}</strong><small>저장 데이터</small></th><td>{m.content}</td><td>{m.criterion}</td><td><strong>{fmt(r)}</strong><small>{r?.status==="READY"?"내부점수 "+(r.score?.toFixed(1)??"—")+" · "+dateLabel(r.observationDate):"저장 입력 또는 이력 준비 중"}</small></td><td><span className="inflation-judgement">{j.label}</span></td><td><HelpTip label={m.label} text={candidate&&id==='breadthDivergence'?'12개월 지수 수익률과 200일 이동평균 위에 있는 종목 비율의 순위를 비교합니다. 최소 252개 관측을 사용하며, 분기 점수는 세 월말 점수의 평균입니다. 확인되지 않은 가격 불연속 구간은 보류합니다.':m.help}/></td></tr>})}
    {dev.map(item=><tr key={item[0]} data-development="true"><th scope="row"><strong>{item[0]}</strong></th><td>{item[1]}</td><td>{item[2]}</td><td>—</td><td><span className="inflation-judgement is-development">개발중</span></td><td><HelpTip label={item[0]} text={item[3]+" 현재 ZGmini 데이터 연결 개발 중입니다."}/></td></tr>)}
   </tbody></table></div>
  </section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
