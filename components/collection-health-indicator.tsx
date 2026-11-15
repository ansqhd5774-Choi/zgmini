"use client";
import {useEffect,useRef,useState} from 'react';
import {Wifi} from 'lucide-react';
import './collection-health.css';

type ProviderItem={
 host:string;state:'normal'|'failed'|'stale'|'unknown';
 repeated:boolean;lastAttemptAt:number|null;lastSuccessAt:number|null;
 lastOutcome:'success'|'failure'|'mixed'|'unknown';observedDays:number;
};
type ApiHealth={
 version:1;scope:'external-provider-hosts';coverage:'PARTIAL'|'UNVERIFIED';
 checkedAt?:string;status:'healthy'|'partial'|'stale'|'unknown';
 normal:number|null;total:number|null;failed:number|null;unknown:number|null;
 unverifiedSingles?:number;items?:ProviderItem[];reason?:string|null;
};
const labelOf=(state:ProviderItem['state'])=>
 state==='normal'?'HTTP 응답 확인':state==='failed'?'최근 요청 오류':
 state==='stale'?'예상 수집 시각 초과':'상태 미확인';
const stamp=(value:string|number|null|undefined)=>{
 const when=value==null?null:new Date(value);
 return when&&Number.isFinite(when.getTime())
  ?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(when)+' KST'
  :'확인 기록 없음';
};
export default function CollectionHealthIndicator(){
 const [health,setHealth]=useState<ApiHealth|null>(null);
 const [open,setOpen]=useState(false);
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let active=true,controller:AbortController|null=null;
  const load=async()=>{
   controller?.abort();const current=new AbortController();controller=current;
   try{
    const response=await fetch('/api/api-connection-health',{cache:'no-store',signal:current.signal});
    if(!response.ok)throw Error('API_CONNECTION_HEALTH_UNAVAILABLE');
    const data=await response.json() as ApiHealth;
    if(data.version!==1||data.scope!=='external-provider-hosts'||
      !['PARTIAL','UNVERIFIED'].includes(data.coverage)||
      !['healthy','partial','stale','unknown'].includes(data.status)||
      (data.total!==null&&(!Number.isInteger(data.total)||data.total<0))||
      !Array.isArray(data.items)||data.items.length>128)throw Error('API_CONNECTION_HEALTH_INVALID');
    if(active&&controller===current)setHealth(data);
   }catch{
    if(active&&controller===current&&!current.signal.aborted)setHealth(null);
   }
  };
  void load();
  const timer=window.setInterval(()=>void load(),60_000);
  const onVisible=()=>{if(document.visibilityState==='visible')void load()};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{active=false;window.clearInterval(timer);controller?.abort();document.removeEventListener('visibilitychange',onVisible)};
 },[]);
 useEffect(()=>{
  if(!open)return;
  const close=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))setOpen(false)};
  document.addEventListener('pointerdown',close);
  return()=>document.removeEventListener('pointerdown',close);
 },[open]);
 const verified=health?.total!==null&&health?.total!==undefined&&health.total>0;
 const headline=verified
  ?'외부 API 수집처 '+health!.total+'곳 관측 · HTTP 응답 '+(health!.normal??0)+' · 오류/지연 '+(health!.failed??0)
  :'외부 API 연결 상태 미확인';
 const records=health?.items?.filter(item=>item.repeated)??[];
 const state=health?.status??'unknown';
 return <div ref={ref} className={'zg-collection-health '+state} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}
  onKeyDown={event=>{if(event.key==='Escape')setOpen(false)}}
  onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
  <button type="button" aria-label={'외부 API 연결 상태: '+headline} aria-expanded={open}
   aria-controls="zg-collection-health-popup" onClick={()=>setOpen(value=>!value)}
   onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setOpen(true)}}>
   <Wifi size={18} aria-hidden="true"/>
  </button>
  {open&&<div id="zg-collection-health-popup" role="status">
   <strong>{headline}</strong>
   <span>최근 14일 반복 호출이 관측된 외부 공급자 호스트 기준</span>
   <span>전체 API 개수는 아직 미확정 · 미관측 수집기는 정상으로 계산하지 않음</span>
   {records.length>0&&<ul className="zg-api-connection-list">
    {records.slice(0,16).map(item=><li key={item.host}>
     <span>{item.host}</span>
     <span>{labelOf(item.state)} · {stamp(item.lastAttemptAt)}</span>
    </li>)}
   </ul>}
   {records.length>16&&<span>그 외 {records.length-16}곳</span>}
   {health?.unverifiedSingles? <span>단발성 호출 {health.unverifiedSingles}곳은 정상 분모에서 제외</span>:null}
   <span>HTTP 응답 성공은 원자료 저장·계산·게시 성공을 보증하지 않습니다.</span>
   {health?.reason==='SOURCE_STALE'&&<span>게시 갱신이 중단되어 이전 연결 상태를 표시하지 않습니다.</span>}
   <time dateTime={health?.checkedAt}>{stamp(health?.checkedAt)}</time>
  </div>}
 </div>;
}
