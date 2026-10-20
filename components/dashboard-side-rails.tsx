"use client";

import {useEffect,useRef,useState} from "react";
import {MessageCircle,Star,X} from "lucide-react";
import CommunityChat from "./community-chat";
import {RISK_FAVORITE_SOURCES} from "./dashboard-favorite-sources";
import {ECONOMIC_DETAIL_CATALOG} from "../lib/economic-detail-catalog";
import {getEconomicFavoritePreview,getRiskFavoritePreview,RISK_FAVORITE_ENDPOINTS,type DashboardFavoritePreview} from "./dashboard-favorite-preview";
import "./risk-detail-side-rails.css";
import "./dashboard-side-rails.css";

export type DashboardFavoriteLink={key:string;label:string;group:string;href:string;exampleScore?:number};
type FavoriteRow=DashboardFavoriteLink;
const WIDE_QUERY="(min-width: 1650px)";
const ECONOMIC_KEY="zgmini:economic:favorites:v1";
const ECONOMIC_LABELS_KEY="zgmini:economic:favorite-labels:v1";
function savedStrings(key:string):string[]{
 try{
  const value=JSON.parse(localStorage.getItem(key)??"[]");
  return Array.isArray(value)?value.filter((x):x is string=>typeof x==="string"&&x.length<160):[];
 }catch{return [];}
}
function savedEconomicLabels():Record<string,string>{
 try{
  const entry=JSON.parse(localStorage.getItem(ECONOMIC_LABELS_KEY)??"{}");
  return entry&&typeof entry==="object"&&!Array.isArray(entry)?entry:{};
 }catch{return {};}
}
function browserFavorites():FavoriteRow[]{
 const rows:FavoriteRow[]=[];
 for(const source of RISK_FAVORITE_SOURCES){
  for(const id of savedStrings(source.storageKey)){
   const label=source.labels[id as keyof typeof source.labels]??(id.startsWith("development:")?id.slice(12):id);
   rows.push({key:source.storageKey+":"+id,label,group:source.title,href:source.href});
  }
 }
 const labels=savedEconomicLabels();
 for(const id of savedStrings(ECONOMIC_KEY)){
  const separator=id.indexOf(":");
  if(separator<1)continue;
  const domain=id.slice(0,separator),indicator=id.slice(separator+1);
  const entry=ECONOMIC_DETAIL_CATALOG.find(x=>x.id===domain);
  if(!entry||!indicator)continue;
  const label=typeof labels[id]==="string"&&labels[id].trim()?labels[id]:indicator;
  rows.push({key:ECONOMIC_KEY+":"+id,label,group:"12대 · "+entry.name,href:"/economic-indicators/"+entry.slug+"/"});
 }
 return rows;
}
export default function DashboardSideRails({accountFavorites}:{accountFavorites:DashboardFavoriteLink[]}){
 const [wide,setWide]=useState(false);
 const [leftOpen,setLeftOpen]=useState(false);
 const [rightOpen,setRightOpen]=useState(false);
 const [saved,setSaved]=useState<FavoriteRow[]>([]);
 const [previews,setPreviews]=useState<Record<string,DashboardFavoritePreview|null>>({});
 const leftButton=useRef<HTMLButtonElement>(null);
 const rightButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const media=window.matchMedia(WIDE_QUERY);
  const update=()=>{setWide(media.matches);setLeftOpen(false);setRightOpen(false);};
  update();media.addEventListener("change",update);
  return()=>media.removeEventListener("change",update);
 },[]);
 useEffect(()=>{
  const refresh=()=>setSaved(browserFavorites());
  const onStorage=(e:StorageEvent)=>{if(!e.key||e.key.startsWith("zgmini:"))refresh();};
  refresh();
  window.addEventListener("storage",onStorage);
  window.addEventListener("focus",refresh);
  window.addEventListener("pageshow",refresh);
  return()=>{
   window.removeEventListener("storage",onStorage);
   window.removeEventListener("focus",refresh);
   window.removeEventListener("pageshow",refresh);
  };
 },[]);
 useEffect(()=>{
  if(!saved.some(x=>x.key.startsWith(ECONOMIC_KEY+":")))return;
  const ctrl=new AbortController();
  // Read saved public indicator names; never calculate, collect, or publish anything.
  void fetch("/api/market-score",{cache:"no-store",signal:ctrl.signal})
   .then(r=>r.ok?r.json():null)
   .then((payload:unknown)=>{
    if(!payload||typeof payload!=="object")return;
    const domains=(payload as {domains?:Array<{id?:string;indicators?:Array<{id?:string;label?:string;name?:string}>}>}).domains;
    const resolved:Record<string,DashboardFavoritePreview|null>={};
    for(const selected of saved){
     if(!selected.key.startsWith(ECONOMIC_KEY+":"))continue;
     const id=selected.key.slice(ECONOMIC_KEY.length+1),at=id.indexOf(":");
     if(at<1)continue;
     resolved[selected.key]=getEconomicFavoritePreview(id.slice(0,at),id.slice(at+1),payload);
    }
    setPreviews(previous=>({...previous,...resolved}));
    if(!Array.isArray(domains))return;
    const labels=savedEconomicLabels();
    let changed=false;
    for(const domain of domains){
     if(typeof domain?.id!=="string"||!Array.isArray(domain.indicators))continue;
     for(const indicator of domain.indicators){
      const name=indicator?.label??indicator?.name;
      const key=domain.id+":"+indicator?.id;
      if(typeof name!=="string"||!name.trim()||!saved.some(x=>x.key===ECONOMIC_KEY+":"+key)||labels[key]===name)continue;
      labels[key]=name;changed=true;
     }
    }
    if(changed){
     try{localStorage.setItem(ECONOMIC_LABELS_KEY,JSON.stringify(labels));}catch{}
     setSaved(browserFavorites());
    }
   }).catch(()=>{/* Keep existing favorites if a stored snapshot cannot be read. */});
  return()=>ctrl.abort();
 // Fetch only when the set of starred economic IDs changes, not on label refresh.
 },[saved.map(x=>x.key.startsWith(ECONOMIC_KEY+":")?x.key:"").filter(Boolean).join("|")]);
 useEffect(()=>{
  // Fetch only stored public results for risk groups containing actual bookmarks.
  // No request is made for a group without saved favorites.
  const groups=RISK_FAVORITE_SOURCES.filter(source=>saved.some(row=>row.key.startsWith(source.storageKey+":")));
  if(groups.length===0)return;
  const controller=new AbortController();
  void Promise.all(groups.map(async source=>{
   let snapshot:unknown=null;
   try{
    const response=await fetch(RISK_FAVORITE_ENDPOINTS[source.storageKey],{cache:"no-store",signal:controller.signal});
    if(response.ok)snapshot=await response.json();
   }catch{/* Unavailable saved results are not replaced with synthetic numbers. */}
   if(controller.signal.aborted)return [];
   return saved.filter(row=>row.key.startsWith(source.storageKey+":"))
    .map(row=>[row.key,getRiskFavoritePreview(source.storageKey,row.key.slice(source.storageKey.length+1),snapshot)] as const);
  })).then(parts=>{
   if(controller.signal.aborted)return;
   setPreviews(previous=>({...previous,...Object.fromEntries(parts.flat())}));
  }).catch(()=>{});
  return()=>controller.abort();
 // Refresh only when the starred risk indicator ID list changes.
 },[saved.filter(row=>!row.key.startsWith(ECONOMIC_KEY+":")).map(row=>row.key).join("|")]);
 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{
   if(e.key!=="Escape"||wide)return;
   if(leftOpen){setLeftOpen(false);leftButton.current?.focus();}
   if(rightOpen){setRightOpen(false);rightButton.current?.focus();}
  };
  window.addEventListener("keydown",onKey);
  return()=>window.removeEventListener("keydown",onKey);
 },[wide,leftOpen,rightOpen]);
 const all=[...saved,...accountFavorites];
 const leftVisible=wide||leftOpen,rightVisible=wide||rightOpen;
 return <div className="zg-risk-side-rails-root zg-dashboard-side-rails-root" data-wide={wide?"true":"false"}>
  {!wide&&(leftOpen||rightOpen)&&<button type="button" className="zg-risk-side-veil" aria-label="열린 패널 닫기" tabIndex={-1} onClick={()=>{setLeftOpen(false);setRightOpen(false);}}/>}
  <aside id="zg-dashboard-favorites-panel" className="zg-risk-side-rail zg-risk-side-left" data-open={leftVisible?"true":"false"} aria-label="내 즐겨찾기 지표" aria-hidden={!leftVisible} inert={!leftVisible}>
   <div className="zg-risk-side-head"><Star size={19} aria-hidden="true"/><strong>즐겨찾기</strong><span className="zg-dashboard-favorite-count" aria-label={"즐겨찾기 "+all.length+"개"}>{all.length}</span><button type="button" className="zg-risk-rail-close" aria-label="즐겨찾기 닫기" onClick={()=>setLeftOpen(false)}><X size={18}/></button></div>
   {all.length?<nav aria-label="즐겨찾기한 지표 이동">
    {all.map(item=>{
     const detail=previews[item.key];
     const example=typeof item.exampleScore==="number"&&Number.isFinite(item.exampleScore)?item.exampleScore:null;
     const value=detail?.value??(example!==null?"예시 "+example.toFixed(1)+"점":"—");
     const judgement=detail?.judgement??(example!==null?"예시 데이터":"자료 미제공");
     const tone=detail?.tone??"missing";
     // Keep the precise saved value unchanged. Only move its label into a separate visual slot.
     const metricKind=value.startsWith("현재 ")?"현재":value.startsWith("평가 ")?"평가":value.startsWith("예시 ")?"예시":"현재";
     const metricValue=value==="—"?value:value.slice(metricKind.length+1);
     const date=detail?.date?(detail.dateKind+" "+detail.date):"";
     return <a key={item.key} href={item.href} className="zg-risk-side-link zg-dashboard-favorite-link" data-tone={tone} aria-label={item.label+" 상세 보기"} onClick={()=>setLeftOpen(false)}>
      <span className="zg-dashboard-favorite-card-head">
       <Star size={14} aria-hidden="true"/>
       <strong>{item.label}</strong>
      </span>
      <span className="zg-dashboard-favorite-reading">
       <span className="zg-dashboard-favorite-metric">
        <small>{metricKind}</small>
        <b>{metricValue}</b>
       </span>
       <span className="zg-dashboard-favorite-status" data-tone={tone}><span aria-hidden="true" className="zg-dashboard-favorite-status-dot"/>{judgement}</span>
      </span>
      <span className="zg-dashboard-favorite-context">
       <span>{item.group}</span>
       {date&&<time>{date}</time>}
      </span>
     </a>;
    })}
   </nav>:<p className="zg-dashboard-favorites-empty">즐겨찾기한 지표가 없습니다. 지표 상세페이지의 별표(☆)로 추가할 수 있습니다.</p>}
  </aside>
  <aside className="zg-risk-side-rail zg-risk-side-right" data-open={rightVisible?"true":"false"} aria-label="시장 채팅" aria-hidden={!rightVisible} inert={!rightVisible}>
   <CommunityChat enabled sidebarMode sidebarOpen={rightVisible} onSidebarClose={()=>setRightOpen(false)}/>
  </aside>
  <div className="zg-risk-side-actions" aria-label="대시보드 도구">
   <button ref={leftButton} type="button" className="zg-risk-side-action is-left" aria-label={leftOpen?"즐겨찾기 닫기":"즐겨찾기 열기"} aria-controls="zg-dashboard-favorites-panel" aria-expanded={leftOpen} onClick={()=>{setLeftOpen(v=>!v);setRightOpen(false);}}><Star size={22}/></button>
   <button ref={rightButton} type="button" className="zg-risk-side-action is-right" aria-label={rightOpen?"시장 채팅 닫기":"시장 채팅 열기"} aria-controls="zg-community-chat-panel" aria-expanded={rightOpen} onClick={()=>{setRightOpen(v=>!v);setLeftOpen(false);}}><MessageCircle size={22}/></button>
  </div>
 </div>;
}
