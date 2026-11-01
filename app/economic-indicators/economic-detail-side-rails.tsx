"use client";

import {useEffect,useRef,useState} from "react";
import {Activity,BarChart3,ChevronRight,Menu,MessageCircle,TrendingUp,X} from "lucide-react";
import {ECONOMIC_DETAIL_CATALOG} from "@/lib/economic-detail-catalog";
import CommunityChat from "@/components/community-chat";
import "@/components/risk-detail-side-rails.css";

const WIDE_QUERY="(min-width: 1650px)";
export default function EconomicDetailSideRails({pathname}:{pathname:string}){
 const [wide,setWide]=useState(false);
 const [leftOpen,setLeftOpen]=useState(false);
 const [rightOpen,setRightOpen]=useState(false);
 const leftButton=useRef<HTMLButtonElement>(null);
 const rightButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const media=window.matchMedia(WIDE_QUERY);
  const update=()=>{setWide(media.matches);setLeftOpen(false);setRightOpen(false);};
  update();media.addEventListener("change",update);
  return()=>media.removeEventListener("change",update);
 },[]);
 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{
   if(e.key!=="Escape"||wide)return;
   if(leftOpen){setLeftOpen(false);leftButton.current?.focus();}
   if(rightOpen){setRightOpen(false);rightButton.current?.focus();}
  };
  window.addEventListener("keydown",onKey);
  return()=>window.removeEventListener("keydown",onKey);
 },[wide,leftOpen,rightOpen]);
 const leftVisible=wide||leftOpen;
 const rightVisible=wide||rightOpen;
 const anyMobileOpen=!wide&&(leftOpen||rightOpen);
 return <div className="zg-risk-side-rails-root zg-economic-side-rails-root" data-wide={wide?"true":"false"}>
  {anyMobileOpen&&<button type="button" className="zg-risk-side-veil" aria-label="열린 패널 닫기" tabIndex={-1} onClick={()=>{setLeftOpen(false);setRightOpen(false);}}/>}
  <aside id="zg-economic-side-nav-panel" className="zg-risk-side-rail zg-risk-side-left" data-open={leftVisible?"true":"false"} aria-label="12대 메인 지표 이동" aria-hidden={!leftVisible} inert={!leftVisible}>
   <div className="zg-risk-side-head"><BarChart3 size={19} aria-hidden="true"/><strong>경제 지표</strong><button type="button" className="zg-risk-rail-close" aria-label="목록 닫기" onClick={()=>setLeftOpen(false)}><X size={18}/></button></div>
   <p className="zg-risk-side-intro">12개 주요 경제 지표로 이동합니다.</p>
   <nav aria-label="12대 메인 지표 상세페이지">
    {ECONOMIC_DETAIL_CATALOG.map((card,index)=>{
     const href="/economic-indicators/"+card.slug+"/";
     const Icon=index%3===0?Activity:index%3===1?TrendingUp:BarChart3;
     const selected=pathname===href;
     return <a key={card.id} href={href} className={selected?"zg-risk-side-link is-current":"zg-risk-side-link"} aria-current={selected?"page":undefined} onClick={()=>setLeftOpen(false)}>
      <Icon size={19} aria-hidden="true"/><span>{card.name}</span><ChevronRight size={16} aria-hidden="true"/>
     </a>;
    })}
   </nav>
  </aside>
  <aside className="zg-risk-side-rail zg-risk-side-right" data-open={rightVisible?"true":"false"} aria-label="시장 채팅" aria-hidden={!rightVisible} inert={!rightVisible}>
   <CommunityChat enabled sidebarMode sidebarOpen={rightVisible} onSidebarClose={()=>setRightOpen(false)}/>
  </aside>
  <div className="zg-risk-side-actions" aria-label="상세페이지 도구">
   <button ref={leftButton} type="button" className="zg-risk-side-action is-left" aria-label={leftOpen?"경제지표 목록 닫기":"경제지표 목록 열기"} aria-controls="zg-economic-side-nav-panel" aria-expanded={leftOpen} onClick={()=>{setLeftOpen(v=>!v);setRightOpen(false);}}><Menu size={22}/></button>
   <button ref={rightButton} type="button" className="zg-risk-side-action is-right" aria-label={rightOpen?"시장 채팅 닫기":"시장 채팅 열기"} aria-controls="zg-community-chat-panel" aria-expanded={rightOpen} onClick={()=>{setRightOpen(v=>!v);setLeftOpen(false);}}><MessageCircle size={22}/></button>
  </div>
 </div>;
}
