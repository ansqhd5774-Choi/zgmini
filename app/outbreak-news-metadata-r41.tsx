"use client";

import {useEffect,useRef,useState} from "react";
import {ExternalLink,Newspaper,ChevronDown} from "lucide-react";
import {needsKoreanTranslation,translateEnglishNewsText} from "../lib/iran-progress/browser-news-translation-r1.mjs";

/** Verified publisher metadata only. No fabricated article summary or impact. */
export type IranNewsMetadataItemR41={
 id:string;
 source:string;
 title:string;
 publishedAt:string;
 sourceUrl:string;
};

const kstDate=(value:string)=>{
 const date=Date.parse(value);
 return Number.isFinite(date)?new Date(date+9*3600000).toISOString().slice(0,10):value.slice(0,10);
};

export default function OutbreakNewsMetadataR41({eventId,items}:{eventId:string;items:IranNewsMetadataItemR41[]}){
 const [expanded,setExpanded]=useState(false);
 const shown=expanded?items:items.slice(0,10);
 const [translatedTitles,setTranslatedTitles]=useState<Record<string,string>>({});
 const attemptedTranslations=useRef(new Set<string>());
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const shownSignature=shown.map(item=>`${item.id}:${item.title}`).join('\u001f');
 useEffect(()=>{
  // R41 is publisher metadata only. Translate visible titles in the browser;
  // retain original titles and links and never synthesize summaries or impact.
  const tasks=shown.filter(item=>needsKoreanTranslation(item.title))
   .map(item=>({key:`${eventId}:${item.id}:title:${item.title}`,cacheId:`${item.id}:title`,value:item.title}));
  let cursor=0;
  const run=async()=>{
   while(cursor<tasks.length){
    const task=tasks[cursor++];
    if(attemptedTranslations.current.has(task.key))continue;
    attemptedTranslations.current.add(task.key);
    let storage:Storage;
    try{storage=window.localStorage;}catch{continue;}
    const result=await translateEnglishNewsText(task.value,{cacheId:task.cacheId,storage});
    if(result&&mounted.current)setTranslatedTitles(previous=>({...previous,[task.key]:result}));
   }
  };
  void Promise.all([run(),run()]);
 // Changes to visible titles, event, or pagination trigger translation.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[eventId,shownSignature]);
 return <section className="ob57-news ob-panel" aria-labelledby={`ob57-news-${eventId}`} data-testid={`outbreak-news-${eventId}`}>
  <header className="ob57-news-header">
   <div className="ob57-news-heading">
    <h3 id={`ob57-news-${eventId}`}><Newspaper size={16} aria-hidden="true"/>주요 뉴스</h3>
    <span className="ob57-news-count">{items.length}건</span>
   </div>
  </header>
  <div className="ob57-news-list" aria-live="polite">
   {shown.map(item=>{const title=translatedTitles[`${eventId}:${item.id}:title:${item.title}`]??item.title;
    return <article className="ob57-news-item" key={item.id}>
    <div className="ob57-news-meta"><strong>{item.source}</strong>
     <time dateTime={item.publishedAt}>{kstDate(item.publishedAt)}</time></div>
    <h4 title={title!==item.title?`영문 원제목: ${item.title}`:undefined}>{title}</h4>
    <div className="ob57-news-foot">
     <span>원문 기사</span>
     <div className="ob57-news-actions">
      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" title="원문 기사 사이트 열기"
       aria-label={`${item.source} 원문 기사 사이트 열기: ${title}`}><ExternalLink size={15} aria-hidden="true"/></a>
     </div>
    </div>
   </article>;})}
  </div>
  <footer className="ob57-news-footer">
   <small>제목·날짜·원문 URL만 표시합니다. 기사 영향이나 요약을 임의로 생성하지 않습니다.{items.some(item=>needsKoreanTranslation(item.title))&&<> 영문 제목은 <a href="https://mymemory.translated.net/terms-and-conditions" target="_blank" rel="noopener noreferrer">MyMemory</a> 무료 자동 번역을 시도하며, 실패 시 원문을 유지합니다.</>}</small>
   {items.length>10&&<button className="ob57-news-more" type="button" aria-expanded={expanded}
    onClick={()=>setExpanded(value=>!value)}>{expanded?"접기":`뉴스 더보기 (${items.length-10}건)`}
    <ChevronDown size={14} aria-hidden="true"/></button>}
  </footer>
 </section>;
}
