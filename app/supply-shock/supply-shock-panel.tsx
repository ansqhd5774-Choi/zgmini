"use client";
import {useStoredIndex} from '../../components/use-stored-index';
import {ContentHelp} from '../content-help';
import {HelpText} from '../help-copy';


import {useMemo,useRef,useState,type FocusEvent} from "react";
import {Info} from "lucide-react";
import {MarketCardHeader} from "../market-card-header";
import {MarketScoreOrb} from "../market-score-orb";
import {MarketTrendFrame} from "../market-trend-frame";
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from "../market-fear-greed-chart";

type Row={id:string;name:string;status:string;score:number|null;value:number|null;unit:string;observationDate:string|null;source:string;weight:number};
type Payload={status:string;score:number|null;asOfDate?:string|null;scoreObservationMonth?:string;methodologyVersion?:string;notes?:string[];missingFactors?:string[];indicators?:Row[];trend?:Array<{label:string;value:number}>};

const meta:Record<string,{label:string;content:string;criterion:string;help:string}>={
 G:{label:'글로벌 공급망 압력',content:'NY Fed GSCPI의 공급망 압력',criterion:'압력이 낮을수록 양호',help:'세계 운송·제조업 자료를 종합합니다. 정규분포 함수로 변환한 위험점수이며 충격 발생 확률이 아닙니다. 가중치 35%입니다.'},
 E:{label:'미국 석유 공급 제약',content:'재고·생산·정제 자료의 수요 통제 잔차',criterion:'물량 부족 압력이 낮을수록 양호',help:'EIA 재고·생산·정제·수출입·제품 공급량으로 계절성과 수요 영향을 줄입니다. 공급 원인을 확정하는 지표는 아닙니다. 가중치 25%입니다.'},
 O:{label:'에너지 가격 충격',content:'WTI·휘발유 가격의 예상 밖 변화',criterion:'상승 압력이 낮을수록 양호',help:'저장된 가격 변화에서 자기 시차·수요 또는 원유 가격 영향을 통제한 잔차를 평가합니다. 가중치 15%입니다.'},
 P:{label:'공급 주도 물가 압력',content:'SF Fed 근원 PCE 공급 주도 월간 기여도',criterion:'물가 압력이 낮을수록 양호',help:'가격과 수량 변화로 분리한 공급 주도 근원 PCE 기여도를 사용합니다. 불분명한 항목은 공급으로 편입하지 않습니다. 가중치 15%입니다.'},
 I:{label:'산업생산 충격',content:'실질 소비 영향을 통제한 생산 변화',criterion:'생산 감소 압력이 낮을수록 양호',help:'산업생산 변화에서 실질 소비지수 변화와 자기 시차를 통제한 잔차를 평가합니다. 가중치 10%입니다.'},
 gscpi:{label:"NY Fed GSCPI",content:"글로벌 공급망 압력의 종합 상태",criterion:"낮은 압력·높은 점수",help:"운송비·배송시간 등 글로벌 공급망 압력을 종합한 지수입니다. 압력이 낮을수록 공급 충격 방어에 긍정적입니다."},
 oilShock:{label:"WTI 유가충격",content:"WTI의 1개월·3개월 급등 충격",criterion:"급등이 작을수록 양호",help:"최근 1개월과 3개월 로그변화 중 더 큰 양의 충격을 사용합니다. 급격한 유가 상승은 생산·운송비를 높일 수 있습니다."},
 gasolineShock:{label:"휘발유 충격",content:"휘발유 가격의 단기 급등 충격",criterion:"급등이 작을수록 양호",help:"소비자 체감 에너지비용과 운송비 상승 압력을 빠르게 포착합니다."},
 copperShock:{label:"구리 충격",content:"구리 가격의 단기 급등 충격",criterion:"급등이 작을수록 양호",help:"산업 원자재 가격의 급등은 제조업 비용 상승과 공급 제약을 반영할 수 있습니다."},
 industrialProduction:{label:"산업생산",content:"최근 3개월 산업생산의 연율 성장",criterion:"강하고 안정적일수록 양호",help:"공급 충격이 실제 생산 위축으로 번지는지 확인합니다. 성장률이 장기분포에서 높을수록 긍정적입니다."},
 headlineCoreGap:{label:"Headline-Core 물가괴리",content:"헤드라인 CPI와 근원 CPI의 상승률 차이",criterion:"격차 확대가 작을수록 양호",help:"에너지·식품 등 공급측 가격이 근원물가보다 얼마나 더 강하게 오르는지 봅니다. 격차 확대는 공급 충격 신호가 될 수 있습니다."},
};
const order=['G','E','O','P','I'] as const;
const dev=[
 ["운임지수","해상·컨테이너 운임의 급등 여부","급등 없음","운송비 급등을 추가 공급망 스트레스 지표로 연결할 예정입니다."],
 ["배송지연","공급업체 납기 지연 정도","지연 완화","기업 현장에서 나타나는 공급 병목을 추가할 예정입니다."],
 ["반도체 공급","핵심 부품 공급 제약","제약 완화","제조업 핵심 부품 병목을 별도 지표로 추가할 예정입니다."],
 ["식품 원자재","곡물·식품 원자재 충격","급등 없음","에너지 외 식품 공급충격을 보조지표로 추가할 예정입니다."],
] as const;

function dateLabel(v?:string|null){if(!v)return "—";const d=new Date(v.length===10?v+"T00:00:00Z":v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeZone:"Asia/Seoul"}).format(d):v}
function stage(s:number|null|undefined){if(typeof s!=="number"||!Number.isFinite(s))return "데이터 준비 중";if(s>=75)return "매우 양호";if(s>=60)return "양호";if(s>=45)return "중립";if(s>=25)return "공급 주의";return "공급 충격 위험"}
function judge(s:number|null|undefined,status?:string){if(status!=="READY"||typeof s!=="number"||!Number.isFinite(s))return {label:"데이터 준비 중",tone:"neutral"};if(s>=60)return {label:"긍정",tone:"positive"};if(s>=45)return {label:"중립",tone:"neutral"};return {label:"부정",tone:"negative"}}
function fmt(r:Row|null|undefined){if(!r||typeof r.value!=="number"||!Number.isFinite(r.value))return "—";const n=Math.abs(r.value)>=100?1:3;return r.value.toFixed(n)+(r.unit?" "+r.unit:"")}
function HelpTip({label,text}:{label:string;text:string}){return <ContentHelp label={label+' 도움말'}><HelpText copy={{meaning:text,reading:'원자료의 단위와 기준선, 관측일을 함께 확인하세요. 원자료의 상승·하락과 시장 평가 점수의 상승·하락은 서로 다를 수 있습니다.',note:'자료가 없거나 개발 중인 항목은 숫자를 표시하지 않습니다. 「—」는 0이 아닙니다.'}}/></ContentHelp>;}

export default function SupplyShockPanel(){
 const {payload,loading}=useStoredIndex<Payload>('/api/supply-shock-detail');
 const score=typeof payload?.score==="number"&&Number.isFinite(payload.score)?payload.score:null;
 const trend=useMemo(()=>(payload?.trend??[]).filter(p=>typeof p.value==="number"&&Number.isFinite(p.value)).map(p=>({date:p.label,score:p.value} satisfies MarketFearGreedChartPoint)),[payload?.trend]);
 const latest=trend.at(-1),latestPoint:MarketFearGreedChartValidPoint|null=latest?{date:latest.date,score:latest.score as number}:null;
 const axisTicks=trend.filter((_,i)=>i===0||i===trend.length-1||i%Math.max(1,Math.ceil((trend.length-1)/4))===0).map(p=>p.date),axisLabels=new Map(trend.map(p=>[p.date,p.date.slice(2,7).replace("-","/")]));
 const previous=trend.at(-2)?.score,first=trend.at(0)?.score;
 const rows=new Map((payload?.indicators??[]).map(x=>[x.id,x]));
 return <>
  <section className="cnn-reference-panel fg-card fg-shared-shell supply-shock-target-card" data-testid="supply-shock-detail-hero" data-market-state={loading?"loading":score===null?"unavailable":"ready"} aria-busy={loading}>
   <div className="fg-header-slot"><MarketCardHeader flag="/flags/us.svg" eyebrow="ZGMINI SUPPLY SHOCK R10" title="미국 공급 충격" description="5개 평가 영역 · 높은 점수는 낮은 공급 충격 위험" dateLabel="공통 기준월" date={payload?.scoreObservationMonth??'—'} source={payload?.methodologyVersion??"SUPPLY_SHOCK_R10"}/></div>
   <div className="fg-content-slot">
    <div className="fg-score-slot"><MarketScoreOrb score={loading||score===null?"—":score.toFixed(1)} state={loading?"확인 중":stage(score)} variant="hero" dayDelta={score!==null&&typeof previous==="number"?score-previous:null} periodDelta={score!==null&&typeof first==="number"&&trend.length>1?score-first:null} periodLabel="1년 내 첫 점 대비" dayLabel="이전 대비" comparisonAriaLabel="공급 충격 안전점수 변화" metaDate={dateLabel(payload?.asOfDate)}/></div>
    <MarketTrendFrame className="fg-analysis-slot"><div className="fg-chart-slot"><div className="fg-renderer"><MarketFearGreedChart data={trend} axisTicks={axisTicks} axisLabels={axisLabels} latestPoint={latestPoint} instanceKey="supply-shock-1y" gradientId="supply-shock-fill" formatTooltipLabel={dateLabel} emptyLabel={loading?"확인 중":"계산 가능한 최근 1년 이력 없음"}/></div></div></MarketTrendFrame>
   </div>
   <div className="fg-footer-slot"><div className="cnn-panel-note"><span>차트 원칙</span><strong>최근 1년 · 계산 가능한 실제 월간점수만 표시 · 임의 보간 없음</strong></div></div>
  </section>

  <section className="inflation-explainer" aria-labelledby="supply-shock-what-title">
   <p className="cnn-eyebrow">WHAT IS A SUPPLY SHOCK?</p><h1 id="supply-shock-what-title">공급 충격이란?</h1>
   <p>공급망 압력 35%, 미국 석유 공급 제약 25%, 에너지 가격 충격 15%, 공급 주도 물가 압력 15%, 산업생산 충격 10%를 종합합니다. 높은 점수는 관측된 공급 충격 위험이 낮다는 뜻이며 발생 확률이 아닙니다. 총 12개 입력 자료를 사용합니다.</p>
   <p>현재 수정 자료로 재구성한 월간 이력입니다. 수요 영향을 통계적으로 줄인 결과이며 공급 원인을 확정하지 않습니다. 당시 발표본 기준 검증은 미완료입니다.</p>
  </section>

  <section className="inflation-indicator-section" aria-labelledby="supply-shock-indicator-title"><header><div><p className="cnn-eyebrow">SUPPLY SHOCK INDICATORS</p><h2 id="supply-shock-indicator-title">공급 충격 분석 지표</h2></div><p>실제 저장 입력으로 계산 가능한 값만 표시합니다. <b>긍정 / 중립 / 부정</b>은 각 안전점수 기준이며 ⓘ에서 해석 방향을 확인하세요.</p></header>
   <div className="inflation-table-wrap"><table className="inflation-indicator-table"><thead><tr><th>지표</th><th>내용</th><th>기준</th><th>현재</th><th>판단</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead><tbody>
    {order.map(id=>{const r=rows.get(id),m=meta[id],j=judge(r?.score,r?.status);return <tr key={id} data-judgement={j.tone}><th scope="row"><strong>{m.label}</strong><small>저장 데이터</small></th><td>{m.content}</td><td>{m.criterion}</td><td><strong>{fmt(r)}</strong><small>{r?.status==="READY"?"내부점수 "+(r.score?.toFixed(1)??"—")+" · "+dateLabel(r.observationDate):"저장 입력 또는 이력 준비 중"}</small></td><td><span className="inflation-judgement">{j.label}</span></td><td><HelpTip label={m.label} text={m.help}/></td></tr>})}
    {dev.map(item=><tr key={item[0]} data-development="true"><th scope="row"><strong>{item[0]}</strong></th><td>{item[1]}</td><td>{item[2]}</td><td>—</td><td><span className="inflation-judgement is-development">개발중</span></td><td><HelpTip label={item[0]} text={item[3]+" 현재 ZGmini 데이터 연결 개발 중입니다."}/></td></tr>)}
   </tbody></table></div>
  </section>
  <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
 </>;
}
