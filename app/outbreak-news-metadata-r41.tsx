"use client";

import {useEffect,useRef,useState} from "react";
import {ExternalLink,Newspaper,ChevronDown} from "lucide-react";
import {useStoredIndex} from "../components/use-stored-index";
import {needsKoreanTranslation,translateEnglishNewsText} from "../lib/iran-progress/browser-news-translation-r1.mjs";
import styles from "./outbreak-news-evaluation-r2.module.css";

/** Publisher metadata is managed separately from AI analysis and the R5 score. */
export type IranNewsMetadataItemR41={
 id:string;
 source:string;
 title:string;
 publishedAt:string;
 sourceUrl:string;
};

type NewsAnalysisImpact="positive"|"negative"|"neutral";
export type NewsAnalysisItem={
 id:string;
 sourceUrl:string;
 titleKo?:string;
 keyPointKo?:string;
 keyFactsKo?:string[];
 summaryKo:string;
 interpretationKo:string;
 impact:NewsAnalysisImpact;
 analysisStatus:"READY";
 analyzedAt:number;
 evidenceUrls:string[];
 model?:string;
};
export type NewsAnalysisPayload={
 version:"IRAN_NEWS_ANALYSIS_R1";
 publishedAt:number;
 status:"READY"|"PARTIAL"|"PENDING"|"STALE"|"UNAVAILABLE";
 items:NewsAnalysisItem[];
 pending?:Array<{id:string;reason:string}>;
};

const impactLabels:Record<NewsAnalysisImpact,string>={
 positive:"긍정 영향",negative:"부정 영향",neutral:"중립"
};

const kstDate=(value:string)=>{
 const date=Date.parse(value);
 return Number.isFinite(date)?new Date(date+9*3600000).toISOString().slice(0,10):value.slice(0,10);
};

/** Never attach an unrelated, malformed, or unsupported AI result to an article. */
export const validAnalysis=(item:NewsAnalysisItem|undefined,article:IranNewsMetadataItemR41)=>Boolean(
 item&&item.analysisStatus==="READY"&&item.id===article.id&&item.sourceUrl===article.sourceUrl&&
 typeof item.summaryKo==="string"&&item.summaryKo.trim()&&
 typeof item.interpretationKo==="string"&&item.interpretationKo.trim()&&
 (item.keyPointKo===undefined&&item.keyFactsKo===undefined||
  typeof item.keyPointKo==="string"&&item.keyPointKo.trim().length>=15&&
  Array.isArray(item.keyFactsKo)&&item.keyFactsKo.length>=2&&item.keyFactsKo.length<=3&&
  item.keyFactsKo.every(fact=>typeof fact==="string"&&fact.trim().length>=12))&&
 Number.isSafeInteger(item.analyzedAt)&&item.analyzedAt>0&&
 Object.prototype.hasOwnProperty.call(impactLabels,item.impact)&&
 Array.isArray(item.evidenceUrls)&&item.evidenceUrls.length>0&&
 item.evidenceUrls.every(url=>typeof url==="string"&&/^https:\/\//i.test(url))
);

export function IranNewsEvaluationCard({analysis}:{analysis:NewsAnalysisItem}){
 const hasKeyFacts=Boolean(analysis.keyPointKo&&analysis.keyFactsKo?.length);
 return <div className={styles.evaluation}>
  <div className={styles.keyPointBox}>
   <span className={styles.sectionLabel}>핵심 사실</span>
   {hasKeyFacts?<>
    <strong className={styles.keyPoint}>{analysis.keyPointKo}</strong>
    <ul className={styles.factsList}>{analysis.keyFactsKo!.map((fact,index)=><li key={`${index}:${fact}`}>{fact}</li>)}</ul>
   </>:<p className={styles.legacySummary}>{analysis.summaryKo}</p>}
  </div>
  <div className={styles.whyBox}>
   <strong className={styles.whyLabel}>왜 중요한가?</strong>
   <p className={styles.interpretation}>{analysis.interpretationKo}</p>
  </div>
  {hasKeyFacts&&<details className={styles.fullSummary}>
   <summary>기사 요약 자세히 보기</summary>
   <p>{analysis.summaryKo}</p>
  </details>}
  <small className={styles.analysisMeta}>AI 잠정 평가 · {kstDate(new Date(analysis.analyzedAt).toISOString())} 분석 · 사실과 해석 구분</small>
 </div>;
}

export default function OutbreakNewsMetadataR41({eventId,items}:{eventId:string;items:IranNewsMetadataItemR41[]}){
 const [expanded,setExpanded]=useState(false);
 const shown=expanded?items:items.slice(0,10);
 const [translatedTitles,setTranslatedTitles]=useState<Record<string,string>>({});
 const attemptedTranslations=useRef(new Set<string>());
 const mounted=useRef(true);
 const {payload:analyses,loading:analysisLoading,error:analysisError}=useStoredIndex<NewsAnalysisPayload>(
  "/api/outbreak-news/iran/analysis-r1",null,eventId==="iran"&&items.length>0
 );
 const approvedItems=analyses?.version==="IRAN_NEWS_ANALYSIS_R1"&&
  (analyses.status==="READY"||analyses.status==="PARTIAL")&&Array.isArray(analyses.items)?analyses.items:[];
 const analysisById=new Map<string,NewsAnalysisItem>(approvedItems.map(item=>[item.id,item] as const));
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const shownSignature=shown.map(item=>`${item.id}:${item.title}`).join('\u001f');
 useEffect(()=>{
  // Preserve the existing free browser translation and source links.
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
 const evaluatedCount=items.filter(item=>validAnalysis(analysisById.get(item.id),item)).length;
 return <section className="ob57-news ob-panel" aria-labelledby={`ob57-news-${eventId}`} data-testid={`outbreak-news-${eventId}`}>
  <header className="ob57-news-header">
   <div className="ob57-news-heading">
    <h3 id={`ob57-news-${eventId}`}><Newspaper size={16} aria-hidden="true"/>주요 뉴스</h3>
    <span className="ob57-news-count">{items.length}건</span>
   </div>
  </header>
  <div className="ob57-news-list" aria-live="polite">
   {shown.map(item=>{
    const candidate=analysisById.get(item.id);
    const analysis=validAnalysis(candidate,item)?candidate:undefined;
    const title=analysis?.titleKo?.trim()||translatedTitles[`${eventId}:${item.id}:title:${item.title}`]||item.title;
    return <article className={`ob57-news-item${analysis?` ${styles.articleReady}`:""}`} key={item.id} data-analysis-status={analysis?"READY":"PENDING"}>
     <div className="ob57-news-meta"><strong>{item.source}</strong>
      <time dateTime={item.publishedAt}>{kstDate(item.publishedAt)}</time></div>
     <h4 title={title!==item.title?`영문 원제목: ${item.title}`:undefined}>{title}</h4>
     {analysis?<IranNewsEvaluationCard analysis={analysis}/>:<div className={styles.evaluation}><p className={styles.pendingText}>자동 평가·해석 대기 중입니다. 원문 기사를 확인할 수 있습니다.</p></div>}
     <div className="ob57-news-foot">
      {analysis?<span className="ob57-impact" data-impact={analysis.impact}>{impactLabels[analysis.impact]}</span>:<span>분석 대기</span>}
      <div className="ob57-news-actions">
       <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" title="원문 기사 사이트 열기"
        aria-label={`${item.source} 원문 기사 사이트 열기: ${title}`}><ExternalLink size={15} aria-hidden="true"/></a>
      </div>
     </div>
    </article>;
   })}
  </div>
  <footer className="ob57-news-footer">
   <small>뉴스 {items.length}건 · AI 잠정 평가 {evaluatedCount}건. 기사 해석은 참고용이며 R5 전쟁 심리 점수 산식에 반영하지 않습니다.
    {analysisError?" 분석 저장자료 연결을 확인 중입니다.":analysisLoading?" 최신 평가를 확인 중입니다.":""}
    {items.some(item=>needsKoreanTranslation(item.title))&&<> 영문 제목은 <a href="https://mymemory.translated.net/terms-and-conditions" target="_blank" rel="noopener noreferrer">MyMemory</a> 무료 자동 번역을 시도하며, 실패 시 원문을 유지합니다.</>}
   </small>
   {items.length>10&&<button className="ob57-news-more" type="button" aria-expanded={expanded}
    onClick={()=>setExpanded(value=>!value)}>{expanded?"접기":`뉴스 더보기 (${items.length-10}건)`}
    <ChevronDown size={14} aria-hidden="true"/></button>}
  </footer>
 </section>;
}
