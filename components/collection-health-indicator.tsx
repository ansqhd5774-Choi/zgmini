"use client";
import {useEffect,useRef,useState} from 'react';
import {Wifi} from 'lucide-react';
import './collection-health.css';

// This is the ONLY schema permitted to cross the public UI boundary.
// No names, hosts, endpoint IDs, per-request status, or internal diagnostics.
type CountLine={normal:number;failed:number;unknown:number;total:number};
type PublicHealth={
 version:1; status:'healthy'|'partial'|'stale'|'unknown';
 coverage:'PARTIAL'|'UNVERIFIED';normal:number|null;failed:number|null;
 unknown:number|null;total:number|null;checkedAt:string|null;
 api:CountLine|null;http:CountLine|null;
};
const VALID=new Set(['version','status','coverage','normal','failed','unknown','total','checkedAt','api','http']);
const goodCount=(x:unknown)=>x===null||(Number.isSafeInteger(x)&&Number(x)>=0&&Number(x)<=128);
const goodLine=(value:unknown)=>{
 if(value===null)return true;
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const x=value as Record<string,unknown>;
 return Object.keys(x).length===4&&
  ['normal','failed','unknown','total'].every(k=>Number.isSafeInteger(x[k])&&Number(x[k])>=0&&Number(x[k])<=128)&&
  Number(x.total)>0&&Number(x.normal)+Number(x.failed)+Number(x.unknown)===Number(x.total);
};
const valid=(x:unknown):x is PublicHealth=>{
 if(!x||typeof x!=='object'||Array.isArray(x))return false;
 const v=x as Record<string,unknown>;
 return Object.keys(v).length===VALID.size&&Object.keys(v).every(k=>VALID.has(k))&&
  v.version===1&&['healthy','partial','stale','unknown'].includes(String(v.status))&&
  ['PARTIAL','UNVERIFIED'].includes(String(v.coverage))&&
  ['normal','failed','unknown','total'].every(k=>goodCount(v[k]))&&goodLine(v.api)&&goodLine(v.http)&&
  (v.checkedAt===null||(typeof v.checkedAt==='string'&&Number.isFinite(Date.parse(v.checkedAt))));
};
const stamp=(value:string|null|undefined)=>{
 const when=value?new Date(value):null;
 return when&&Number.isFinite(when.getTime())
  ?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(when)+' KST'
  :'갱신 시각 미확인';
};
export default function CollectionHealthIndicator(){
 const [health,setHealth]=useState<PublicHealth|null>(null);
 const [open,setOpen]=useState(false);
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let active=true,controller:AbortController|null=null;
  const load=async()=>{
   controller?.abort();const current=new AbortController();controller=current;
   try{
    const response=await fetch('/api/api-connection-health',{cache:'no-store',signal:current.signal});
    if(!response.ok)throw Error('CONNECTION_HEALTH_UNAVAILABLE');
    const value:unknown=await response.json();
    if(!valid(value))throw Error('CONNECTION_HEALTH_INVALID');
    if(active&&controller===current)setHealth(value);
   }catch{
    if(active&&controller===current&&!current.signal.aborted)setHealth(null);
   }
  };
  void load();
  const timer=window.setInterval(()=>void load(),60_000);
  const onVisible=()=>{if(document.visibilityState==='visible')void load();};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{active=false;window.clearInterval(timer);controller?.abort();document.removeEventListener('visibilitychange',onVisible);};
 },[]);
 useEffect(()=>{
  if(!open)return;
  const onOutside=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))setOpen(false);};
  document.addEventListener('pointerdown',onOutside);
  return()=>document.removeEventListener('pointerdown',onOutside);
 },[open]);
 const known=!!health&&(health.api!==null||health.http!==null);
 const countLine=(value:CountLine|null|undefined)=>value?value.normal+'/'+value.total:'–/–';
 const headline=known
  ?'API 연결 상태 · API : '+countLine(health!.api)+' · HTTP : '+countLine(health!.http)
  :'API 연결 상태 확인 필요';
 const status=health?.status??'unknown';
 return <div ref={ref} className={'zg-collection-health '+status}
  onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}
  onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}
  onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
  <button type="button" aria-label={headline} aria-expanded={open}
   aria-controls="zg-collection-health-popup"
   onClick={()=>setOpen(v=>!v)}
   onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setOpen(true);}}>
   <Wifi size={18} aria-hidden="true"/>
  </button>
  {open&&<div id="zg-collection-health-popup" role="status">
   <strong>API 연결 상태</strong>
   {known?<>
    <span>API : {countLine(health!.api)}</span>
    <span>HTTP : {countLine(health!.http)}</span>
   </>:<span>상태 확인 중</span>}
   <time dateTime={health?.checkedAt??undefined}>{stamp(health?.checkedAt)}</time>
  </div>}
 </div>;
}
