"use client";

import {useEffect,useRef,useState} from "react";
import {ChevronDown,ExternalLink,Newspaper} from "lucide-react";
import {needsKoreanTranslation,translateEnglishNewsText} from "../lib/iran-progress/browser-news-translation-r1.mjs";
import {isPlaceholderNewsSummary,newsPageSize,visibleNewsLimit} from "../lib/iran-progress/news-ui-r1.mjs";
import {sourceRightsAttribution} from "../lib/iran-progress/news-source-rights-r2.mjs";

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
 rightsVerified?:boolean;
 displayEligible?:boolean;
 rightsSource?:string;
 rightsPolicyUrl?:string;
 publicationMode?:string;
 rightsReviewedAt?:string;
 creatorCredit?:string;
 editorialSummaryReviewed?:boolean;
 sourceOriginalContentVerified?:boolean;
 adaptationNotice?:string;
 newsReuseScopeReviewed?:boolean;
 unNoticeConfirmedAt?:string;
 independentFactsReviewed?:boolean;
 sourceTextReused?:boolean;
 corroboratingSourceUrl?:string;
};

type Filter="all"|"positive"|"negative";
const kstPublicationDate=(value:string)=>{const at=Date.parse(value);return Number.isFinite(at)?new Date(at+9*3600000).toISOString().slice(0,10):value.slice(0,10);};
const labels:Record<OutbreakNewsItem["impact"],string>={
 positive:"긍정 영향",negative:"부정 영향",neutral:"중립"
};

type NewsState="ready"|"loading"|"pending"|"delayed"|"error";
export default function OutbreakNewsUI({eventId,items=[],newsState="ready"}:{eventId:string;items?:OutbreakNewsItem[];newsState?:NewsState}){
 const [filter,setFilter]=useState<Filter>("all");
 const [visiblePages,setVisiblePages]=useState(1);
 const [wide,setWide]=useState(false);
 const [translated,setTranslated]=useState<Record<string,string>>({});
 const attemptedTranslations=useRef(new Set<string>());
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{setFilter("all");setVisiblePages(1);},[eventId]);
 useEffect(()=>{
  const media=window.matchMedia("(min-width:1350px)");
  const update=()=>setWide(media.matches);
  update();media.addEventListener("change",update);
  return()=>media.removeEventListener("change",update);
 },[]);
 const valid=items.filter(item=>item&&item.id&&item.title&&item.source&&item.summary&&item.publishedAt&&item.sourceUrl&&/^https:\/\//i.test(item.sourceUrl)&&Object.prototype.hasOwnProperty.call(labels,item.impact));
 const filtered=filter==="all"?valid:valid.filter(item=>item.impact===filter);
 const initialCount=newsPageSize(wide);
 const visible=filtered.slice(0,visibleNewsLimit(visiblePages,{wide}));
 const allVisible=visible.length===filtered.length;
 const nextCount=Math.min(initialCount,filtered.length-visible.length);
 const visibleSignature=visible.map(item=>`${item.id}:${item.title}:${item.summary}`).join('\u001f');
 useEffect(()=>{
  // Translate only rendered news to respect the provider's anonymous free quota.
  // Cache keys include the original text so refreshed articles never display a stale translation.
  const tasks=visible.flatMap(item=>([['title',item.title],['summary',item.summary]] as const)
   .filter(([,value])=>needsKoreanTranslation(value))
   .map(([field,value])=>({key:`${eventId}:${item.id}:${field}:${value}`,cacheId:`${item.id}:${field}`,value})));
  let cursor=0;
  const run=async()=>{
   while(cursor<tasks.length){
    const task=tasks[cursor++];
    if(attemptedTranslations.current.has(task.key))continue;
    attemptedTranslations.current.add(task.key);
    let storage:Storage;
    try{storage=window.localStorage;}catch{continue;}
    const result=await translateEnglishNewsText(task.value,{cacheId:task.cacheId,storage});
    if(result&&mounted.current)setTranslated(previous=>({...previous,[task.key]:result}));
   }
  };
  void Promise.all([run(),run()]);
 // Changes to article content/selection trigger translations, not state-only rerenders.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[eventId,visibleSignature]);
 const emptyText=valid.length?{"title":"선택한 방향의 뉴스가 없습니다","detail":"다른 영향 필터를 선택해 보세요."}:newsState==="loading"?{"title":"주요 뉴스 확인 중","detail":"저장된 뉴스 목록을 확인하고 있습니다."}:newsState==="error"?{"title":"뉴스 조회 지연","detail":"공개 저장자료를 확인하지 못했습니다. 다음 갱신 때 다시 시도합니다."}:newsState==="pending"?{"title":"뉴스 연결 준비 중","detail":"검증된 뉴스를 아직 게시하지 않았습니다."}:newsState==="delayed"?{"title":"뉴스 갱신 지연","detail":"최근 14일 내 공개 가능한 기사가 없습니다."}:{"title":"최근 14일 주요 뉴스 없음","detail":"출처와 이용권이 확인된 기사만 표시합니다."};
 return <section className="ob57-news ob-panel" aria-labelledby={`ob57-news-${eventId}`} data-testid={`outbreak-news-${eventId}`}>
  <header className="ob57-news-header">
   <div className="ob57-news-heading"><h3 id={`ob57-news-${eventId}`}><Newspaper size={16} aria-hidden="true"/>주요 뉴스</h3><span className="ob57-news-count">{filtered.length}건</span></div>
   <div className="ob57-news-filters" role="group" aria-label="뉴스 영향 필터">
    {([["all","전체"],["positive","긍정"],["negative","부정"]] as const).map(([id,title])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>{setFilter(id);setVisiblePages(1);}}>{title}</button>)}
   </div>
  </header>
  <div className="ob57-news-list" aria-live="polite">
   {visible.length?visible.map(item=>{const title=translated[`${eventId}:${item.id}:title:${item.title}`]??item.title;
    const summary=translated[`${eventId}:${item.id}:summary:${item.summary}`]??item.summary;
    const rights=sourceRightsAttribution(item);
    return <article className="ob57-news-item" key={item.id}>
    <div className="ob57-news-meta"><strong>{item.source}</strong><time dateTime={item.publishedAt}>{kstPublicationDate(item.publishedAt)}</time></div>
    <h4 title={title!==item.title?`영문 원제목: ${item.title}`:undefined}>{title}</h4>
    <p>{isPlaceholderNewsSummary(summary)?"기사 핵심 요약 미제공 · 원문 확인 필요":summary}</p>
    {rights&&<small className="ob57-news-licence"><a href={rights.url} target="_blank" rel="noopener noreferrer">{rights.label}</a></small>}
    <div className="ob57-news-foot"><span className="ob57-impact" data-impact={item.impact}>{labels[item.impact]}</span><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" title="기사 원문 보기" aria-label={`${item.source} 기사 원문 보기: ${title}`}><ExternalLink size={15} aria-hidden="true"/></a></div>
   </article>;}):<div className="ob57-news-empty" role="status">
    <Newspaper size={21} aria-hidden="true"/>
    <strong>{valid.length?"선택한 방향의 뉴스가 없습니다":"주요 뉴스 연결 준비 중"}</strong>
    <span>{valid.length?"다른 영향 필터를 선택해 보세요.":"출처·기사 제목·요약·영향이 확인된 뉴스만 표시합니다. 현재는 검증된 기사를 임의로 생성하지 않습니다."}</span>
   </div>}
  </div>
  <footer className="ob57-news-footer"><small>{filtered.length>0&&<>공개 뉴스 {filtered.length}건 중 {visible.length}건 표시. </>}기사 영향은 참고용 해석이며 점수 변동의 직접 원인으로 단정하지 않습니다.{valid.some(item=>item.source==="GOV.UK")&&<> <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener noreferrer">Contains public sector information licensed under OGL v3.0.</a></>}{valid.some(item=>needsKoreanTranslation(item.title)||needsKoreanTranslation(item.summary))&&<> 영문 기사는 <a href="https://mymemory.translated.net/terms-and-conditions" target="_blank" rel="noopener noreferrer">MyMemory</a> 무료 자동 번역을 시도하며, 실패 시 원문을 유지합니다.</>}</small>{filtered.length>initialCount&&<button className="ob57-news-more" type="button" aria-expanded={allVisible} onClick={()=>setVisiblePages(previous=>allVisible?1:previous+1)}>{allVisible?"접기":`뉴스 더보기 (${nextCount}건)`}<ChevronDown size={14} aria-hidden="true"/></button>}</footer>
 </section>;
}

