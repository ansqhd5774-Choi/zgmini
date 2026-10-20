"use client";

import {useEffect,useRef,useState,type ReactNode} from "react";
import CollectionHealthIndicator from "@/components/collection-health-indicator";
import RiskDetailSideRails from "@/components/risk-detail-side-rails";
import {RISK_CARDS} from "@/components/market-explorer-catalog";
import "./site-header.css";

type HeaderView="dashboard"|"scenarios";

export default function SiteHeader({activeView=null,onSelectView,accountTools}:{
 activeView?:HeaderView|null;
 onSelectView?:(view:HeaderView)=>void;
 accountTools?:ReactNode;
}){
 const headerRef=useRef<HTMLElement>(null);
 const [pathname,setPathname]=useState('');
 useEffect(()=>{setPathname(window.location.pathname)},[]);
 const pageLinks=[['/risk-indicators/','위험 지표'],['/economic-indicators/','경제 지표'],['/sector-fear-greed/','섹터 공포·탐욕'],['/theme-fear-greed/','테마 공포·탐욕']] as const;
 useEffect(()=>{
  const header=headerRef.current;
  if(!header)return;
  const updateHeight=()=>document.documentElement.style.setProperty("--zg-site-header-height",`${Math.ceil(header.getBoundingClientRect().height)}px`);
  updateHeight();
  if(typeof ResizeObserver==="undefined"){
   window.addEventListener("resize",updateHeight);
   return()=>{window.removeEventListener("resize",updateHeight);document.documentElement.style.removeProperty("--zg-site-header-height");};
  }
  const observer=new ResizeObserver(updateHeight);
  observer.observe(header);
  return()=>{observer.disconnect();document.documentElement.style.removeProperty("--zg-site-header-height");};
 },[]);
 const showRiskSideRails=RISK_CARDS.some(card=>card.href===pathname);
 return <><header ref={headerRef} className="zg-header zg-site-header text-white">
  <div className="zg-header-inner">
   {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
   <a href="/" aria-label="ZGmini 대시보드로 이동" className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
    <div className="min-w-0"><img src="/zgmini-name.png" alt="ZGmini" width={1920} height={540} className="h-auto w-36 max-w-full rounded mix-blend-lighten sm:w-44"/></div>
   </a>
   <nav aria-label="주 메뉴">
    {onSelectView
     ? <>
       <button type="button" aria-current={activeView==="dashboard"?"page":undefined} onClick={()=>onSelectView("dashboard")}>대시보드</button>
      </>
     : <>
       <a href="/">대시보드</a>
      </>}
    {pageLinks.map(([href,label])=><a key={href} href={href} aria-current={pathname===href?'page':undefined}>{label}</a>)}
    {onSelectView?<button type="button" aria-current={activeView==="scenarios"?"page":undefined} onClick={()=>onSelectView("scenarios")}>아웃브레이크</button>:<a href="/?view=scenarios">아웃브레이크</a>}
   </nav>
   <div className="zg-header-tools">
    <div className="zg-toolbar zg-toolbar-header">
     <div className="header-update"><CollectionHealthIndicator/></div>
    </div>
    <div className="zg-account-tools">{accountTools}</div>
   </div>
  </div>
 </header>{showRiskSideRails&&<RiskDetailSideRails pathname={pathname}/>}</>;
}
