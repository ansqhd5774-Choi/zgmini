"use client";

import {useEffect,useState} from "react";
import {ChevronDown,ExternalLink,Languages,Newspaper} from "lucide-react";
import {iranNewsLanguages} from "../lib/iran-progress/news-language-r22.mjs";

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
 titleEn?:string;
 summaryEn?:string;
 titleKo?:string;
 summaryKo?:string;
 translationReviewed?:boolean;
 impact:"positive"|"negative"|"neutral";
 sourceUrl:string;
};

type Filter="all"|"positive"|"negative";
const kstPublicationDate=(value:string)=>{const at=Date.parse(value);return Number.isFinite(at)?new Date(at+9*3600000).toISOString().slice(0,10):value.slice(0,10);};
const labels:Record<OutbreakNewsItem["impact"],string>={
 positive:"긍정 영향",negative:"부정 영향",neutral:"중립"
};

type NewsState="ready"|"loading"|"pending"|"delayed"|"error";
type NewsProps={eventId:string;items?:OutbreakNewsItem[];newsState?:NewsState};
type LocalTranslator={translate(text:string):Promise<string>;destroy?():void};
type LocalTranslatorApi={
 availability(options:{sourceLanguage:string;targetLanguage:string}):Promise<string>;
 create(options:{sourceLanguage:string;targetLanguage:string}):Promise<LocalTranslator>;
};
const translatorApi=()=>((globalThis as typeof globalThis & {Translator?:LocalTranslatorApi}).Translator);
const translationPair={sourceLanguage:"en",targetLanguage:"ko"};
const digitTokens=(value:string)=>(value.match(/\d+(?:[,.]\d+)*/g)??[]).sort().join("|");
async function localNewsTranslation(api:LocalTranslatorApi,originalTitle:string,originalSummary:string){
 const translator=await api.create(translationPair);
 try{
  const [titleKo,summaryKo]=await Promise.all([
   translator.translate(originalTitle),translator.translate(originalSummary),
  ]);
  if(!/[가-힣]/.test(titleKo)||!/[가-힣]/.test(summaryKo)||
    digitTokens(originalTitle)!==digitTokens(titleKo)||
    digitTokens(originalSummary)!==digitTokens(summaryKo))throw Error("TRANSLATION_UNVERIFIED");
  return {titleKo,summaryKo};
 }finally{translator.destroy?.();}
}

function NewsCard({item}:{item:OutbreakNewsItem}){
 const [original,setOriginal]=useState(false);
 const [automatic,setAutomatic]=useState<{originalTitle:string;originalSummary:string;titleKo:string;summaryKo:string}|null>(null);
 const [translationState,setTranslationState]=useState<"checking"|"ready"|"download"|"busy"|"unavailable">("checking");
 const initial=iranNewsLanguages(item);
 const {titleEn,summaryEn,canMachineTranslate}=initial;
 const verifiedAutomatic=automatic?.originalTitle===titleEn&&automatic?.originalSummary===summaryEn?automatic:null;
 const languages=iranNewsLanguages(item,verifiedAutomatic);

 useEffect(()=>{
  if(!canMachineTranslate||!titleEn||!summaryEn)return;
  const api=translatorApi();
  if(!api)return;
  let active=true;
  void (async()=>{
   try{
    const status=await api.availability(translationPair);
    if(!active)return;
    if(status==="available"){
     setTranslationState("busy");
     const translated=await localNewsTranslation(api,titleEn,summaryEn);
     if(active){setAutomatic({originalTitle:titleEn,originalSummary:summaryEn,...translated});setTranslationState("ready");}
    }else setTranslationState(status==="downloadable"||status==="downloading"?"download":"unavailable");
   }catch{if(active)setTranslationState("unavailable");}
  })();
  return()=>{active=false;};
 },[item.id,titleEn,summaryEn,canMachineTranslate]);

 async function translateCard(){
  const api=translatorApi();
  if(!api||!titleEn||!summaryEn)return;
  setTranslationState("busy");
  try{
   const translated=await localNewsTranslation(api,titleEn,summaryEn);
   setAutomatic({originalTitle:titleEn,originalSummary:summaryEn,...translated});
   setOriginal(false);
   setTranslationState("ready");
  }catch{setTranslationState("unavailable");}
 }

 const displayedTitle=original&&languages.canToggle?languages.titleEn:languages.defaultTitle;
 const displayedSummary=original&&languages.canToggle?languages.summaryEn:languages.defaultSummary;
 return <article className="ob57-news-item" lang={original&&languages.canToggle?"en":languages.canToggle?"ko":undefined}>
  <div className="ob57-news-meta"><strong>{item.source}</strong><time dateTime={item.publishedAt}>{kstPublicationDate(item.publishedAt)}</time></div>
  <h4>{displayedTitle}</h4>
  <p>{displayedSummary}</p>
  <div className="ob57-news-foot">
   <span className="ob57-impact" data-impact={item.impact}>{labels[item.impact]}</span>
   <div className="ob57-news-actions">
    {languages.canToggle?<button className="ob57-news-language" type="button" aria-pressed={original} aria-label={`${item.source} 뉴스 ${original?"한국어 번역":"영어 원문"} 보기`} onClick={()=>setOriginal(value=>!value)}><Languages size={13} aria-hidden="true"/>{original?"한국어":"원문"}</button>:
     translationState==="download"?<button className="ob57-news-language" type="button" onClick={()=>void translateCard()}><Languages size={13} aria-hidden="true"/>한국어 번역</button>:
     translationState==="busy"?<span className="ob57-news-language-status" role="status">번역 중</span>:null}
    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" title="원문 기사 사이트 열기" aria-label={`${item.source} 원문 기사 사이트 열기: ${item.title}`}><ExternalLink size={15} aria-hidden="true"/></a>
   </div>
  </div>
 </article>;
}

export default function OutbreakNewsUI(props:NewsProps){
 return <OutbreakNewsBody key={props.eventId} {...props}/>;
}

function OutbreakNewsBody({eventId,items=[]}:NewsProps){
 const [filter,setFilter]=useState<Filter>("all");
 const [expanded,setExpanded]=useState(false);
 const [wide,setWide]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia("(min-width:1350px)");
  const update=()=>setWide(media.matches);
  update();media.addEventListener("change",update);
  return()=>media.removeEventListener("change",update);
 },[]);
 const valid=items.filter(item=>item&&item.id&&item.title&&item.source&&item.summary&&item.publishedAt&&item.sourceUrl&&/^https:\/\//i.test(item.sourceUrl)&&Object.prototype.hasOwnProperty.call(labels,item.impact));
 const filtered=filter==="all"?valid:valid.filter(item=>item.impact===filter);
 const initialCount=wide?4:3;
 const visible=expanded?filtered:filtered.slice(0,initialCount);
 return <section className="ob57-news ob-panel" aria-labelledby={`ob57-news-${eventId}`} data-testid={`outbreak-news-${eventId}`}>
  <header className="ob57-news-header">
   <div className="ob57-news-heading"><h3 id={`ob57-news-${eventId}`}><Newspaper size={16} aria-hidden="true"/>주요 뉴스</h3><span className="ob57-news-count">{filtered.length}건</span></div>
   <div className="ob57-news-filters" role="group" aria-label="뉴스 영향 필터">
    {([["all","전체"],["positive","긍정"],["negative","부정"]] as const).map(([id,title])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>{setFilter(id);setExpanded(false);}}>{title}</button>)}
   </div>
  </header>
  <div className="ob57-news-list" aria-live="polite">
   {visible.length?visible.map(item=><NewsCard key={item.id} item={item}/>):<div className="ob57-news-empty" role="status">
    <Newspaper size={21} aria-hidden="true"/>
    <strong>{valid.length?"선택한 방향의 뉴스가 없습니다":"주요 뉴스 연결 준비 중"}</strong>
    <span>{valid.length?"다른 영향 필터를 선택해 보세요.":"출처·기사 제목·요약·영향이 확인된 뉴스만 표시합니다. 현재는 검증된 기사를 임의로 생성하지 않습니다."}</span>
   </div>}
  </div>
  <footer className="ob57-news-footer"><small>기사 영향은 참고용 해석이며 점수 변동의 직접 원인으로 단정하지 않습니다.{valid.some(item=>item.source==="GOV.UK")&&<> <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener noreferrer">Contains public sector information licensed under OGL v3.0.</a></>}</small>{filtered.length>initialCount&&<button className="ob57-news-more" type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?"접기":`뉴스 더보기 (${filtered.length-initialCount}건)`}<ChevronDown size={14} aria-hidden="true"/></button>}</footer>
 </section>;
}
