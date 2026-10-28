'use client';

import {useEffect,useState} from 'react';

type Props={start:string;end:string;activeDate:string|null;query:string;importance:'all'|1|2|3;enabled:boolean;
 onCounts:(counts:Record<string,number>)=>void};

export default function EarningsDisplayClient({start,end,activeDate,query,importance,enabled,onCounts}:Props){
 const [state,setState]=useState<'pending'|'ready'|'unavailable'|'failed'>('pending');
 const [html,setHtml]=useState('');
 useEffect(()=>{
  if(!enabled){setHtml('');setState('unavailable');onCounts({});return;}
  const controller=new AbortController();
  const params=new URLSearchParams({start,end,q:query.slice(0,80)});
  if(activeDate)params.set('day',activeDate);
  if(importance!=='all')params.set('importance',String(importance));
  setState('pending');
  fetch(`/api/earnings-calendar-display?${params}`,{signal:controller.signal,cache:'no-store'})
   .then(async response=>{
    if(response.status===204)return {status:'unavailable' as const,html:'',counts:{}};
    if(!response.ok)throw Error('EARNINGS_DISPLAY_UNAVAILABLE');
    const counts:Record<string,number>={};
    for(const part of (response.headers.get('x-display-day-counts')??'').split(',')){
     const match=/^(20\d\d-\d\d-\d\d):(\d+)$/.exec(part);
     if(match)counts[match[1]]=Number(match[2]);
    }
    return {status:'ready' as const,html:await response.text(),counts};
   }).then(result=>{if(!controller.signal.aborted){setHtml(result.html);setState(result.status);onCounts(result.counts);}})
   .catch(()=>{if(!controller.signal.aborted){setHtml('');setState('failed');onCounts({});}});
  return()=>controller.abort();
 },[start,end,activeDate,query,importance,enabled,onCounts]);
 if(!enabled||state==='unavailable')return null;
 return <div className="mc-earnings-display" aria-label="EarningsAPI 기업 실적 발표 예정일">
  {state==='pending'&&<p className="mc-data-state">기업 실적 저장본을 불러오는 중입니다.</p>}
  {state==='failed'&&<p className="mc-data-state">기업 실적 화면 표시본을 불러오지 못했습니다.</p>}
  {state==='ready'&&<div dangerouslySetInnerHTML={{__html:html}}/>}
  {state==='ready'&&!!html&&<p className="mc-data-state">EarningsAPI 제공 예정일 · 기업 확정 일정이 아니며, 발표시각은 제공원 기준 장전·장후 또는 미정입니다.</p>}
 </div>;
}
