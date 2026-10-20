"use client";

import {useEffect,useRef,useState} from "react";
import {
 Activity,BarChart3,ChartNoAxesCombined,ChevronRight,CircleDollarSign,
 Layers3,Menu,MessageCircle,ShieldAlert,TrendingDown,WalletCards,X,Zap
} from "lucide-react";
import {RISK_CARDS} from "./market-explorer-catalog";
import CommunityChat from "./community-chat";
import "./risk-detail-side-rails.css";

const RISK_ICON={
 inflationStability:Activity,
 recessionDefense:TrendingDown,
 stagflationSafety:Layers3,
 creditRiskDefense:WalletCards,
 earningsRecessionDefense:ChartNoAxesCombined,
 assetBubbleSafety:BarChart3,
 debtRiskSafety:CircleDollarSign,
 supplyShockSafety:Zap,
} as const;
const WIDE_QUERY="(min-width: 1650px)";

export default function RiskDetailSideRails({pathname}:{pathname:string}){
 const [wide,setWide]=useState(false);
 const [leftOpen,setLeftOpen]=useState(false);
 const [rightOpen,setRightOpen]=useState(false);
 const leftButton=useRef<HTMLButtonElement>(null);
 const rightButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const media=window.matchMedia(WIDE_QUERY);
  const update=()=>{setWide(media.matches);setLeftOpen(false);setRightOpen(false);};
  update();
  media.addEventListener("change",update);
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
 return <div className="zg-risk-side-rails-root" data-wide={wide?"true":"false"}>
  {anyMobileOpen&&<button type="button" className="zg-risk-side-veil" aria-label="열린 패널 닫기" tabIndex={-1} onClick={()=>{setLeftOpen(false);setRightOpen(false);}}/>}
  <aside id="zg-risk-side-nav-panel" className="zg-risk-side-rail zg-risk-side-left" data-open={leftVisible?"true":"false"} aria-label="8대 위험 지표 이동" aria-hidden={!leftVisible} inert={!leftVisible}>
   <div className="zg-risk-side-head"><ShieldAlert size={19} aria-hidden="true"/><strong>위험 지표</strong><button type="button" className="zg-risk-rail-close" aria-label="목록 닫기" onClick={()=>setLeftOpen(false)}><X size={18}/></button></div>
   <p className="zg-risk-side-intro">8개 위험 영역을 바로 이동합니다.</p>
   <nav aria-label="위험지표 상세페이지">
    {RISK_CARDS.map(card=>{
     const Icon=RISK_ICON[card.id];
     const selected=pathname===card.href;
     return <a key={card.id} href={card.href} className={selected?"zg-risk-side-link is-current":"zg-risk-side-link"} aria-current={selected?"page":undefined} onClick={()=>setLeftOpen(false)}>
      <Icon size={19} aria-hidden="true"/><span>{card.name}</span><ChevronRight size={16} aria-hidden="true"/>
     </a>;
    })}
   </nav>
  </aside>
  <aside className="zg-risk-side-rail zg-risk-side-right" data-open={rightVisible?"true":"false"} aria-label="시장 채팅" aria-hidden={!rightVisible} inert={!rightVisible}>
   <CommunityChat enabled sidebarMode sidebarOpen={rightVisible} onSidebarClose={()=>setRightOpen(false)}/>
  </aside>
  <div className="zg-risk-side-actions" aria-label="상세페이지 도구">
   <button ref={leftButton} type="button" className="zg-risk-side-action is-left" aria-label={leftOpen?"위험지표 목록 닫기":"위험지표 목록 열기"} aria-controls="zg-risk-side-nav-panel" aria-expanded={leftOpen} onClick={()=>{setLeftOpen(v=>!v);setRightOpen(false);}}><Menu size={22}/></button>
   <button ref={rightButton} type="button" className="zg-risk-side-action is-right" aria-label={rightOpen?"시장 채팅 닫기":"시장 채팅 열기"} aria-controls="zg-community-chat-panel" aria-expanded={rightOpen} onClick={()=>{setRightOpen(v=>!v);setLeftOpen(false);}}><MessageCircle size={22}/></button>
  </div>
 </div>;
}
