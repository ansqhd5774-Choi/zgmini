"use client";
import {useMemo} from "react";
import {useStoredIndex} from "../../components/use-stored-index";
import {INFLATION_CAUSAL_19} from "../../lib/inflation-causal-public-catalog.mjs";
import {InflationMiniChart,type InflationMiniTrendPoint} from "../inflation/inflation-mini-chart";
import {ContentHelp} from "../content-help";
import {EconomicFavoriteButton} from "./economic-favorite-button";

type Observation={id:string;series:string;unit:string;status:"READY"|"PENDING"|"STALE";
 value:number|null;previousValue:number|null;observationDate:string|null;
 previousObservationDate:string|null;sourceStoredAt?:string|null;
 history?:Array<{date:string;value:number}>};
type Snapshot={status:"READY"|"PARTIAL"|"PENDING"|"unavailable";
 schemaVersion?:string;score:null;indicators:Observation[];sourceStoredAt?:number};
const finite=(n:unknown):n is number=>typeof n==="number"&&Number.isFinite(n);
const fmt=(n:number,unit:string)=>Number(n.toFixed(Math.abs(n)>=100?1:3)).toLocaleString("ko-KR")+ " "+unit;
const day=(s?:string|null)=>typeof s==="string"&&/^\d{4}-\d{2}(?:-\d{2})?$/.test(s)?s.replaceAll("-","."):"—";
const dated=(s:unknown)=>typeof s==="string"&&/^\d{4}-\d{2}(?:-\d{2})?$/.test(s);
export default function InflationResearchInputs(){
 const {payload,loading,error}=useStoredIndex<Snapshot>("/api/inflation-causal-inputs");
 const verified=payload&&(payload.status==="READY"||payload.status==="PARTIAL")&&
  payload.schemaVersion==="inflation-causal-public-19-r1-v1"&&
  Array.isArray(payload.indicators)&&payload.indicators.length===19;
 const rows=useMemo(()=>new Map((verified?payload!.indicators:[]).map(x=>[x.id,x])),[payload,verified]);
 return <section className="inflation-indicator-section inflation-r2-indicators economic-indicators" aria-labelledby="economic-inflation-research-inputs">
  <header><div><p className="cnn-eyebrow">RESEARCH INPUTS · STORED DATA</p><h2 id="economic-inflation-research-inputs">물가 관련 수집 원자료 (19개 · 연구용)</h2></div>
   <p>30개 후보 중 현재 원자료가 확보된 19개입니다. <b>최종 선정이나 기존 4개 평가점수 산식의 구성요소로 확정된 것은 아닙니다.</b> 별도 PC 공개 요약이 게시된 값만 표시합니다. 원자료 수치와 평가점수는 다릅니다.</p>
  </header>
  {(loading||error||payload?.status==="PENDING"||payload?.status==="unavailable")&&
   <p className="economic-data-notice" role="status">{loading?"연구용 원자료 공개 요약 확인 중":
    "PC 저장본의 공개 요약 연결 대기 · 기존 점수는 정상적으로 별도 제공됩니다."}</p>}
  <div className="inflation-table-wrap inflation-r2-table-wrap">
   <table className="inflation-indicator-table inflation-indicator-table-r2 economic-table">
    <colgroup>{Array.from({length:10},(_,i)=><col key={i}/>)}</colgroup>
    <thead><tr><th>☆</th><th>지표</th><th>내용</th><th>평가 기준</th><th>이전 원값</th>
      <th>현재 원값</th><th>발표 주기</th><th>판단</th><th>미니차트(1Y)</th><th>ⓘ</th></tr></thead>
    <tbody>{INFLATION_CAUSAL_19.map(meta=>{
     const source=rows.get(meta.id);
     const valid=source?.series===meta.series&&source.unit===meta.unit&&source.status==="READY"&&
       finite(source.value)&&dated(source.observationDate);
     const trend:InflationMiniTrendPoint[]=valid&&Array.isArray(source.history)?source.history.flatMap(p=>
       dated(p.date)&&finite(p.value)?[{date:p.date.length===7?p.date+"-01":p.date,value:p.value}]:[]):[];
     const current=valid?fmt(source.value!,meta.unit):"—";
     const previous=valid&&finite(source.previousValue)?fmt(source.previousValue,meta.unit):"—";
     return <tr key={meta.id} data-judgement="neutral" data-research-input={meta.id}>
      <td><EconomicFavoriteButton domainId="inflation" indicatorId={"research-"+meta.id} label={meta.name}/></td>
      <th scope="row"><strong>{meta.name}</strong><small>{meta.series}</small></th>
      <td>{meta.description}</td><td>원자료 · 점수 미산출</td>
      <td className="inflation-r2-value"><strong>{previous}</strong><small>{valid?day(source.previousObservationDate):"—"}</small></td>
      <td className="inflation-r2-value" data-value-kind={valid?"raw":"missing"}><strong>{current}</strong><small>{valid?"관측 "+day(source.observationDate):"공개 요약 미게시"}</small></td>
      <td className="inflation-r2-release"><strong>{meta.cadence}</strong><small>공식 다음 발표일 —</small></td>
      <td><span className="inflation-judgement">미평가</span></td>
      <td className="inflation-r2-spark-cell"><InflationMiniChart label={meta.name} points={trend}/></td>
      <td><ContentHelp label={meta.name+" 도움말"}><p>{meta.description}</p><p>출처: {meta.source} · 원계열: {meta.series} · 단위: {meta.unit}</p><p>평가 산식·점수 미확정. 자료의 관측월은 공개·저장 시각과 다릅니다.</p></ContentHelp></td>
     </tr>;
    })}</tbody>
   </table>
  </div>
  <div className="inflation-r2-mobile-list">{INFLATION_CAUSAL_19.map(meta=>{
   const source=rows.get(meta.id),valid=source?.series===meta.series&&source.unit===meta.unit&&source.status==="READY"&&finite(source.value)&&dated(source.observationDate);
   const trend:InflationMiniTrendPoint[]=valid&&Array.isArray(source.history)?source.history.flatMap(p=>dated(p.date)&&finite(p.value)?[{date:p.date.length===7?p.date+"-01":p.date,value:p.value}]:[]):[];
   return <article className="inflation-r2-mobile-card" key={meta.id} data-judgement="neutral" data-research-input={meta.id}>
     <div className="inflation-r2-mobile-head"><div className="economic-mobile-name"><EconomicFavoriteButton domainId="inflation" indicatorId={"research-"+meta.id} label={meta.name}/><div><strong>{meta.name}</strong><small>{meta.series}</small></div></div>
      <div className="inflation-r2-mobile-actions"><span className="inflation-judgement">미평가</span><ContentHelp label={meta.name+" 도움말"}><p>{meta.description}</p><p>{meta.source} · {meta.unit}</p></ContentHelp></div></div>
     <p className="inflation-r2-mobile-content">{meta.description}</p>
     <p className="inflation-r2-mobile-criterion"><span>기준</span>연구 원자료 · 점수 미산출</p>
     <div className="inflation-r2-mobile-spark"><span>미니차트(1Y)</span><InflationMiniChart label={meta.name} points={trend}/></div>
     <div className="inflation-r2-mobile-metrics"><div><span>이전 원값</span><strong>{valid&&finite(source.previousValue)?fmt(source.previousValue,meta.unit):"—"}</strong><small>{valid?day(source.previousObservationDate):"—"}</small></div>
      <div><span>현재 원값</span><strong>{valid?fmt(source.value!,meta.unit):"—"}</strong><small>{valid?"관측 "+day(source.observationDate):"공개 요약 미게시"}</small></div>
      <div><span>발표 주기</span><strong>{meta.cadence}</strong><small>다음 발표일 —</small></div></div>
    </article>;
  })}</div>
 </section>;
}
