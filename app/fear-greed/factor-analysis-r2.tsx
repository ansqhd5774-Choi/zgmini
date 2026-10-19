"use client";
import {useState} from "react";
export type FactorR2={
 id:string;
 name:string;
 metric:string;
 score:number|null;
 raw:string|null;
 reference?:string|null;
 state:string;
 observedAt?:string|null;
 meaning:string;
 direction:string;
};
type Props={market:"usa"|"korea";factors:FactorR2[];source:string;observedAt?:string|null;sourceNote:string;};
const finite=(n:number|null)=>typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=100;
function factorDate(s:string|null|undefined){
 if(!s)return "—";
 if(/^\d{8}$/.test(s))return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
 const ms=Date.parse(s);return Number.isFinite(ms)?new Intl.DateTimeFormat("ko-KR",{dateStyle:"short",timeZone:"Asia/Seoul"}).format(ms):"—";
}
export default function FactorAnalysisR2({market,factors,source,observedAt,sourceNote}:Props){
 const [selectedId,setSelectedId]=useState<string>(factors[0]?.id??"");
 const selected=factors.find(f=>f.id===selectedId)??factors[0];
 const available=factors.filter(f=>finite(f.score));
 const weakest=[...available].sort((a,b)=>(a.score??100)-(b.score??100)).slice(0,3);
 return <section className="fg-r2-analysis" aria-label={market==="usa"?"CNN 7개 구성요소 투자 분석":"한국 7개 구성요소 투자 분석"}>
  <div className="fg-r2-analysis-top">
   <div><span className="fg-r2-kicker">FACTOR MONITOR · {market==="usa"?"CNN USA":"ZGMINI KOREA R7"}</span>
    <h2>7개 {market==="usa"?"구성요소 상세 분석":"시장심리 신호 분석"}</h2>
    <p>{market==="usa"?"원시값과 CNN 환산점수, 관측일을 서로 구분합니다.":"공개 저장값의 개별 점수와 관측 상태만 표시합니다. 비공개 가중치·산식은 공개하지 않습니다."}</p></div>
   <div className="fg-r2-coverage" aria-label="현재 구성요소 유효 점수 수"><strong>{available.length} / {factors.length}</strong><small>점수 확인</small></div>
  </div>
  <div className="fg-r2-analysis-grid">
   <div className="fg-r2-table-wrap">
    <table className="fg-r2-table">
     <thead><tr><th>구성요소</th><th>{market==="usa"?"현재 원시값":"원시값 공개"}</th><th>환산점수</th><th>상태</th><th>관측 기준</th></tr></thead>
     <tbody>{factors.map((f,index)=><tr key={f.id} data-selected={selected?.id===f.id?"true":"false"}>
      <td><button type="button" aria-pressed={selected?.id===f.id} onClick={()=>setSelectedId(f.id)} aria-label={`${f.name} 상세 분석 열기`}><small>{String(index+1).padStart(2,"0")}</small><strong>{f.name}</strong><span>{f.metric}</span></button></td>
      <td data-label="원시값">{f.raw??"—"}</td>
      <td data-label="환산점수" className="fg-r2-value">{finite(f.score)?<><strong>{f.score!.toFixed(1)}</strong><div className="fg-r2-meter"><i style={{width:`${f.score}%`}}/></div></>:<span>—</span>}</td>
      <td data-label="상태"><span className="fg-r2-state" data-missing={!finite(f.score)?"true":"false"}>{finite(f.score)?f.state:"미확인"}</span></td>
      <td data-label="관측 기준">{factorDate(f.observedAt)}</td>
     </tr>)}</tbody>
    </table>
    <p className="fg-r2-footnote">{sourceNote}</p>
   </div>
   <aside className="fg-r2-side">
    <section><h3>공포 방향 주요 신호</h3>
     {weakest.length?<ol>{weakest.map((f,i)=><li key={f.id}><span>{i+1}</span><div><strong>{f.name} · {f.score!.toFixed(1)}</strong><small>{f.metric}</small></div></li>)}</ol>:<p>비교할 수 있는 개별 환산점수가 아직 없습니다.</p>}
     <p>확인된 개별 점수의 낮은 순서입니다. 새로운 기여도나 매수·매도 신호가 아닙니다.</p></section>
    <section><h3>데이터 신뢰도</h3><dl><div><dt>출처</dt><dd>{source}</dd></div><div><dt>종합 관측 기준</dt><dd>{factorDate(observedAt)}</dd></div><div><dt>확인된 구성요소</dt><dd>{available.length} / {factors.length}</dd></div></dl><p>{market==="usa"?"CNN 종합점수와 구성요소별 관측 시각이 다를 수 있습니다.":"한국 R7 이력은 현재 확보한 자료로 재구성한 연구용 베타이며 당시 PIT 빈티지가 검증되지 않았습니다."}</p></section>
   </aside>
  </div>
  {selected&&<section className="fg-r2-factor-detail" aria-live="polite">
   <div className="fg-r2-factor-head"><span className="fg-r2-kicker">SELECTED SIGNAL</span><h3>{selected.name}</h3><p>{selected.meaning}</p></div>
   <div className="fg-r2-factor-facts">
    <div><small>관측 항목</small><strong>{selected.metric}</strong><p>{selected.direction}</p></div>
    <div><small>{market==="usa"?"원시값 / 비교 기준":"개별 공개 원시값"}</small><strong>{selected.raw??"미제공"}</strong><p>{selected.reference??"원시값은 지표별 단위로 읽습니다."}</p></div>
    <div><small>환산점수 / 관측일</small><strong>{finite(selected.score)?`${selected.score!.toFixed(1)} / 100`:"미확인"}</strong><p>{factorDate(selected.observedAt)} · {finite(selected.score)?selected.state:"결측을 0점으로 대체하지 않음"}</p></div>
   </div>
  </section>}
 </section>;
}
