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
 // Compact cards use the same 170x68 plot geometry, separate fixed axis labels,
 // shaded area and endpoint as the neighboring rate-sentiment summary card.
 // Detail view uses the same 5-zone/left-axis geometry as the rate chart while keeping publication interactions.
 const x=(at:number)=>(compact?26:30)+(compact?132:306)*(at-start)/Math.max(1,end-start);
 const y=(v:number)=>compact?54-v*.44:148-v*1.4;
 const axisLeft=compact?26:30,axisRight=compact?158:336,axisLabelX=compact?20:22,axisDateY=compact?66:169;
 // Daily model values have a calendar date, not an observed intraday time.
 // Stop before the first actual publication's KST day, so that day's later
 // model total cannot be backdated to an earlier time on the same day.
 const first=visible[0],cutoff=Date.parse(new Date(first.at+9*3600000).toISOString().slice(0,10)+'T00:00:00+09:00');
 const daily=history.map(p=>({at:Date.parse((p.date??new Date(p.at).toISOString().slice(0,10))+'T00:00:00+09:00'),value:p.value}))
  .filter(p=>Number.isSafeInteger(p.at)&&p.at>=start&&p.at<cutoff).sort((a,b)=>a.at-b.at);
 const validDaily=(p:{value:number|null})=>typeof p.value==='number'&&Number.isFinite(p.value)&&p.value>=0&&p.value<=100;
 let drawing=false,previousDaily:{at:number;value:number}|null=null;
 const dailyPath=daily.map(p=>{
  if(!validDaily(p)){drawing=false;previousDaily=null;return '';}
  const now={at:p.at,value:p.value as number},px=x(now.at),py=y(now.value);
  if(!drawing){drawing=true;previousDaily=now;return 'M'+px.toFixed(2)+','+py.toFixed(2);}
  const before=previousDaily!,mid=(x(before.at)+px)/2;
  previousDaily=now;
  // Two horizontal cubic handles produce the same restrained curve style as
  // the neighboring rate chart without overshooting any historical score.
  return compact?'L'+px.toFixed(2)+','+py.toFixed(2):
   'C'+mid.toFixed(2)+','+y(before.value).toFixed(2)+' '+mid.toFixed(2)+','+py.toFixed(2)+' '+px.toFixed(2)+','+py.toFixed(2);
 }).join(' ');
 const tail=daily.at(-1),bridge=tail&&validDaily(tail)?`M${x(tail.at)},${y(tail.value as number)} L${x(first.at)},${y(first.value)}`:'';
 const path=visible.map((p,i)=>(i?'L':'M')+x(p.at).toFixed(2)+','+y(p.value).toFixed(2)).join(' ');
 const compactLine=[...daily.filter(validDaily).map(p=>({at:p.at,value:p.value as number})),...visible];
 const compactArea=compact&&compactLine.length>1&&daily.every(validDaily)
  ?'M'+x(compactLine[0].at)+','+y(0)+' L'+compactLine.map(p=>x(p.at)+','+y(p.value)).join(' L')+' L'+x(compactLine.at(-1)!.at)+','+y(0)+' Z':'';
 // The historical fill stops with the dated estimates; bridging to a later publication
 // is explicitly a dashed guide, never an invented intraday observation.
 const detailArea=!compact&&daily.length>1&&daily.every(validDaily)
  ?'M'+x(daily[0].at)+','+y(0)+' L'+daily.map(p=>x(p.at)+','+y(p.value as number)).join(' L')+' L'+x(daily.at(-1)!.at)+','+y(0)+' Z':'';
 const delta=previous?current.value-previous.value:null;
 return <div className={'zg-iran-published-chart'+(compact?' is-compact ob-summary-chart ob-summary-chart-frame':'')} aria-label="최근 14일 일별 추정과 실제 게시 시각별 잠정 점수">
  {compact&&<div className="zg-chart-fixed-axis" aria-hidden="true">
   {[0,50,100].map(v=><span key={v} style={{left:'11.8%',top:`${79.4-(79.4-14.7)*v/100}%`}}>{v}</span>)}
   <b style={{left:'15.3%'}}>0</b><b style={{right:'7.1%'}}>14</b>
  </div>}
  <svg viewBox={compact?"0 0 170 68":"0 0 350 180"} preserveAspectRatio={compact?"none":"xMidYMid meet"} role="group" aria-labelledby={id}>
   <title id={id}>{`최근 14일 · 실제 게시 기록 ${visible.length}회 · 한국시간`}</title>
   <defs>{compact?<linearGradient id={id+"-compact-fill"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity=".25"/><stop offset="100%" stopColor="#ef4444" stopOpacity="0"/></linearGradient>:<linearGradient id={id+"-detail-fill"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb7185" stopOpacity=".6"/><stop offset="100%" stopColor="#fb7185" stopOpacity="0"/></linearGradient>}</defs>
   {!compact&&[
// Same five score zones as the rate sentiment reference, with the exact 0–100 scale.
    {low:0,high:25,color:"#ef4444",opacity:.055,level:"very-negative"},
    {low:25,high:40,color:"#f59e0b",opacity:.04,level:"negative"},
    {low:40,high:60,color:"#94a3b8",opacity:.04,level:"neutral"},
    {low:60,high:75,color:"#22c55e",opacity:.04,level:"positive"},
    {low:75,high:100,color:"#10b981",opacity:.045,level:"very-positive"},
   ].map(b=><rect key={b.level} data-series="score-zone" data-score-zone={b.level} x={axisLeft} y={y(b.high)} width={axisRight-axisLeft} height={y(b.low)-y(b.high)} fill={b.color} fillOpacity={b.opacity}/>)} 
   {(compact?[0,50,100]:[0,25,40,60,75,100]).map(v=><g key={v}><line x1={axisLeft} x2={axisRight} y1={y(v)} y2={y(v)} stroke={compact?"currentColor":v===25?"#ef4444":v===40?"#f59e0b":v===75?"#22c55e":"#52758a"} strokeDasharray={compact?"2 4":"3 5"} opacity={compact?undefined:'.48'}/></g>)}
   {!compact&&[0,25,50,75,100].map(v=><text key={v} data-series="left-axis-label" x={axisLabelX} y={y(v)+3} textAnchor="end" fill="#a3bbcc" fontSize="9">{v}</text>)}
   {compactArea&&<path data-series="daily-estimate-area" d={compactArea} fill={"url(#"+id+"-compact-fill)"}/>}
   {detailArea&&<path data-series="detail-score-area" d={detailArea} fill={"url(#"+id+"-detail-fill)"}/>}
   <g data-series="daily-estimate">
    <path d={dailyPath} fill="none" stroke={compact?"#ef4444":"#fb7185"} strokeWidth={compact?2:2.4} strokeDasharray={compact?undefined:"4 3"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
    {daily.filter(validDaily).map(p=><circle key={p.at} data-kind="daily-estimate" cx={x(p.at)} cy={y(p.value as number)} r={compact?1.7:2.3} opacity={compact?0:1} fill={compact?"#ef4444":"#fb7185"} stroke={compact?undefined:"#0b2536"} strokeWidth={compact?undefined:0.75}><title>{`${date(p.at)} 일별 추정 · ${(p.value as number).toFixed(2)}점`}</title></circle>)}
   </g>
   {bridge&&<path data-series="estimate-to-publication" d={bridge} fill="none" stroke={compact?"#ef4444":"#fb7185"} strokeWidth={compact?2:2} strokeDasharray={compact?undefined:"4 3"} vectorEffect={compact?"non-scaling-stroke":undefined}/>}
   <path data-series="actual-publications" d={path} fill="none" stroke={compact?"#ef4444":"#fb7185"} strokeWidth={compact?2:2.8} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
   {!compact&&<circle data-series="selected-publication-halo" cx={x(current.at)} cy={y(current.value)} r="8" fill="#fb7185" opacity=".2" pointerEvents="none"/>}
   {visible.map(p=><circle key={p.at} data-kind="publication" cx={x(p.at)} cy={y(p.value)} r={p.at===current.at?(compact?4:5.4):(compact?2.5:3.6)} opacity={compact?0:1} fill={compact?"#ef4444":"#fb7185"} stroke="#fff1f2" strokeWidth={p.at===current.at?1.5:0} role={compact?undefined:'button'} tabIndex={compact?undefined:0} aria-label={date(p.at,true)+' KST · '+p.value.toFixed(2)+'점'} onClick={compact?undefined:()=>setSelected(p.at)} onKeyDown={compact?undefined:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p.at);}}}><title>{`${date(p.at,true)} KST · ${p.value.toFixed(2)}점`}</title></circle>)}
   {!compact&&[0,2,4,6,8,10,13].map(day=>{const at=start+day*86400000;return <text key={day} data-mobile-skip={[2,6,10].includes(day)?"true":undefined} x={x(at)} y={axisDateY} textAnchor={day===0?'start':day===13?'end':'middle'} fill="#a3bbcc" fontSize="9">{date(at)}</text>;})}
  </svg>
  {compact&&<span aria-hidden="true" className="ob-chart-endpoint" style={{left:`${x(last.at)/170*100}%`,top:`${y(last.value)/68*100}%`,background:'#ef4444'}}/>}
  {!compact&&<div className="zg-iran-chart-legend"><span>일별 추정</span><span>실제 갱신</span></div>}
  {!compact&&<div className="zg-iran-update-reading" role="status"><time dateTime={new Date(current.at).toISOString()}>{date(current.at,true)} KST</time><strong>{current.value.toFixed(2)}점</strong><span>{delta===null?'첫 게시 기록':(delta>0?'+':'')+delta.toFixed(2)+'점'}</span><small>반영 사건 누계 {current.eventCount}건 · 잠정 점수</small></div>}
  {!compact&&<p className="zg-iran-update-note">{daily.some(validDaily)?'점선은 기존 일별 추정입니다. 실선은 기록 시작 이후 실제 게시 시각별 점수이며, 점을 누르면 시각과 변화를 확인할 수 있습니다.':visible.length===1?'갱신 기록을 쌓기 시작했습니다. 이전 시간대 점수는 재구성하지 않습니다.':'실제 게시된 점수를 직선으로 연결했습니다. 점을 누르면 게시 시각과 변화를 확인할 수 있습니다.'}</p>}
 </div>;
}
