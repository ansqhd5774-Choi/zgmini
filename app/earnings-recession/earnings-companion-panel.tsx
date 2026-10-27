"use client";

import {useStoredIndex} from "../../components/use-stored-index";
import "./earnings-companion-panel.css";

// R4-C is an informational BLS read model, not an input to the eight-risk score.
const ENDPOINT="/api/earnings-recession-indicators";
const SCHEMA="earnings-companion-c-r4-v1";
const INDICATORS=[
 {id:"bls_ppi_final_demand_yoy_sa",short:"최종수요 생산자물가 상승률",description:"생산자물가 · 전년 동기 대비",series:"WPSFD4"},
 {id:"bls_ppi_final_demand_index",short:"최종수요 생산자물가 지수",description:"계절조정 생산자물가 수준",series:"WPSFD4"},
 {id:"bls_ppi_goods_yoy_sa",short:"재화 생산자물가 상승률",description:"재화 생산자물가 · 전년 동기 대비",series:"WPSFD41"},
 {id:"bls_ppi_goods_index",short:"재화 생산자물가 지수",description:"계절조정 재화 생산자물가 수준",series:"WPSFD41"},
 {id:"bls_unit_labor_cost_yoy",short:"비농업 단위노동비용 증가율",description:"비농업 생산성 · 전년 동기 대비",series:"PRS85006111"},
] as const;
type HistoryPoint={period:string;value:number|null};
type CompanionRow={indicatorId:string;value:number|null;unit:"PERCENT"|"INDEX";status:string;
 observationPeriod:string;previousPeriod:string|null;previousValue:number|null;change:number|null;
 frequency:"MONTHLY"|"QUARTERLY";history:HistoryPoint[];historyCoverage:{actualPoints:number;expectedPeriods:number;complete:boolean};
 freshness?:{status:string;reason:string|null};seriesId:string;sourceURL:string;};
type CompanionPayload={schemaVersion:string;status:string;coverage?:{ready:number;configured:number;stale:number};
 historicalMode:string;sourceStoredAt:number;rows:CompanionRow[];};

const finite=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);
const format=(value:number|null|undefined,unit:"PERCENT"|"INDEX")=>
 finite(value)?`${value.toLocaleString("ko-KR",{minimumFractionDigits:2,maximumFractionDigits:2})}${unit==="PERCENT"?"%":""}`:"—";
const formatChange=(value:number|null|undefined,unit:"PERCENT"|"INDEX")=>
 finite(value)?`${value>0?"+":""}${value.toFixed(2)}${unit==="PERCENT"?"%p":"p"}`:"—";
const usable=(row:CompanionRow|undefined)=>Boolean(row&&row.status==="READY"&&row.freshness?.status==="FRESH"&&finite(row.value));

function CompanionSpark({history}:{history:HistoryPoint[]}){
 const points=Array.isArray(history)?history:[];
 const valid=points.map((p,index)=>({index,value:p?.value})).filter((p):p is {index:number;value:number}=>finite(p.value));
 if(valid.length<2)return <span className="earnings-c-no-chart">이력 부족</span>;
 const min=Math.min(...valid.map(p=>p.value)),max=Math.max(...valid.map(p=>p.value));
 const x=(index:number)=>5+index*110/Math.max(1,points.length-1);
 const y=(value:number)=>max===min?18:30-24*(value-min)/(max-min);
 let path="";let previous=-2;
 for(const point of valid){path+=`${previous===point.index-1?" L":" M"}${x(point.index).toFixed(1)} ${y(point.value).toFixed(1)}`;previous=point.index;}
 const latest=valid.at(-1)!;
 return <svg className="earnings-c-mini-chart" viewBox="0 0 120 36" role="img" aria-label="저장된 관측치의 추이. 결측 구간은 연결하지 않음">
  <path d={path.trim()} fill="none" stroke="#73c9d9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  <circle cx={x(latest.index)} cy={y(latest.value)} r="2.5" fill="#b0eef3"/>
 </svg>;
}

export default function EarningsCompanionPanel(){
 const {payload,loading,error}=useStoredIndex<CompanionPayload>(ENDPOINT);
 const valid=payload?.schemaVersion===SCHEMA&&Array.isArray(payload?.rows)&&payload?.historicalMode==="CURRENT_RETRIEVAL_NOT_PIT";
 const byId=new Map<string,CompanionRow>((valid&&payload?payload.rows:[]).filter(row=>INDICATORS.some(meta=>meta.id===row.indicatorId)).map(row=>[row.indicatorId,row]));
 const ready=INDICATORS.filter(meta=>usable(byId.get(meta.id))).length;
 const state=loading?"자료 확인 중":valid?`${ready}/${INDICATORS.length}개 연결`:error?"조회 실패":"자료 준비 중";
 return <section className="earnings-c-panel" aria-labelledby="earnings-c-title" aria-busy={loading} data-testid="earnings-companion-c-panel">
  <header className="earnings-c-head"><div><p className="earnings-c-eyebrow">EARNINGS · BLS COST PRESSURE</p>
   <h2 id="earnings-c-title">실적 침체 보조지표 <small>5개</small></h2>
   <p>생산자물가와 단위노동비용의 흐름을 확인합니다. 위의 실적 침체 위험 점수와 합산하지 않습니다.</p></div>
   <span className="earnings-c-status" role="status">{state}</span>
  </header>
  <div className="earnings-c-table-wrap"><table className="earnings-c-table">
   <thead><tr><th scope="col">지표</th><th scope="col">이전</th><th scope="col">현재</th><th scope="col">변동</th><th scope="col">관측 기간</th><th scope="col">추이</th><th scope="col">출처</th></tr></thead>
   <tbody>{INDICATORS.map(meta=>{const row=byId.get(meta.id);const ok=usable(row);return <tr key={meta.id}>
    <th scope="row"><strong>{meta.short}</strong><small>{meta.description}</small></th>
    <td>{ok&&row?format(row.previousValue,row.unit):"—"}</td>
    <td className="earnings-c-current">{ok&&row?format(row.value,row.unit):"—"}</td>
    <td>{ok&&row?formatChange(row.change,row.unit):"—"}</td>
    <td>{row?.observationPeriod??"—"}<small>{row?row.frequency==="MONTHLY"?"월간":"분기":""}</small></td>
    <td>{ok&&row?<CompanionSpark history={row.history}/>:"—"}</td>
    <td><a href={`https://data.bls.gov/timeseries/${meta.series}`} target="_blank" rel="noopener noreferrer">BLS 원자료</a></td>
   </tr>})}</tbody>
  </table></div>
  <div className="earnings-c-mobile">{INDICATORS.map(meta=>{const row=byId.get(meta.id);const ok=usable(row);return <article className="earnings-c-mobile-card" key={meta.id}>
   <div className="earnings-c-mobile-head"><div><h3>{meta.short}</h3><p>{meta.description}</p></div><span>{ok?"연결됨":row?.status==="STALE"?"갱신 지연":"자료 확인 중"}</span></div>
   <div className="earnings-c-mobile-grid"><div><small>현재</small><strong>{ok&&row?format(row.value,row.unit):"—"}</strong></div>
    <div><small>이전</small><strong>{ok&&row?format(row.previousValue,row.unit):"—"}</strong></div>
    <div><small>변동</small><strong>{ok&&row?formatChange(row.change,row.unit):"—"}</strong></div>
    <div><small>관측</small><strong>{row?.observationPeriod??"—"}</strong></div></div>
   <div className="earnings-c-mobile-foot">{ok&&row?<CompanionSpark history={row.history}/>:<span className="earnings-c-no-chart">저장된 이력 확인 필요</span>}
    <a href={`https://data.bls.gov/timeseries/${meta.series}`} target="_blank" rel="noopener noreferrer">BLS 원자료</a></div>
  </article>})}</div>
  <p className="earnings-c-footnote">BLS 저장 관측값 · 잠정 추정치가 아닌 수집 시점의 자료입니다. 전년 대비 수치와 지수는 동일한 원자료를 다른 방식으로 표시한 것으로, 서로 독립적인 5개 근거를 뜻하지 않습니다. 발표일 미확인 항목은 예측하지 않습니다.</p>
 </section>;
}
