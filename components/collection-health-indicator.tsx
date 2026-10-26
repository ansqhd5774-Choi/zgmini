"use client";
import {useEffect,useRef,useState} from 'react';
import {Info} from 'lucide-react';
import './collection-health.css';

// Operational failures remain in the owner's PC alerts and diagnostic logs.
export default function CollectionHealthIndicator(){
 const [open,setOpen]=useState(false);
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!open)return;
  const close=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))setOpen(false)};
  document.addEventListener('pointerdown',close);
  return()=>document.removeEventListener('pointerdown',close);
 },[open]);
 return <div ref={ref} className="zg-collection-health unknown" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onKeyDown={event=>{if(event.key==='Escape')setOpen(false)}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
  <button type="button" aria-label="데이터 갱신 안내" aria-expanded={open} aria-controls="zg-collection-health-popup" onClick={()=>setOpen(true)} onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setOpen(true)}}><Info size={18} aria-hidden="true"/></button>
  {open&&<div id="zg-collection-health-popup" role="status"><strong>데이터 갱신 안내</strong><span>지표별 발표 주기와 거래일에 따라 갱신됩니다.</span><span>각 지표의 기준일과 출처를 확인해 주세요.</span><a href="/data-sources/">지표·데이터 출처 보기</a></div>}
 </div>;
}
