'use client';
import {useEffect,useState} from 'react';
import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import SectorSentimentChart,{SECTORS,type SectorSentimentPoint,type SectorSnapshotMeta} from '../../components/sector-sentiment-chart';

const PERIODS=[['1일',0,1],['1주',0,7],['1개월',1,0],['3개월',3,0],['6개월',6,0],['1년',12,0]] as const;
function comparisonDate(date:string,months:number,days:number){
 const target=new Date(`${date}T00:00:00Z`);
 if(months){const day=target.getUTCDate();target.setUTCDate(1);target.setUTCMonth(target.getUTCMonth()-months);const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(day,last));}
 target.setUTCDate(target.getUTCDate()-days);
 return target.toISOString().slice(0,10);
}
export default function SectorDetailCharts(){
 const [rows,setRows]=useState<SectorSentimentPoint[]|null>(null);
 const [snapshot,setSnapshot]=useState<SectorSnapshotMeta>();
 const [failed,setFailed]=useState(false);
 useEffect(()=>{const controller=new AbortController();fetch('/api/sector-fear-greed',{cache:'no-store',signal:controller.signal}).then(async response=>{
  if(!response.ok)throw new Error('Unavailable');
  const body=await response.json() as SectorSnapshotMeta&{status?:string;history?:SectorSentimentPoint[]};
  if(body.status!=='READY'||!Array.isArray(body.history)||!body.history.length)throw new Error('Unavailable');
  const history=body.history.filter((row:SectorSentimentPoint)=>/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&Number.isFinite(Date.parse(row.date))).map((row:SectorSentimentPoint)=>({date:row.date,...Object.fromEntries(SECTORS.map(({id})=>{const value=row[id];return [id,typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:null]}))})).sort((a:SectorSentimentPoint,b:SectorSentimentPoint)=>a.date.localeCompare(b.date));
  if(!history.length)throw new Error('Unavailable');
  setRows(history);setSnapshot(body);
 }).catch(()=>{if(!controller.signal.aborted)setFailed(true)});return()=>controller.abort();},[]);
 if(!rows)return <p role="status">{failed?'저장 데이터를 불러오지 못했습니다. 잠시 후 다시 방문해 주세요.':'저장 데이터를 불러오는 중입니다.'}</p>;
 const latest=rows[rows.length-1];
 return <>
  <SectorSentimentChart data={rows} linkToDetail={false} snapshot={snapshot}/>
  <p className="zg-sector-change-note">기준일 {latest.date} · 변화량은 해당 기간 전 날짜 또는 직전 저장일 대비 점수 차이입니다. 비교 이력이 없으면 —로 표시합니다.</p>
  <div className="zg-sector-individual-grid">{SECTORS.map(sector=>{
   const score=latest[sector.id];
   return <section className="zg-sector-individual" key={sector.id} aria-label={`${sector.name} 개별 차트와 변화량`}>
    <div className="zg-sector-individual-heading"><h2><i style={{background:sector.color}}/>{sector.name}</h2><strong>{typeof score==='number'?score.toFixed(1):'—'}<small>점</small></strong></div>
    <div className="zg-sector-individual-plot"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{top:8,right:12,bottom:0,left:0}}>
     <CartesianGrid vertical={false} stroke="#456174" strokeDasharray="2 4"/>
     <XAxis dataKey="date" tickFormatter={date=>String(date).slice(5)} fontSize={13} stroke="#9db0c2" minTickGap={38}/>
     <YAxis domain={[0,100]} ticks={[0,25,50,75,100]} width={36} fontSize={13} stroke="#9db0c2"/>
     <Tooltip content={({active,payload,label})=>active&&typeof payload?.[0]?.value==='number'?<div className="zg-sector-tooltip"><p>{String(label)}</p><strong>{sector.name} {payload[0].value.toFixed(1)}점</strong></div>:null}/>
     <Line dataKey={sector.id} name={sector.name} stroke={sector.color} strokeWidth={2} dot={false} activeDot={{r:4}} connectNulls={false} isAnimationActive={false}/>
    </LineChart></ResponsiveContainer></div>
    <dl className="zg-sector-changes">{PERIODS.map(([label,months,days])=>{
     const target=comparisonDate(latest.date,months,days);
     const previous=rows.findLast(row=>row.date<=target);
     const before=previous?.[sector.id];
     const delta=typeof score==='number'&&typeof before==='number'?Math.round((score-before)*10)/10:null;
     return <div key={label} title={previous?`비교 기준일 ${previous.date}`:'비교 이력 없음'}><dt>{label}</dt><dd className={delta===null||delta===0?'':delta>0?'is-up':'is-down'}>{delta===null?'—':`${delta>0?'+':''}${delta.toFixed(1)}`}<small>{delta===null?'':'p'}</small></dd></div>;
    })}</dl>
   </section>;
  })}</div>
 </>;
}
