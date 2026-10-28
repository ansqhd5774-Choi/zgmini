"use client";

import {useState} from "react";
import {ExternalLink,Newspaper,ChevronDown} from "lucide-react";

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
 return <section className="ob57-news ob-panel" aria-labelledby={`ob57-news-${eventId}`} data-testid={`outbreak-news-${eventId}`}>
  <header className="ob57-news-header">
   <div className="ob57-news-heading">
    <h3 id={`ob57-news-${eventId}`}><Newspaper size={16} aria-hidden="true"/>주요 뉴스</h3>
    <span className="ob57-news-count">{items.length}건</span>
   </div>
  </header>
  <div className="ob57-news-list" aria-live="polite">
   {shown.map(item=><article className="ob57-news-item" key={item.id}>
    <div className="ob57-news-meta"><strong>{item.source}</strong>
     <time dateTime={item.publishedAt}>{kstDate(item.publishedAt)}</time></div>
    <h4>{item.title}</h4>
    <div className="ob57-news-foot">
     <span>원문 기사</span>
     <div className="ob57-news-actions">
      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" title="원문 기사 사이트 열기"
       aria-label={`${item.source} 원문 기사 사이트 열기: ${item.title}`}><ExternalLink size={15} aria-hidden="true"/></a>
     </div>
    </div>
   </article>)}
  </div>
  <footer className="ob57-news-footer">
   <small>제목·날짜·원문 URL만 표시합니다. 기사 영향이나 요약을 임의로 생성하지 않습니다.</small>
   {items.length>10&&<button className="ob57-news-more" type="button" aria-expanded={expanded}
    onClick={()=>setExpanded(value=>!value)}>{expanded?"접기":`뉴스 더보기 (${items.length-10}건)`}
    <ChevronDown size={14} aria-hidden="true"/></button>}
  </footer>
 </section>;
}
