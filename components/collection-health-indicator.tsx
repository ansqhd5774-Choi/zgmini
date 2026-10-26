"use client";
import {useEffect,useRef,useState} from 'react';
import {Wifi} from 'lucide-react';
import './collection-health.css';
type Health={normal:number;total:number;unknown?:number;failed?:number;recentFailures?:number;latestUnknown?:number;checkedAt:string;status:'healthy'|'partial'|'stale'|'unknown';items?:{id:string;outcome:string;checkedAt?:number|null;reason?:string;nextRetryAt?:number}[]};
const labels:Record<string,string>={'job:macroCredit':'거시 신용','job:macro':'거시경제','job:rates':'금리','job:credit':'채권·신용','job:supply':'공급','job:fundFlows':'자금흐름','job:bisDsr':'부채상환','job:bisTc':'부채 규모','job:earnings':'기업실적','job:consumption':'소비','job:breadth':'시장 폭','job:inflation':'물가','job:employment':'고용','job:growth':'경기','feed:fear-greed':'미국 공포·탐욕','feed:market-data':'경제 지표','feed:core-pce':'근원 PCE',korea:'한국 시장','job:iranArticles':'이란 보도','job:assetR10Alpaca':'주식 가격','job:supplyR10':'공급충격','job:sectorEtf':'섹터 ETF','job:themePrimary':'테마 1차 가격','job:themeSecondary':'테마 보조 가격','job:themeBiotech':'바이오 테마 수집','job:themeDataCenterPower':'데이터센터·전력 수집','job:releaseCalendar':'경제 발표 일정','job:themeSpaceSatellite':'우주·위성 수집'};
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
 const latestUnknown=health?.latestUnknown??health?.unknown??0;
 const text=health?`최근 8일 성공 ${health.normal}/${health.total}${health.recentFailures?` · 최신 실패 ${health.recentFailures}`:''}${latestUnknown?` · 최신 미확인 ${latestUnknown}`:''}`:'수집 상태 확인 불가';
 const attention=health?.items?.filter(item=>item.outcome!=='success'||!item.checkedAt||Date.now()-item.checkedAt>=8*86400000)??[];
 const date=health?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(health.checkedAt))+' KST':'확인 기록 없음';
 const supply=health?.items?.find(item=>item.id==='job:supplyR10'&&item.outcome==='failure');
 const reason=supply?.reason==='PROVIDER_MAINTENANCE'?'공급자 점검으로 갱신 지연':supply?.reason==='SOURCE_FORMAT_ERROR'?'원자료 형식 확인 필요':supply?.reason==='PROVIDER_HTTP_ERROR'?'공급자 응답 오류':supply?'수집 갱신 지연':null;
 const retry=supply?.nextRetryAt&&Number.isFinite(supply.nextRetryAt)?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(supply.nextRetryAt)):null;
 return <div ref={ref} className={`zg-collection-health ${health?.status??'unknown'}`} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onKeyDown={event=>{if(event.key==='Escape')setOpen(false)}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
  <button type="button" aria-label={`최근 8일 수집 작업: ${text}${health?.status==='stale'?', 확인 기록 만료':''}`} aria-expanded={open} aria-controls="zg-collection-health-popup" onClick={()=>setOpen(true)} onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setOpen(true)}}><Wifi size={18} aria-hidden="true"/></button>
  {open&&<div id="zg-collection-health-popup" role="status"><strong>{text}{health?.status==='stale'?' · 기록 만료':''}</strong><span>API 개수가 아닌 등록된 수집 작업 기준</span><span>최근 8일 성공 이력과 최신 시도 상태를 구분합니다.</span>{attention.map(item=><span key={item.id}>{labels[item.id]??'기타 수집'} · {item.outcome==='failure'&&!!item.checkedAt&&Date.now()-item.checkedAt<8*86400000?'최신 시도 실패':'최신 확인 기록 없음'}</span>)}{reason&&<><span>공급충격 · {reason}</span><span>기존 정상 자료 유지</span>{retry&&<span>{retry} KST 이후 정규 실행에서 재시도</span>}</>}<time dateTime={health?.checkedAt}>{date}</time></div>}
 </div>;
}
