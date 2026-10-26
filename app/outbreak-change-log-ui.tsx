"use client";

import {useState} from "react";
import {ArrowDownRight, ArrowUpRight, ChevronDown, History, Minus} from "lucide-react";

/**
 * Presentation-only contract for the outbreak event change log.
 * No score, attribution, article, or historical event is generated here.
 * The data/attribution worker supplies independently verified `items` later.
 */
export type OutbreakChangeLogItem = {
 id:string;
 date:string; // YYYY-MM-DD, actual observation date
 title:string;
 delta:number; // actual score difference (points), not a percentage
 scoreAfter?:number|null;
 detail?:string;
 sourceName?:string;
 sourceUrl?:string;
 status?:"verified"|"provisional";
};

export default function OutbreakChangeLogUI({eventId,items=[]}:{eventId:string;items?:OutbreakChangeLogItem[]}){
 const [showAll,setShowAll]=useState(false);
 const entries=showAll?items:items.slice(0,3);
 return <section className="obm-log ob-panel" aria-labelledby={`obm-log-${eventId}`} data-testid={`outbreak-log-${eventId}`}>
  <header className="obm-log-head"><h3 id={`obm-log-${eventId}`}><History size={16} aria-hidden="true"/>변동 이력</h3><span>일자별 기록</span></header>
  <p className="obm-log-intro">점수 변화와 확인된 반영 사유를 날짜별로 기록합니다.</p>
  {items.length===0?<div className="obm-log-empty" role="status">
    <strong>변동 사유 연결 준비 중</strong>
    <span>확인된 원인 기록이 연결되면 이곳에 표시됩니다. 현재는 사건이나 변동 사유를 임의로 생성하지 않습니다.</span>
   </div>:<>
    <ol className="obm-log-list">{entries.map(item=>{
     const direction=item.delta>0?"up":item.delta<0?"down":"flat";
     return <li key={item.id}><details className="obm-log-entry">
      <summary>
       <time dateTime={item.date}>{item.date.slice(5).replace("-",".")}<small>{item.date.slice(0,4)}</small></time>
       <span className="obm-log-event"><strong>{item.title}</strong><small>{item.status==="verified"?"근거 확인":item.status==="provisional"?"잠정 해석":"상세 기록"}</small></span>
       <span className="obm-log-delta" data-direction={direction}>{direction==="up"?<ArrowUpRight size={13} aria-hidden="true"/>:direction==="down"?<ArrowDownRight size={13} aria-hidden="true"/>:<Minus size={13} aria-hidden="true"/>}{item.delta>0?"+":""}{item.delta.toFixed(1)}<small>점</small></span>
       <ChevronDown className="obm-log-chevron" size={13} aria-hidden="true"/>
      </summary>
      <div className="obm-log-description">
       {item.detail?<p>{item.detail}</p>:<p>상세 설명은 아직 등록되지 않았습니다.</p>}
       {typeof item.scoreAfter==="number"&&Number.isFinite(item.scoreAfter)&&<span>변경 후 점수 {item.scoreAfter.toFixed(1)}점</span>}
       {item.sourceUrl&&/^https:\/\//i.test(item.sourceUrl)&&<a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceName||"근거 원문 보기"} ↗</a>}
      </div>
     </details></li>;
    })}</ol>
    {items.length>3&&<button type="button" className="obm-log-more" aria-expanded={showAll} onClick={()=>setShowAll(!showAll)}>{showAll?"최근 3건만 보기":`전체 이력 보기 (${items.length}건)`}<ChevronDown size={15} aria-hidden="true"/></button>}
   </>}
  <p className="obm-log-note">점수의 변화와 원인 해석은 별개입니다. 확인되지 않은 사유는 확정적으로 표시하지 않습니다.</p>
 </section>;
}
