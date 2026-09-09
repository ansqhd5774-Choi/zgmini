"use client";
import {useEffect,useState} from 'react';
import {Area,AreaChart,CartesianGrid,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {Star} from 'lucide-react';
import {AccordionItem,AccordionTrigger,AccordionContent} from '@/components/ui/accordion';
import {periodData,releaseDDay} from '@/lib/pce/data.mjs';
type Point={date:string;value:number;rawYoy:number;status:'actual'};
type Event={title:string;utc:string};
type Payload={status:string;actual:Point[];referenceMonth?:string;interpretation?:string;source?:string;sourceUrl?:string;nextRelease?:Event|null;release?:Event|null;scheduleStatus?:string;checkedAt?:string};
const monthText=(date:string)=>`${date.slice(0,4)}년 ${Number(date.slice(5,7))}월`;
const releaseText=(utc:string,zone:string)=>new Intl.DateTimeFormat('ko-KR',{timeZone:zone,year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(utc));
export default function CorePceRow({period}:{period:string}){
 const [data,setData]=useState<Payload|null>(null),[failed,setFailed]=useState(false),[months,setMonths]=useState(1),[now,setNow]=useState(()=>new Date().toISOString());
 useEffect(()=>{setMonths(period==='1년'?12:period==='6개월'?6:1);},[period]);
 useEffect(()=>{let active=true;async function load(){try{const r=await fetch('/api/core-pce',{cache:'no-store'});const d=await r.json() as Payload;if(!r.ok||d.status!=='OK'||!Array.isArray(d.actual)||!d.actual.length)throw Error('INVALID_DATA');if(active){setData(d);setFailed(false);}}catch{if(active){setData(null);setFailed(true);}}}void load();const interval=setInterval(()=>{setNow(new Date().toISOString());void load();},300000);return()=>{active=false;clearInterval(interval);};},[]);
 const actual=data?.actual??[],latest=actual.at(-1),previous=actual.at(-2),visible=periodData(actual,months) as Point[];
 const unavailable=failed?'최신 데이터 확인 불가':'데이터 확인 중';
 const current=latest?`${latest.value.toFixed(1)}%`:unavailable;
 const next=data?.nextRelease;const unchanged=latest&&previous&&latest.value===previous.value;
 const trend=latest&&previous?(unchanged?'전월 대비 동일':latest.value>previous.value?'전월 대비 상승':'전월 대비 하락'):'확인 불가';
 const color=unchanged?'#64748b':latest&&previous&&latest.value<previous.value?'#059669':'#e11d48';
 return <AccordionItem value="core-pce" className="indicator-item" data-testid="core-pce-row">
  <AccordionTrigger className="indicator-trigger px-4 hover:no-underline"><div className="indicator-grid min-w-0 flex-1">
   <div className="indicator-country"><img src="/flags/us.svg" alt=""/><small>미국</small></div>
   <div className="indicator-stars" aria-label="중요도 5점">{[1,2,3,4,5].map(n=><Star key={n} className="size-3 fill-amber-400 text-amber-400"/>)}</div>
   <div><p className="text-sm font-bold text-slate-950">근원 PCE 물가</p><p className="text-xs font-normal text-slate-500">Core PCE</p></div>
   <div className="flex flex-col items-center"><div style={{width:108,height:38}}>{actual.length>0&&<ResponsiveContainer width="100%" height="100%"><AreaChart data={periodData(actual,6)}><ReferenceLine y={2} stroke="#94a3b8" strokeDasharray="3 3"/><YAxis hide domain={[1,'auto']}/><Area isAnimationActive={false} dataKey="value" type="linear" stroke={color} fill="transparent" strokeWidth={2}/></AreaChart></ResponsiveContainer>}</div><span className="text-[11px] font-normal text-slate-500">물가 목표 2.0%</span></div>
   <div><strong className="text-sm text-slate-950">{current}</strong><small>{latest?`${monthText(latest.date)} 기준`:'—'}</small></div>
   <div><strong className="text-sm text-slate-800">데이터 없음</strong><small>이전 {previous?`${previous.value.toFixed(1)}% · ${previous.date}`:'—'}</small></div>
   <span className="text-xs font-semibold" style={{color}}>{trend}</span><span className="text-xs text-slate-600">{latest&&previous?(unchanged?'중립':latest.value<previous.value?'긍정':'부정'):'확인 불가'}</span>
   <span className="text-xs font-bold text-slate-600">월간</span><div><strong className="text-xs text-slate-800">{next?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric'}).format(new Date(next.utc)):'일정 확인 불가'}</strong><small className="d-day">{next?releaseDDay(next.utc,now):'—'}</small></div>
  </div></AccordionTrigger>
  <AccordionContent className="p-0"><div className="indicator-detail" data-testid="core-pce-detail">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-5 py-4"><h3 className="text-lg font-extrabold text-slate-950">근원 PCE 물가 과거 흐름</h3><div className="flex flex-wrap gap-1" role="group" aria-label="근원 PCE 조회 기간">{[[1,'1개월'],[3,'3개월'],[6,'6개월'],[12,'1년']].map(([n,label])=><button key={n} type="button" aria-pressed={months===n} onClick={()=>setMonths(Number(n))} className={`min-h-10 px-3 text-sm ${months===n?'bg-blue-700 text-white':'bg-slate-200 text-slate-700'}`}>{label}</button>)}</div></div>
   <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.75fr)]"><div className="min-w-0"><p className="mb-2 text-xs text-slate-500">최신 발표 기준 {months===12?'1년':`${months}개월`} · {visible.length?`${visible[0].date} ~ ${visible.at(-1)!.date}`:'데이터 없음'}</p>
    <div className="h-72 w-full" aria-label="근원 PCE 실제 발표 데이터 차트">{visible.length>0?<ResponsiveContainer width="100%" height="100%"><AreaChart data={visible} margin={{top:18,right:25,left:-12,bottom:0}}>
     <defs><linearGradient id="pce-actual" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2463eb" stopOpacity={0.28}/><stop offset="100%" stopColor="#2463eb" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false}/>
     <XAxis dataKey="date" tickFormatter={(date:string)=>Number(date.slice(5))===1?`${date.slice(0,4)}년 1월`:`${Number(date.slice(5))}월`} axisLine={false} tickLine={false} tick={{fill:'#64748b',fontSize:12}}/>
     <YAxis domain={([min,max]:readonly [number,number])=>[Math.min(1,min),Math.max(3,max+0.2)]} axisLine={false} tickLine={false} tick={{fill:'#64748b',fontSize:12}}/>
     <ReferenceLine y={2} stroke="#e11d48" strokeDasharray="5 4" label={{value:'기준 2%',position:'insideTopRight',fill:'#be123c',fontSize:12}}/>
     <Tooltip labelFormatter={label=>monthText(String(label))} formatter={value=>[`${Number(value).toFixed(1)}%`,'근원 PCE · 실제']} contentStyle={{borderRadius:0,border:'1px solid #94a3b8'}}/>
     <Area type="linear" dataKey="value" stroke="#2463eb" strokeWidth={2.8} fill="url(#pce-actual)" dot={{r:4}} activeDot={{r:5}} isAnimationActive={false}/>
    </AreaChart></ResponsiveContainer>:<div className="grid h-full place-items-center text-sm text-slate-500">{unavailable}</div>}</div>
    <p className="mt-2 text-xs text-slate-500">{latest?`마지막 실제 데이터: ${monthText(latest.date)} ${latest.value.toFixed(1)}%`:'실제 데이터 없음'}</p>
   </div><div className="min-w-0"><div className="grid grid-cols-3 gap-px border border-slate-300 bg-slate-300">{[['현재',current],['예상','데이터 없음'],['예상 차이','—']].map(([label,value])=><div key={label} className="bg-slate-100 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-base font-bold text-slate-800">{value}</p></div>)}</div>
    <div className="analysis-box analysis-neutral"><p className="text-sm font-extrabold">자동 해석</p><p className="mt-2 text-sm leading-6">{data?.interpretation??unavailable}</p></div>
    <dl className="mt-4 space-y-3 border-t border-slate-300 pt-4 text-sm"><div><dt className="text-xs text-slate-500">다음 발표</dt><dd className="mt-1 font-bold text-slate-700">{next?<>{releaseText(next.utc,'America/New_York')} ET<br/>{releaseText(next.utc,'Asia/Seoul')} KST · {releaseDDay(next.utc,now)}<br/><span className="text-xs font-normal">{next.title}</span></>:'공식 일정 확인 불가'}</dd></div><div><dt className="text-xs text-slate-500">Actual 출처</dt><dd><a href={data?.sourceUrl??'https://fred.stlouisfed.org/series/PCEPILFE'} target="_blank" rel="noreferrer" className="text-blue-700">FRED (BEA)</a>{data?.release&&<small className="block text-slate-500">발표: {releaseText(data.release.utc,'America/New_York')} ET</small>}</dd></div><div><dt className="text-xs text-slate-500">Forecast 출처</dt><dd className="text-slate-600">연결된 예상치 데이터 없음</dd></div></dl>
   </div></div></div></AccordionContent>
 </AccordionItem>;
}

