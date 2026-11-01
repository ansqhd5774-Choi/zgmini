"use client";
import {useEffect,useRef,useState} from 'react';
import {Wifi} from 'lucide-react';
import './collection-health.css';
type Health={normal:number;total:number;unknown?:number;failed?:number;recentFailures?:number;checkedAt:string;status:'healthy'|'partial'|'stale'|'unknown';items?:{id:string;outcome:string;reason?:string;nextRetryAt?:number}[]};
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
 const supply=health?.items?.find(item=>item.id==='job:supplyR10'&&item.outcome==='failure');
 const reason=supply?.reason==='PROVIDER_MAINTENANCE'?'공급자 점검으로 갱신 지연':supply?.reason==='SOURCE_FORMAT_ERROR'?'원자료 형식 확인 필요':supply?.reason==='PROVIDER_HTTP_ERROR'?'공급자 응답 오류':supply?'수집 갱신 지연':null;
 const retry=supply?.nextRetryAt&&Number.isFinite(supply.nextRetryAt)?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(supply.nextRetryAt)):null;
 return <div ref={ref} className={`zg-collection-health ${health?.status??'unknown'}`} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onKeyDown={event=>{if(event.key==='Escape')setOpen(false)}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
  <button type="button" aria-label={`최근 8일 수집 작업: ${text}${health?.status==='stale'?', 확인 기록 만료':''}`} aria-expanded={open} aria-controls="zg-collection-health-popup" onClick={()=>setOpen(true)} onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setOpen(true)}}><Wifi size={18} aria-hidden="true"/></button>
  {open&&<div id="zg-collection-health-popup" role="status"><strong>{text}{health?.status==='stale'?' · 기록 만료':''}</strong><span>최근 8일 내 정상 수집 성공 기준</span>{!!health?.recentFailures&&<span>최근 시도 실패 {health.recentFailures}건 · 정상 판정과 별도</span>}{reason&&<><span>공급충격 · {reason}</span><span>기존 정상 자료 유지</span>{retry&&<span>{retry} KST 이후 정규 실행에서 재시도</span>}</>}<time dateTime={health?.checkedAt}>{date}</time></div>}
 </div>;
}
