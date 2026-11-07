"use client";

import {useMemo} from "react";
import {useStoredIndex} from "../../components/use-stored-index";
import {INFLATION_CANDIDATES_7} from "../../lib/inflation-causal-candidates-public-7-catalog.mjs";
import {InflationMiniChart,type InflationMiniTrendPoint} from "../inflation/inflation-mini-chart";
import {ContentHelp} from "../content-help";
import {EconomicFavoriteButton} from "./economic-favorite-button";

type Row={
 id:string;series:string;unit:string;status:"READY"|"PENDING"|"STALE";
 value:number|null;previousValue:number|null;observationDate:string|null;
 previousObservationDate:string|null;sourceStoredAt:string|null;availableAt:string|null;
 history:Array<{date:string;value:number}>;
};
type Snapshot={
 schemaVersion?:string;status:"READY"|"PARTIAL"|"PENDING"|"unavailable";
 score:null;sourceVersion?:string;sourceStoredAt?:number;indicators:Row[];
};

const finite=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);
const dated=(value:unknown):value is string=>typeof value==="string"&&
 /^\d{4}-\d{2}(?:-\d{2})?$/.test(value);
const fmt=(value:number,unit:string)=>new Intl.NumberFormat("ko-KR",{maximumFractionDigits:3})
 .format(value)+" "+unit;
const day=(value:string|null|undefined)=>dated(value)?value.replaceAll("-","."):"—";
const storedKst=(value:string|null|undefined)=>{
 if(typeof value!=="string"||!Number.isFinite(Date.parse(value)))return "—";
 return new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",
  day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
};

function points(row:Row|undefined,ready:boolean):InflationMiniTrendPoint[]{
 if(!ready||!Array.isArray(row?.history))return [];
 return row.history.flatMap(point=>dated(point.date)&&finite(point.value)?
  [{date:point.date.length===7?point.date+"-01":point.date,value:point.value}]:[]);
}

export default function InflationCandidate7Inputs(){
 const {payload,loading,error}=useStoredIndex<Snapshot>("/api/inflation-candidate-inputs");
 const verified=payload&&(payload.status==="READY"||payload.status==="PARTIAL")&&
  payload.schemaVersion==="inflation-causal-candidates-7-r1-v1"&&
  payload.score===null&&Array.isArray(payload.indicators)&&payload.indicators.length===7;
 const rows=useMemo(()=>new Map((verified?payload!.indicators:[]).map(row=>[row.id,row])),
  [verified,payload]);
 const available=(row:Row|undefined,meta:{series:string;unit:string})=>
  row?.status==="READY"&&row.series===meta.series&&row.unit===meta.unit&&
  finite(row.value)&&dated(row.observationDate);
 return <section className="inflation-indicator-section inflation-r2-indicators economic-indicators" aria-labelledby="economic-inflation-candidate-7">
  <header><div><p className="cnn-eyebrow">ADDITIONAL RESEARCH INPUTS · STORED DATA</p>
   <h2 id="economic-inflation-candidate-7">추가 물가 관련 연구 원자료 (7개)</h2></div>
   <p>기존 19개 원자료 및 4개 물가 평가점수와 별도로 표시합니다. <b>7개 항목은 점수·상승/하락 판단에 반영되지 않는 미평가 원자료</b>입니다.</p>
  </header>
  {(loading||error||!verified)&&<p className="economic-data-notice" role="status">
   {loading?"추가 원자료의 공개 저장본 확인 중":
    "추가 원자료 공개 저장본 대기 · 기존 지표와 점수는 그대로 제공됩니다."}
  </p>}
  <div className="inflation-table-wrap inflation-r2-table-wrap">
   <table className="inflation-indicator-table inflation-indicator-table-r2 economic-table">
    <colgroup>{Array.from({length:10},(_,index)=><col key={index}/>)}</colgroup>
    <thead><tr><th>☆</th><th>지표</th><th>출처</th><th>연구 상태</th><th>이전 원값</th>
     <th>현재 원값</th><th>발표 주기</th><th>판단</th><th>최근 관측</th><th>ⓘ</th></tr></thead>
    <tbody>{INFLATION_CANDIDATES_7.map(meta=>{
     const row=rows.get(meta.id),ready=available(row,meta),trend=points(row,ready);
     return <tr key={meta.id} data-judgement="neutral" data-research-candidate={meta.id}>
      <td><EconomicFavoriteButton domainId="inflation" indicatorId={"candidate-"+meta.id} label={meta.name}/></td>
      <th scope="row"><strong>{meta.name}</strong><small>{meta.series}</small></th>
      <td>{meta.provider}</td><td>{ready?"원자료 확보":"원자료 게시 대기"}</td>
      <td className="inflation-r2-value"><strong>{ready&&finite(row?.previousValue)?fmt(row!.previousValue!,meta.unit):"—"}</strong>
       <small>{ready?day(row?.previousObservationDate):"—"}</small></td>
      <td className="inflation-r2-value" data-value-kind={ready?"raw":"missing"}>
       <strong>{ready&&finite(row?.value)?fmt(row.value,meta.unit):"—"}</strong>
       <small>{ready?"관측 "+day(row?.observationDate):"공개 요약 미게시"}</small></td>
      <td className="inflation-r2-release"><strong>{meta.cadence}</strong><small>다음 발표일 —</small></td>
      <td><span className="inflation-judgement">미평가</span></td>
      <td className="inflation-r2-spark-cell"><InflationMiniChart label={meta.name} points={trend}/></td>
      <td><ContentHelp label={meta.name+" 도움말"}>
       <p>원본 번호 #{meta.id} · {meta.provider} · {meta.series} · {meta.unit}</p>
       <p>PC 원본 저장: {ready?storedKst(row?.sourceStoredAt):"확인되지 않음"} · 원자료 관측일: {ready?day(row?.observationDate):"—"}</p>
       <p>연구용 원자료이며 물가지표 점수나 판단 결과에 포함되지 않습니다.</p>
      </ContentHelp></td>
     </tr>;
    })}</tbody>
   </table>
  </div>
  <div className="inflation-r2-mobile-list">{INFLATION_CANDIDATES_7.map(meta=>{
   const row=rows.get(meta.id),ready=available(row,meta),trend=points(row,ready);
   return <article className="inflation-r2-mobile-card" key={meta.id} data-judgement="neutral" data-research-candidate={meta.id}>
    <div className="inflation-r2-mobile-head"><div className="economic-mobile-name">
     <EconomicFavoriteButton domainId="inflation" indicatorId={"candidate-"+meta.id} label={meta.name}/>
     <div><strong>{meta.name}</strong><small>{meta.series}</small></div></div>
     <div className="inflation-r2-mobile-actions"><span className="inflation-judgement">미평가</span>
      <ContentHelp label={meta.name+" 도움말"}><p>{meta.provider} · {meta.unit}</p>
       <p>원본 저장: {ready?storedKst(row?.sourceStoredAt):"미확인"}</p>
      </ContentHelp></div></div>
    <p className="inflation-r2-mobile-content">출처: {meta.provider} · {ready?"원자료 확보":"공개 요약 미게시"}</p>
    <p className="inflation-r2-mobile-criterion"><span>기준</span>연구 원자료 · 점수 미산출</p>
    <div className="inflation-r2-mobile-spark"><span>최근 관측</span><InflationMiniChart label={meta.name} points={trend}/></div>
    <div className="inflation-r2-mobile-metrics"><div><span>이전 원값</span>
     <strong>{ready&&finite(row?.previousValue)?fmt(row!.previousValue!,meta.unit):"—"}</strong>
     <small>{ready?day(row?.previousObservationDate):"—"}</small></div>
     <div><span>현재 원값</span><strong>{ready&&finite(row?.value)?fmt(row.value,meta.unit):"—"}</strong>
     <small>{ready?"관측 "+day(row?.observationDate):"공개 요약 미게시"}</small></div>
     <div><span>발표 주기</span><strong>{meta.cadence}</strong><small>다음 발표일 —</small></div></div>
   </article>;
  })}</div>
  <p className="economic-data-notice">자료 출처: 미국 노동통계국(BLS), 미국 인구조사국(Census Bureau), EIA, 미국 재무부(MTS), 연방준비제도(G.17). 이 화면의 연구용 가공 결과는 해당 기관의 공식 평가나 승인을 의미하지 않습니다. BLS는 재가공 자료의 정확성을 보증하지 않습니다. 이 서비스는 Census Bureau Data API를 사용하지만 미국 인구조사국의 승인·인증을 받지 않았습니다.</p>
 </section>;
}
