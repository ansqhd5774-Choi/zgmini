"use client";
import {useEffect,useRef,useState} from 'react';
import {Wifi} from 'lucide-react';
import './collection-health.css';
type Health={normal:number;total:number;unknown?:number;failed?:number;checkedAt:string;status:'healthy'|'partial'|'stale'|'unknown'};
export default function CollectionHealthIndicator(){
 const [health,setHealth]=useState<Health|null>(null);
 const [open,setOpen]=useState(false);
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const abort=new AbortController();
  fetch('/api/collection-health',{cache:'no-store',signal:abort.signal}).then(async response=>{
   if(!response.ok)throw Error('unavailable');
   const value=await response.json() as Health;
   if(!Number.isInteger(value.normal)||!Number.isInteger(value.total)||value.total<=0||value.normal<0||value.normal>value.total||!Number.isFinite(Date.parse(value.checkedAt))||!['healthy','partial','stale','unknown'].includes(value.status))throw Error('invalid');
   setHealth(value);
  }).catch(()=>{});
  return()=>abort.abort();
 },[]);
 useEffect(()=>{
  if(!open)return;
  const close=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))setOpen(false)};
  document.addEventListener('pointerdown',close);
  return()=>document.removeEventListener('pointerdown',close);
 },[open]);
 const percent=health?Math.round(health.normal/health.total*1000)/10:null;
 const text=health?`${health.normal}/${health.total} 정상 · ${percent}%${health.failed?` · 실패 ${health.failed}`:health.unknown?` · 미확인 ${health.unknown}`:''}`:'수집 상태 확인 불가';
 const date=health?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(health.checkedAt))+' KST':'확인 기록 없음';
 return <div ref={ref} className={`zg-collection-health ${health?.status??'unknown'}`} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onKeyDown={event=>{if(event.key==='Escape')setOpen(false)}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
  <button type="button" aria-label={`최근 24시간 수집 작업: ${text}${health?.status==='stale'?', 확인 기록 만료':''}`} aria-expanded={open} aria-controls="zg-collection-health-popup" onClick={()=>setOpen(true)} onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setOpen(true)}}><Wifi size={18} aria-hidden="true"/></button>
  {open&&<div id="zg-collection-health-popup" role="status"><strong>{text}{health?.status==='stale'?' · 기록 만료':''}</strong><time dateTime={health?.checkedAt}>{date}</time></div>}
 </div>;
}
