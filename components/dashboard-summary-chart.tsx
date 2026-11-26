'use client';
import {memo,useId,useState} from 'react';
import {useDashboardMobileAxis} from '../hooks/use-dashboard-mobile-axis';
import ChartExtremumPoint from './chart-extremum-point';
import {chartExtrema} from '../lib/chart-extrema.mjs';
import {splitVerifiedCompositeChart} from '../lib/market-score/verified-composite-chart-r4.mjs';
import type {DashboardPoint} from '../app/dashboard-ui';
import {Area,AreaChart,ReferenceArea,ResponsiveContainer,XAxis,YAxis,ReferenceDot,ReferenceLine,Tooltip} from 'recharts';
const scoreColor=(score:number)=>score<25?'#ef4444':score<40?'#f59e0b':score<60?'#94a3b8':score<75?'#22c55e':'#10b981';
function timeScaledTrend(data:DashboardPoint[],periodDays:number,currentPublished?:{updatedAt:string;displayScore:number;modelVersion:string}|null){
 const points=splitVerifiedCompositeChart(data,currentPublished).flatMap(point=>{
  const ts=Date.parse(point.label);
  return Number.isFinite(ts)?[{...point,ts}]:[];
 });
 const end=points.length?Math.max(...points.map(point=>point.ts)):Date.now();
 const start=end-Math.max(1,periodDays)*86400000;
 return {points,start,end};
}

function summaryDateParts(ts:number){
 const date=new Date(ts);
 if(!Number.isFinite(date.getTime()))return null;
 return {year:date.getUTCFullYear(),month:date.getUTCMonth()+1,monthText:String(date.getUTCMonth()+1).padStart(2,'0'),dayText:String(date.getUTCDate()).padStart(2,'0')};
}
function sampleSummaryPoints<T>(points:T[],count:number){
 if(points.length<=count)return points;
 if(count<=1)return [points.at(-1)!];
 const selected:T[]=[];
 const seen=new Set<number>();
 for(let index=0;index<count;index++){
  const pointIndex=Math.round(index*(points.length-1)/(count-1));
  if(seen.has(pointIndex))continue;
  seen.add(pointIndex);selected.push(points[pointIndex]);
 }
 return selected;
}
function summaryAxisConfig(points:Array<DashboardPoint&{ts:number}>,periodDays:number){
 const labels=new Map<number,string>();
 const add=(point:DashboardPoint&{ts:number},label:string)=>labels.set(point.ts,label);
 if(!points.length)return {ticks:[] as number[],labels};
 if(periodDays<=1){
  const clock=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false});
  for(const point of sampleSummaryPoints(points,5))add(point,clock.format(new Date(point.ts)));
  return {ticks:[...labels.keys()],labels};
 }
 if(periodDays<=30){
  const count=periodDays<=7?4:5;
  for(const point of sampleSummaryPoints(points,count)){
   const parts=summaryDateParts(point.ts);if(parts)add(point,`${parts.monthText}.${parts.dayText}`);
  }
  return {ticks:[...labels.keys()],labels};
 }
 const monthGroups=new Map<string,{year:number;month:number;monthText:string;point:DashboardPoint&{ts:number}}>();
 for(const point of points){
  const parts=summaryDateParts(point.ts);if(!parts)continue;
  const key=`${parts.year}-${parts.monthText}`;
  if(!monthGroups.has(key))monthGroups.set(key,{year:parts.year,month:parts.month,monthText:parts.monthText,point});
 }
 const groups=[...monthGroups.values()];
 if(periodDays<=90){
  for(const group of groups)add(group.point,group.monthText);
  return {ticks:[...labels.keys()],labels};
 }
 if(periodDays<=180){
  for(const group of groups.slice(-6))add(group.point,group.monthText);
  return {ticks:[...labels.keys()],labels};
 }
 const selectedIndexes=new Set<number>([0,Math.max(0,groups.length-1)]);
 for(let index=2;index<groups.length-1;index+=2)selectedIndexes.add(index);
 const latestYear=groups.at(-1)?.year;
 groups.forEach((group,index)=>{if(group.month===12&&latestYear&&group.year<latestYear)selectedIndexes.add(index)});
 [...selectedIndexes].sort((a,b)=>a-b).forEach(index=>{
  const group=groups[index];if(!group)return;
  add(group.point,group.month===12&&latestYear&&group.year<latestYear?`${String(group.year).slice(-2)}.12`:group.monthText);
 });
 return {ticks:[...labels.keys()],labels};
}

const SummaryTrend=memo(function SummaryTrend({data,label,color,periodDays,currentPublished}:{data:DashboardPoint[];label:string;color:string;periodDays:number;currentPublished?:{updatedAt:string;displayScore:number;modelVersion:string}|null}){
 const mobileAxisRight=useDashboardMobileAxis();
 const [touchedLatestAt,setTouchedLatestAt]=useState<number|null>(null);
 const scaled=timeScaledTrend(data,periodDays,currentPublished),latest=scaled.points.at(-1),axis=summaryAxisConfig(scaled.points,periodDays);
 const singlePointLabel=scaled.points.length===1&&latest?`${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(latest.ts))} (계산 시각) · ${latest.value.toFixed(1)}점`:null;
 const gradientId=`summary-${useId().replace(/:/g,'')}`;
 const extrema=chartExtrema(scaled.points.map(p=>({date:new Date(p.ts).toISOString().slice(0,10),value:p.value})));
 return <div className="zg-spark zg-r55-mini-chart zg-r55-summary-mini-chart" style={{height:120,minHeight:120,maxHeight:120,position:"relative"}} aria-label={`${label} 관측 추이${singlePointLabel?` · 단일 실제 관측점 ${singlePointLabel}`:""}`} title={singlePointLabel??undefined} data-w06-touch-tooltip-ready="true"
  onClick={event=>{if(latest&&touchedLatestAt===latest.ts)event.stopPropagation();}}
  onTouchStart={event=>{
   // Recharts does not reliably open its hover tooltip for a real touch tap.
   // Show the latest observed point only for a tap near its existing chart marker.
   const touch=event.touches.item(0);
   const dot=event.currentTarget.querySelector('.recharts-reference-dot circle');
   if(!touch||!dot||!latest){setTouchedLatestAt(null);return;}
   const rect=dot.getBoundingClientRect();
   const distance=Math.hypot(touch.clientX-(rect.left+rect.width/2),touch.clientY-(rect.top+rect.height/2));
   if(distance<=24)event.stopPropagation();
   setTouchedLatestAt(distance<=24?latest.ts:null);
  }}>
  <ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}>
   <AreaChart data={scaled.points} accessibilityLayer={false} tabIndex={-1} margin={{top:12,right:mobileAxisRight?4:18,left:mobileAxisRight?6:0,bottom:4}}>
    <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".6"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    <XAxis dataKey="ts" type="number" domain={[scaled.start,scaled.end]} ticks={axis.ticks} interval={0} tickMargin={5} tickFormatter={value=>axis.labels.get(Number(value))??''} tick={{fill:'var(--zg-text-meta,#a8bcd0)',fontSize:9}} axisLine={false} tickLine={false} height={30}/>
    <YAxis orientation={mobileAxisRight?"right":"left"} domain={[0,100]} ticks={[0,50,100]} tick={{fill:'#a9bfd1',fontSize:9}} axisLine={false} tickLine={false} width={28}/>
    <ReferenceArea y1={0} y2={25} fill="#8f1f2f" fillOpacity={0.055}/>
    <ReferenceArea y1={25} y2={45} fill="#f2555a" fillOpacity={0.035}/>
    <ReferenceArea y1={45} y2={55} fill="#9aa8b6" fillOpacity={0.045}/>
    <ReferenceArea y1={55} y2={75} fill="#58c88a" fillOpacity={0.03}/>
    <ReferenceArea y1={75} y2={100} fill="#15865e" fillOpacity={0.04}/>
    <ReferenceLine y={25} stroke="rgba(255,98,107,.40)" strokeDasharray="3 5"/>
    <ReferenceLine y={45} stroke="rgba(240,163,74,.34)" strokeDasharray="3 5"/>
    <ReferenceLine y={55} stroke="rgba(168,188,208,.40)" strokeDasharray="3 5"/>
    <ReferenceLine y={75} stroke="rgba(35,201,143,.40)" strokeDasharray="3 5"/>
    <Tooltip
     isAnimationActive={false}
     cursor={{stroke:'var(--zg-chart-crosshair,#aab2bc)',strokeDasharray:'3 4'}}
     content={({active,payload,label:tooltipLabel})=>{
      if(!active||!payload?.length)return null;
      const point=payload[0]?.payload as DashboardPoint&{ts:number;verifiedModelVersion:string|null;legacyCalculatedValue:number|null};
      const parts=summaryDateParts(Number(tooltipLabel));
      const value=point?.value;
      return <div className="cnn-history-tooltip">
       <span>{point?.label?.includes('T')
        ?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(point.ts))+' (계산 시각)'
        :parts?`${parts.year}. ${parts.monthText}. ${parts.dayText}.`:point?.label??'—'}</span>
       <strong style={{color:typeof value==='number'&&Number.isFinite(value)?scoreColor(value):'#94a3b8'}}>{typeof value==='number'&&Number.isFinite(value)?value.toFixed(1):'—'}</strong>
       {(point.verifiedModelVersion||point.legacyCalculatedValue!==null)&&<span>{point.verifiedModelVersion?`현재 게시 계산점 · ${point.verifiedModelVersion}`:'실제 계산시각 점 · 당시 방법론 버전 미확인'}</span>}
      </div>;
     }}
    />
    <Area type="monotone" dataKey="reconstructedValue" stroke={color} fill="none" strokeWidth={1.8} dot={false} connectNulls={true} isAnimationActive={false}/>
    <Area type="monotone" dataKey="legacyCalculatedValue" stroke="none" fill="none" dot={{r:2.4,fill:color,strokeWidth:0}} connectNulls={false} isAnimationActive={false}/>
    <Area type="monotone" dataKey="verifiedCalculatedValue" stroke="none" fill="none" dot={{r:3,fill:color,strokeWidth:0}} connectNulls={false} isAnimationActive={false}/>
    {latest&&<ReferenceDot x={latest.ts} y={latest.value} r={4.4} fill={color} stroke="#fff7f7" strokeWidth={2}/>}
    {extrema.map(point=><ReferenceDot key={'extreme-'+point.kind} x={scaled.points[point.index].ts} y={point.value} ifOverflow="visible" shape={<ChartExtremumPoint point={point} peerIndex={extrema.find(p=>p.kind!==point.kind)?.index} samples={scaled.points.map(p=>({x:p.ts,value:p.value}))} count={scaled.points.length} color={color}/>}/>)}
   </AreaChart>
  </ResponsiveContainer>
  {latest&&touchedLatestAt===latest.ts&&<div data-testid="w06-touch-tooltip" role="status" aria-live="polite" className="cnn-history-tooltip" style={{position:'absolute',top:0,right:4,zIndex:5,pointerEvents:'none',maxWidth:'calc(100% - 8px)'}}>
   <span>{new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(latest.ts))} (계산 시각)</span>
   <strong style={{color:scoreColor(latest.value)}}>{latest.value.toFixed(1)}</strong>
   {(latest.verifiedModelVersion||latest.legacyCalculatedValue!==null)&&<span>{latest.verifiedModelVersion?`현재 게시 계산점 · ${latest.verifiedModelVersion}`:'실제 계산시각 점 · 당시 방법론 버전 미확인'}</span>}
  </div>}
  {singlePointLabel&&<span role="status" title={singlePointLabel} style={{position:"absolute",top:0,right:6,maxWidth:"90%",fontSize:10,color:"var(--zg-text-meta,#a8bcd0)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>실제 관측점 1개 · {singlePointLabel}</span>}
 </div>;
});

export default SummaryTrend;
