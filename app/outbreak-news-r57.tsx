"use client";

import {useEffect,useState} from "react";
import {ChevronDown,ExternalLink,Newspaper} from "lucide-react";

/**
 * UI-only contract. Feed items must come from the separately verified news pipeline.
 * Never infer article impact from score changes or create placeholder articles.
 */
export type OutbreakNewsItem={
 id:string;
 source:string;
 publishedAt:string;
 title:string;
 summary:string;
 impact:"positive"|"negative"|"neutral";
 sourceUrl:string;
};

type Filter="all"|"positive"|"negative";
const kstPublicationDate=(value:string)=>{const at=Date.parse(value);return Number.isFinite(at)?new Date(at+9*3600000).toISOString().slice(0,10):value.slice(0,10);};
const labels:Record<OutbreakNewsItem["impact"],string>={
 positive:"긍정 영향",negative:"부정 영향",neutral:"중립"
};

type NewsState="ready"|"loading"|"pending"|"delayed"|"error";\nexport default function OutbreakNewsUI({eventId,items=[],newsState="ready"}:{eventId:string;items?:OutbreakNewsItem[];newsState?:NewsState}){
 const [filter,setFilter]=useState<Filter>("all");
 const [expanded,setExpanded]=useState(false);
 const [wide,setWide]=useState(false);
 useEffect(()=>{setFilter("all");setExpanded(false);},[eventId]);
 useEffect(()=>{
  const media=window.matchMedia("(min-width:1350px)");
  const update=()=>setWide(media.matches);
  update();media.addEventListener("change",update);
  return()=>media.removeEventListener("change",update);
 },[]);
 const valid=items.filter(item=>item&&item.id&&item.title&&item.source&&item.summary&&item.publishedAt&&item.sourceUrl&&/^https:\/\//i.test(item.sourceUrl)&&Object.prototype.hasOwnProperty.call(labels,item.impact));
 const filtered=filter==="all"?valid:valid.filter(item=>item.impact===filter);
 const initialCount=wide?4:3;
 const visible=expanded?filtered:filtered.slice(0,initialCount);\n const emptyText=valid.length?{"title":"선택한 방향의 뉴스가 없습니다","detail":"다른 영향 필터를 선택해 보세요."}:newsState==="loading"?{"title":"주요 뉴스 확인 중","detail":"저장된 뉴스 목록을 확인하고 있습니다."}:newsState==="error"?{"title":"뉴스 조회 지연","detail":"공개 저장자료를 확인하지 못했습니다. 다음 갱신 때 다시 시도합니다."}:newsState==="pending"?{"title":"뉴스 연결 준비 중","detail":"검증된 뉴스를 아직 게시하지 않았습니다."}:newsState==="delayed"?{"title":"뉴스 갱신 지연","detail":"최근 14일 내 공개 가능한 기사가 없습니다."}:{"title":"최근 14일 주요 뉴스 없음","detail":"출처와 이용권이 확인된 기사만 표시합니다."};
 return <section className="ob57-news ob-panel" aria-labelledby={`ob57-news-${eventId}`} data-testid={`outbreak-news-${eventId}`}>
  <header className="ob57-news-header">
   <div className="ob57-news-heading"><h3 id={`ob57-news-${eventId}`}><Newspaper size={16} aria-hidden="true"/>주요 뉴스</h3><span className="ob57-news-count">{filtered.length}건</span></div>
   <div className="ob57-news-filters" role="group" aria-label="뉴스 영향 필터">
    {([["all","전체"],["positive","긍정"],["negative","부정"]] as const).map(([id,title])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>{setFilter(id);setExpanded(false);}}>{title}</button>)}
   </div>
  </header>
  <div className="ob57-news-list" aria-live="polite">
   {visible.length?visible.map(item=><article className="ob57-news-item" key={item.id}>
    <div className="ob57-news-meta"><strong>{item.source}</strong><time dateTime={item.publishedAt}>{kstPublicationDate(item.publishedAt)}</time></div>
    <h4>{item.title}</h4>
    <p>{item.summary}</p>
    <div className="ob57-news-foot"><span className="ob57-impact" data-impact={item.impact}>{labels[item.impact]}</span><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" title="기사 원문 보기" aria-label={`${item.source} 기사 원문 보기: ${item.title}`}><ExternalLink size={15} aria-hidden="true"/></a></div>
   </article>):<div className="ob57-news-empty" role="status">
    <Newspaper size={21} aria-hidden="true"/>
    <strong>{valid.length?"선택한 방향의 뉴스가 없습니다":"주요 뉴스 연결 준비 중"}</strong>
    <span>{valid.length?"다른 영향 필터를 선택해 보세요.":"출처·기사 제목·요약·영향이 확인된 뉴스만 표시합니다. 현재는 검증된 기사를 임의로 생성하지 않습니다."}</span>
   </div>}
  </div>
  <footer className="ob57-news-footer"><small>기사 영향은 참고용 해석이며 점수 변동의 직접 원인으로 단정하지 않습니다.{valid.some(item=>item.source==="GOV.UK")&&<> <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener noreferrer">Contains public sector information licensed under OGL v3.0.</a></>}</small>{filtered.length>initialCount&&<button className="ob57-news-more" type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?"접기":`뉴스 더보기 (${filtered.length-initialCount}건)`}<ChevronDown size={14} aria-hidden="true"/></button>}</footer>
 </section>;
}
