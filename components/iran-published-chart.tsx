"use client";
import {useId,useState} from 'react';
import './iran-published-chart.css';
type Point={at:number;value:number;collectionCheckedAt:number;sourceStoredAt:number;eventCount:number;lineage:string};
const date=(at:number,full=false)=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',...(full?{hour:'2-digit',minute:'2-digit',hour12:false}:{})}).format(at);
export default function IranPublishedChart({points,compact=false}:{points:Point[];compact?:boolean}){
 const id=useId(),[selected,setSelected]=useState<number|null>(null);
 const rows=points.filter(p=>Number.isSafeInteger(p.at)&&Number.isFinite(p.value)).sort((a,b)=>a.at-b.at);
 const last=rows.at(-1);if(!last)return null;
 const current=rows.find(p=>p.at===selected)??last,index=rows.indexOf(current),previous=rows[index-1];
 const end=last.at,kstDay=new Date(end+9*3600000).toISOString().slice(0,10),start=Date.parse(kstDay+'T00:00:00+09:00')-13*86400000;
 const visible=rows.filter(p=>p.at>=start&&p.at<=end),x=(at:number)=>24+296*(at-start)/Math.max(1,end-start),y=(v:number)=>112-v;
 const path=visible.map((p,i)=>(i?'L':'M')+x(p.at).toFixed(2)+','+y(p.value).toFixed(2)).join(' ');
 const delta=previous?current.value-previous.value:null;
 return <div className={'zg-iran-published-chart'+(compact?' is-compact':'')} aria-label="최근 14일 실제 게시 시각별 잠정 점수">
  <svg viewBox="0 0 350 136" role="group" aria-labelledby={id}>
   <title id={id}>최근 14일 · 실제 게시 기록 {visible.length}회 · 한국시간</title>
   {[0,50,100].map(v=><g key={v}><line x1="24" x2="320" y1={y(v)} y2={y(v)} stroke="#52758a" strokeDasharray="2 4" opacity=".55"/><text x="328" y={y(v)+3} fill="#a3bbcc" fontSize="9">{v}</text></g>)}
   <path d={path} fill="none" stroke="#29d3bc" strokeWidth="1.8" strokeLinejoin="miter"/>
   {visible.map(p=><circle key={p.at} cx={x(p.at)} cy={y(p.value)} r={p.at===current.at?4:2.5} fill="#29d3bc" stroke="#e4fbff" strokeWidth={p.at===current.at?1.2:0} role={compact?undefined:'button'} tabIndex={compact?undefined:0} aria-label={date(p.at,true)+' KST · '+p.value.toFixed(2)+'점'} onClick={compact?undefined:()=>setSelected(p.at)} onKeyDown={compact?undefined:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p.at);}}}><title>{date(p.at,true)} KST · {p.value.toFixed(2)}점</title></circle>)}
   {[0,4,8,13].map(day=>{const at=start+day*86400000;return <text key={day} x={x(at)} y="131" textAnchor={day===0?'start':day===13?'end':'middle'} fill="#a3bbcc" fontSize="9">{date(at)}</text>;})}
  </svg>
  {!compact&&<div className="zg-iran-update-reading" role="status"><time dateTime={new Date(current.at).toISOString()}>{date(current.at,true)} KST</time><strong>{current.value.toFixed(2)}점</strong><span>{delta===null?'첫 게시 기록':(delta>0?'+':'')+delta.toFixed(2)+'점'}</span><small>반영 사건 누계 {current.eventCount}건 · 잠정 점수</small></div>}
  <p className="zg-iran-update-note">{compact?'갱신별 기록 · KST':visible.length===1?'갱신 기록을 쌓기 시작했습니다. 이전 시간대 점수는 재구성하지 않습니다.':'실제 게시된 점수를 직선으로 연결했습니다. 점을 누르면 게시 시각과 변화를 확인할 수 있습니다.'}</p>
 </div>;
}
