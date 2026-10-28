"use client";
import {useId,useState} from 'react';
import './iran-published-chart.css';
type Point={at:number;value:number;collectionCheckedAt:number;sourceStoredAt:number;eventCount:number;lineage:string};
type DailyPoint={at:number;date?:string;value:number|null};
const date=(at:number,full=false)=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',...(full?{hour:'2-digit',minute:'2-digit',hour12:false}:{})}).format(at);
export default function IranPublishedChart({points,history=[],compact=false}:{points:Point[];history?:DailyPoint[];compact?:boolean}){
 const id=useId(),[selected,setSelected]=useState<number|null>(null);
 const rows=points.filter(p=>Number.isSafeInteger(p.at)&&Number.isFinite(p.value)).sort((a,b)=>a.at-b.at);
 const last=rows.at(-1);if(!last)return null;
 const current=rows.find(p=>p.at===selected)??last,index=rows.indexOf(current),previous=rows[index-1];
 const end=last.at,kstDay=new Date(end+9*3600000).toISOString().slice(0,10),start=Date.parse(kstDay+'T00:00:00+09:00')-13*86400000;
 const visible=rows.filter(p=>p.at>=start&&p.at<=end);
 // Compact cards keep the original 170x68 sparkline geometry. Detail view stays at 350x136.
 // Both use the same honest 0-100 score scale; only SVG drawing coordinates differ.
 const x=(at:number)=>(compact?26:24)+(compact?132:296)*(at-start)/Math.max(1,end-start);
 const y=(v:number)=>compact?54-v*.44:112-v;
 const axisLeft=compact?26:24,axisRight=compact?158:320,axisLabelX=compact?20:328,axisDateY=compact?66:131;
 // Daily model values have a calendar date, not an observed intraday time.
 // Stop before the first actual publication's KST day, so that day's later
 // model total cannot be backdated to an earlier time on the same day.
 const first=visible[0],cutoff=Date.parse(new Date(first.at+9*3600000).toISOString().slice(0,10)+'T00:00:00+09:00');
 const daily=history.map(p=>({at:Date.parse((p.date??new Date(p.at).toISOString().slice(0,10))+'T00:00:00+09:00'),value:p.value}))
  .filter(p=>Number.isSafeInteger(p.at)&&p.at>=start&&p.at<cutoff).sort((a,b)=>a.at-b.at);
 const validDaily=(p:{value:number|null})=>typeof p.value==='number'&&Number.isFinite(p.value)&&p.value>=0&&p.value<=100;
 let drawing=false;
 const dailyPath=daily.map(p=>{if(!validDaily(p)){drawing=false;return '';}
  const command=drawing?'L':'M';drawing=true;return command+x(p.at).toFixed(2)+','+y(p.value as number).toFixed(2);}).join(' ');
 const tail=daily.at(-1),bridge=tail&&validDaily(tail)?`M${x(tail.at)},${y(tail.value as number)} L${x(first.at)},${y(first.value)}`:'';
 const path=visible.map((p,i)=>(i?'L':'M')+x(p.at).toFixed(2)+','+y(p.value).toFixed(2)).join(' ');
 const compactArea=compact&&daily.length>1&&daily.every(validDaily)
  ?'M'+x(daily[0].at)+','+y(0)+' '+dailyPath.replace(/^M/,'L')+' L'+x(daily.at(-1)!.at)+','+y(0)+' Z':'';
 const delta=previous?current.value-previous.value:null;
 return <div className={'zg-iran-published-chart'+(compact?' is-compact ob-summary-chart':'')} aria-label="최근 14일 일별 추정과 실제 게시 시각별 잠정 점수">
  <svg viewBox={compact?"0 0 170 68":"0 0 350 136"} preserveAspectRatio="xMidYMid meet" role="group" aria-labelledby={id}>
   <title id={id}>{`최근 14일 · 실제 게시 기록 ${visible.length}회 · 한국시간`}</title>
   {compact&&<defs><linearGradient id={id+"-compact-fill"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity=".25"/><stop offset="100%" stopColor="#ef4444" stopOpacity="0"/></linearGradient></defs>}
   {[0,50,100].map(v=><g key={v}><line x1={axisLeft} x2={axisRight} y1={y(v)} y2={y(v)} stroke="#52758a" strokeDasharray="2 4" opacity=".55"/><text x={axisLabelX} y={y(v)+3} textAnchor={compact?"end":undefined} fill="#a3bbcc" fontSize="9">{v}</text></g>)}
   {compactArea&&<path data-series="daily-estimate-area" d={compactArea} fill={"url(#"+id+"-compact-fill)"}/>}
   <g data-series="daily-estimate">
    <path d={dailyPath} fill="none" stroke={compact?"#ef4444":"#94a3b8"} strokeWidth="1.8" strokeDasharray="3 3"/>
    {daily.filter(validDaily).map(p=><circle key={p.at} data-kind="daily-estimate" cx={x(p.at)} cy={y(p.value as number)} r="1.7" fill={compact?"#ef4444":"#94a3b8"}><title>{`${date(p.at)} 일별 추정 · ${(p.value as number).toFixed(2)}점`}</title></circle>)}
   </g>
   {bridge&&<path data-series="estimate-to-publication" d={bridge} fill="none" stroke={compact?"#ef4444":"#94a3b8"} strokeWidth="1.5" strokeDasharray="3 3"/>}
   <path data-series="actual-publications" d={path} fill="none" stroke={compact?"#ef4444":"#29d3bc"} strokeWidth="1.8" strokeLinejoin="miter"/>
   {visible.map(p=><circle key={p.at} data-kind="publication" cx={x(p.at)} cy={y(p.value)} r={p.at===current.at?4:2.5} fill={compact?"#ef4444":"#29d3bc"} stroke="#e4fbff" strokeWidth={p.at===current.at?1.2:0} role={compact?undefined:'button'} tabIndex={compact?undefined:0} aria-label={date(p.at,true)+' KST · '+p.value.toFixed(2)+'점'} onClick={compact?undefined:()=>setSelected(p.at)} onKeyDown={compact?undefined:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p.at);}}}><title>{`${date(p.at,true)} KST · ${p.value.toFixed(2)}점`}</title></circle>)}
   {(compact?[0,13]:[0,4,8,13]).map(day=>{const at=start+day*86400000;return <text key={day} x={x(at)} y={axisDateY} textAnchor={day===0?'start':day===13?'end':'middle'} fill="#a3bbcc" fontSize="9">{date(at)}</text>;})}
  </svg>
  <div className="zg-iran-chart-legend"><span>┄ 일별 추정</span><span>━ 실제 갱신</span></div>
  {!compact&&<div className="zg-iran-update-reading" role="status"><time dateTime={new Date(current.at).toISOString()}>{date(current.at,true)} KST</time><strong>{current.value.toFixed(2)}점</strong><span>{delta===null?'첫 게시 기록':(delta>0?'+':'')+delta.toFixed(2)+'점'}</span><small>반영 사건 누계 {current.eventCount}건 · 잠정 점수</small></div>}
  <p className="zg-iran-update-note">{compact?'14일 흐름 · 갱신별 기록 · KST':daily.some(validDaily)?'점선은 기존 일별 추정입니다. 실선은 기록 시작 이후 실제 게시 시각별 점수이며, 점을 누르면 시각과 변화를 확인할 수 있습니다.':visible.length===1?'갱신 기록을 쌓기 시작했습니다. 이전 시간대 점수는 재구성하지 않습니다.':'실제 게시된 점수를 직선으로 연결했습니다. 점을 누르면 게시 시각과 변화를 확인할 수 있습니다.'}</p>
 </div>;
}
