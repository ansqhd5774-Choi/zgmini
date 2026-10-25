'use client';
import {type CSSProperties,useEffect,useMemo,useState} from 'react';
import {CartesianGrid,Line,LineChart,ReferenceArea,ReferenceDot,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis,usePlotArea,useXAxisScale,useYAxisScale} from 'recharts';
import {SECTORS,type SectorId,type SectorSentimentPoint,type SectorSnapshotMeta} from '../../components/sector-sentiment-chart';
import {extremaLeader,placeExtremaLabels} from '../../lib/chart-extrema.mjs';

const COLORS:Record<SectorId,string>={staples:'#a3e635',healthcare:'#2dd4bf',technology:'#38bdf8',materials:'#ff8729',utilities:'#b777ed',industrials:'#ffd438',communication:'#f15aa7',financials:'#ff6464',energy:'#9fb1c5',realEstate:'#16d8d7',discretionary:'#e76aba'};
const NAMES:Partial<Record<SectorId,string>>={technology:'기술',communication:'통신서비스',discretionary:'경기소비재'};
const PERIODS=[['1W',7],['1M',30],['3M',90],['6M',180],['1Y',365]] as const;
const nameOf=(id:SectorId)=>NAMES[id]??SECTORS.find(s=>s.id===id)?.name??id;
const rankedSectors=(rows:SectorSentimentPoint[])=>[...SECTORS].sort((a,b)=>(rows.at(-1)?.[b.id]??-1)-(rows.at(-1)?.[a.id]??-1));
function comparisonDate(date:string,months:number,days:number){
 const target=new Date(date+'T00:00:00Z');
 if(months){const day=target.getUTCDate();target.setUTCDate(1);target.setUTCMonth(target.getUTCMonth()-months);const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(day,last));}
 target.setUTCDate(target.getUTCDate()-days);return target.toISOString().slice(0,10);
}
function changeFor(rows:SectorSentimentPoint[],id:SectorId,months:number,days:number){
 const last=rows.at(-1);if(!last)return null;
 const before=rows.findLast(row=>row.date<=comparisonDate(last.date,months,days))?.[id],now=last[id];
 return typeof now==='number'&&typeof before==='number'?Math.round((now-before)*10)/10:null;
}
function periodRows(rows:SectorSentimentPoint[],days:number){
 if(!rows.length)return rows;if(!days)return rows.slice(-2);
 const end=Date.parse(rows[rows.length-1].date+'T00:00:00Z');
 return rows.filter(row=>Date.parse(row.date+'T00:00:00Z')>=end-days*86400000);
}
const deltaText=(v:number|null)=>v===null?'—':(v>0?'+':'')+v.toFixed(1)+'p';
const scoreColor=(v:number|null)=>v===null?'#8299ac':v>=75?'var(--zg-score-extreme-greed)':v>=55?'var(--zg-score-greed)':v>=45?'var(--zg-score-neutral)':v>=25?'var(--zg-score-fear)':'var(--zg-score-extreme-fear)';
const deltaState=(v:number|null)=>v===null?'is-missing':v>0?'is-up':v<0?'is-down':'is-flat';
function PeriodButtons({value,onChange,items,label}:{value:number;onChange:(value:number)=>void;items:readonly (readonly [string,number])[];label:string}){
 return <div className="zg-sfg-periods" role="group" aria-label={label}>{items.map(([name,days])=><button key={name} type="button" aria-pressed={value===days} onClick={()=>onChange(days)}>{name}</button>)}</div>;
}
function ScoreBar({score}:{score:number|null}){
 return <div className="zg-sfg-meter" aria-label={score===null?'점수 없음':'심리 점수 '+score.toFixed(1)+'점'}><span/><span/><span/><span/><span/>{score!==null&&<i className="zg-sfg-meter-marker" style={{left:Math.min(100,Math.max(0,score))+'%'}}/>}</div>;
}
function Sparkline({rows,id,provisionalDate}:{rows:SectorSentimentPoint[];id:SectorId;provisionalDate?:string}){
 const provisional=Boolean(provisionalDate&&rows.length>1&&rows.at(-1)?.date===provisionalDate);
 const points=useMemo(()=>rows.map((row,i)=>({date:row.date,value:row[id],solid:provisional&&i===rows.length-1?null:row[id],dash:provisional&&i>=rows.length-2?row[id]:null})),[rows,id,provisional]);
 return <div className="zg-sfg-sparkline" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><LineChart accessibilityLayer={false} data={points} margin={{top:3,right:2,bottom:3,left:2}}>
  <XAxis dataKey="date" hide height={0}/><YAxis hide domain={[0,100]}/>
  <Tooltip cursor={false} isAnimationActive={false} allowEscapeViewBox={{x:true,y:true}} wrapperStyle={{pointerEvents:'none',zIndex:30}} content={({active,payload})=>{
   const point=payload?.[0]?.payload as {date?:string;value?:number|null}|undefined;
   return active&&point&&typeof point.value==='number'?<div className="zg-sfg-tooltip zg-sfg-spark-tooltip"><strong>{point.date}</strong><div><span style={{color:COLORS[id]}}>{nameOf(id)}</span><b>{point.value.toFixed(1)}점</b></div></div>:null;
  }}/>
  <Line dataKey={provisional?'solid':'value'} stroke={COLORS[id]} strokeWidth={1.7} dot={false} activeDot={{r:2.5}} connectNulls={false} isAnimationActive={false}/>{provisional&&<Line dataKey="dash" stroke={COLORS[id]} strokeDasharray="4 4" strokeWidth={1.7} dot={false} activeDot={{r:2.5}} connectNulls={false} isAnimationActive={false}/>}</LineChart></ResponsiveContainer></div>;
}
function Zones(){return <><ReferenceArea y1={0} y2={25} fill="#8d3048" fillOpacity={0.22}/><ReferenceArea y1={25} y2={45} fill="#9f6032" fillOpacity={0.18}/><ReferenceArea y1={45} y2={55} fill="#718092" fillOpacity={0.10}/><ReferenceArea y1={55} y2={75} fill="#348856" fillOpacity={0.17}/><ReferenceArea y1={75} y2={100} fill="#078b83" fillOpacity={0.18}/></>;}
type SoloPoint={date:string;score:number};
function SoloChartMarkers({rows,low,high,current}:{rows:SoloPoint[];low:SoloPoint;high:SoloPoint;current:SoloPoint}){
 const plot=usePlotArea(),xScale=useXAxisScale(),yScale=useYAxisScale();
 if(!plot||!xScale||!yScale)return null;
 const candidates:[string,SoloPoint,string,string][]=[
  ['min',low,'#ff7187','최저'],
  ['max',high,'#47e3bb','최고'],
  ['now',current,scoreColor(current.score),'현재'],
 ];
 // The current score can equal an extreme: one guide and one label per actual point.
 const unique=candidates.filter(([,point],index)=>!candidates.slice(0,index).some(([,other])=>other.date===point.date&&other.score===point.score));
 const markers=unique.flatMap(([kind,point,color,title])=>{
  const x=xScale(point.date),y=yScale(point.score);
  return typeof x==='number'&&typeof y==='number'?[{kind,...point,color,title,x,y}]:[];
 });
 const samples=rows.map(point=>{
  const x=xScale(point.date),y=yScale(point.score);
  return typeof x==='number'&&typeof y==='number'?{x,y}:null;
 });
 const labels=placeExtremaLabels(samples,markers.map(({kind,x,y})=>({kind,x,y})),plot);
 return <g className="zg-sfg-solo-marker" pointerEvents="none">{markers.map(marker=>{
  const label=labels.find(item=>item.kind===marker.kind);
  const position={x:label?.x??marker.x,y:label?.y??marker.y};
  const leader=extremaLeader(marker,position);
  const isCurrent=marker.date===current.date&&marker.score===current.score;
  return <g key={marker.kind} aria-label={`${marker.title}${isCurrent&&marker.kind!=='now'?'·현재':''} ${marker.score.toFixed(1)}점 (${marker.date.slice(5)})`} data-label-clear={label?.hits===0}>
   <path data-leader-side={leader.side} d={leader.path} fill="none" stroke={marker.color} strokeWidth={.9} opacity={.85}/>
   <circle cx={marker.x} cy={marker.y} r={3} fill={marker.color} stroke="#061d2c" strokeWidth={1}/>
   <text x={position.x} y={position.y} textAnchor="middle" fill={marker.color} fontSize={10} fontWeight={750} stroke="#071a29" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round">
    <tspan x={position.x}>{marker.score.toFixed(1)}</tspan><tspan x={position.x} dy={11} fontWeight={500}>({marker.date.slice(5)})</tspan>
   </text>
  </g>;
 })}</g>;
}
export default function SectorDetailCharts(){
 const [rows,setRows]=useState<SectorSentimentPoint[]|null>(null);
 const [snapshot,setSnapshot]=useState<SectorSnapshotMeta>();
 const [failed,setFailed]=useState(false);
 const [compareDays,setCompareDays]=useState(365);
 const [comparisonPinned,setComparisonPinned]=useState(false);
 const [visible,setVisible]=useState<Set<SectorId>>(()=>new Set());
 useEffect(()=>{const controller=new AbortController();fetch('/api/sector-fear-greed',{cache:'no-store',signal:controller.signal}).then(async response=>{
  if(!response.ok)throw new Error('Unavailable');
  const body=await response.json() as SectorSnapshotMeta&{status?:string;history?:SectorSentimentPoint[]};
  if(body.status!=='READY'||!Array.isArray(body.history)||!body.history.length)throw new Error('Unavailable');
  const history=body.history.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&Number.isFinite(Date.parse(row.date))).map(row=>({date:row.date,...Object.fromEntries(SECTORS.map(({id})=>{const value=row[id];return [id,typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:null]}))})).sort((a,b)=>a.date.localeCompare(b.date));
  if(!history.length)throw new Error('Unavailable');setVisible(new Set(rankedSectors(history).slice(0,3).map(sector=>sector.id)));setRows(history);setSnapshot(body);
 }).catch(()=>{if(!controller.signal.aborted)setFailed(true)});return()=>controller.abort();},[]);
 const sorted=useMemo(()=>rows?rankedSectors(rows):[],[rows]);
 if(!rows)return <p className="zg-sfg-state" role="status">{failed?'저장 데이터를 불러오지 못했습니다. 잠시 후 다시 방문해 주세요.':'저장 데이터를 불러오는 중입니다.'}</p>;
 const latest=rows[rows.length-1];
 const provisionalDate=snapshot?.phase==='PROVISIONAL'?snapshot.provisional?.date:undefined;
 const provisional=Boolean(provisionalDate&&latest.date===provisionalDate&&rows.length>1);
 const compareRows=periodRows(rows,compareDays).map((row,index,array)=>({...row,...Object.fromEntries(SECTORS.flatMap(({id})=>[[id+'__solid',provisional&&index===array.length-1?null:row[id]],[id+'__dash',provisional&&index>=array.length-2?row[id]:null]]))}));
 const soloId=visible.size===1?Array.from(visible)[0]:null;
 const soloPoints=soloId?periodRows(rows,compareDays).flatMap(row=>{
  const value=row[soloId];return typeof value==='number'?[{date:row.date,score:value}]:[];
 }):[];
 const soloLow=soloPoints.reduce<(typeof soloPoints)[number]|null>((best,point)=>!best||point.score<best.score?point:best,null);
 const soloHigh=soloPoints.reduce<(typeof soloPoints)[number]|null>((best,point)=>!best||point.score>best.score?point:best,null);
 const soloCurrent=soloPoints.at(-1);
 const toggle=(id:SectorId)=>setVisible(previous=>{const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next;});
 return <div className="zg-sfg-content">
  <p className="zg-sfg-as-of">기준일&nbsp; {latest.date.replaceAll('-','.')}</p>
  <section className="zg-sfg-ranking" aria-label="11개 섹터 투자심리 순위">
   <h2 className="zg-sfg-mobile-ranking-title">섹터 심리 순위</h2>
   <div className="zg-sfg-mobile-rank-head" aria-hidden="true"><span>섹터</span><span>점수</span><span>1M</span></div>
   <div className="zg-sfg-rank-head" aria-hidden="true"><span>순위</span><span>섹터</span><span>현재 점수</span><div className="zg-sfg-scale"><span>극단적 공포</span><span>공포</span><span>중립</span><span>탐욕</span><span>극단적 탐욕</span></div><span>1년 추이</span><span>1개월 변동</span></div>
   <div className="zg-sfg-rank-list">{sorted.map((sector,index)=>{
    const raw=latest[sector.id],current=typeof raw==='number'?raw:null,delta=changeFor(rows,sector.id,1,0);
    return <button type="button" className="zg-sfg-rank-row" key={sector.id} aria-pressed={visible.has(sector.id)} aria-label={(index+1)+'위 '+nameOf(sector.id)+', '+(current===null?'점수 없음':current.toFixed(1)+'점')+', 1개월 변화 '+deltaText(delta)+'. 비교 차트 '+(visible.has(sector.id)?'ON':'OFF')+', 클릭하면 비교 차트 표시 전환'} onClick={()=>toggle(sector.id)}>
     <span className="zg-sfg-rank-number">{index+1}</span><span className="zg-sfg-rank-name"><i style={{background:COLORS[sector.id]}}/>{nameOf(sector.id)}</span><strong className="zg-sfg-rank-score" style={{color:scoreColor(current)}}>{current===null?'—':current.toFixed(1)}</strong>
     <ScoreBar score={current}/><Sparkline rows={rows} id={sector.id} provisionalDate={provisionalDate}/>
     <span className={'zg-sfg-rank-delta '+deltaState(delta)}>{deltaText(delta)}{delta!==null&&delta!==0&&<i aria-hidden="true">{delta>0?'▲':'▼'}</i>}</span>
    </button>;
   })}</div>
  </section>
  <div className="zg-sfg-lower">
   <section className="zg-sfg-comparison" aria-label="섹터별 심리 지수 비교">
    <div className="zg-sfg-panel-head"><div><h2>섹터별 1년 심리 지수 비교</h2><p>선택한 섹터의 공포·탐욕 지수를 비교합니다.</p></div><PeriodButtons value={compareDays} onChange={days=>{setCompareDays(days);setComparisonPinned(false);}} items={PERIODS} label="섹터 비교 기간"/></div>
    <div className="zg-sfg-legend" role="group" aria-label="비교할 섹터 선택">{SECTORS.map(sector=>{const value=latest[sector.id],current=typeof value==='number'?value:null;return <button type="button" key={sector.id} aria-pressed={visible.has(sector.id)} onClick={()=>toggle(sector.id)} style={{'--zg-mobile-order':sorted.findIndex(item=>item.id===sector.id)} as CSSProperties}><i style={{background:COLORS[sector.id]}}/><span className="zg-sfg-legend-name">{nameOf(sector.id)}</span><strong className="zg-sfg-legend-score" style={{color:scoreColor(current)}}>{current===null?'—':current.toFixed(1)}</strong></button>;})}</div>
    <div className="zg-sfg-comparison-plot"><ResponsiveContainer width="100%" height="100%"><LineChart data={compareRows} margin={{top:8,right:10,bottom:0,left:0}} onMouseDown={()=>setComparisonPinned(true)} onMouseUp={()=>setComparisonPinned(false)} onMouseLeave={()=>setComparisonPinned(false)}>
     <Zones/><CartesianGrid stroke="#23485b" strokeDasharray="2 4" vertical={true}/>
     <XAxis dataKey="date" stroke="#a9bccd" fontSize={11} axisLine={false} tickLine={false} tickFormatter={date=>String(date).slice(5)} minTickGap={42}/><YAxis domain={[0,100]} ticks={[0,25,50,75,100]} interval={0} stroke="#a9bccd" axisLine={false} tickLine={false} fontSize={11} width={34}/><ReferenceLine y={50} stroke="#92a3b0" strokeDasharray="3 4"/>
     <Tooltip active={comparisonPinned||undefined} isAnimationActive={false} wrapperStyle={{pointerEvents:'none'}} content={({active:show,payload,label})=>!show||!payload?.length?null:<div className="zg-sfg-tooltip"><strong>{String(label)}</strong>{payload.filter(item=>typeof item.value==='number').map(item=><div key={String(item.dataKey)}><span style={{color:item.color}}>{item.name}</span><b>{Number(item.value).toFixed(1)}점</b></div>)}</div>}/>
     {SECTORS.map(sector=>provisional?[
      <Line key={sector.id} dataKey={sector.id+'__solid'} name={nameOf(sector.id)} stroke={COLORS[sector.id]} hide={!visible.has(sector.id)} strokeWidth={1.9} dot={false} activeDot={{r:3}} connectNulls={false} isAnimationActive={false}/>,
      <Line key={sector.id+'-dash'} dataKey={sector.id+'__dash'} name={nameOf(sector.id)} stroke={COLORS[sector.id]} hide={!visible.has(sector.id)} strokeWidth={1.9} strokeDasharray="4 4" dot={false} activeDot={{r:3}} connectNulls={false} isAnimationActive={false}/>,
     ]:<Line key={sector.id} dataKey={sector.id} name={nameOf(sector.id)} stroke={COLORS[sector.id]} hide={!visible.has(sector.id)} strokeWidth={1.9} dot={false} activeDot={{r:3}} connectNulls={false} isAnimationActive={false}/>)}
     {soloLow&&soloHigh&&soloCurrent&&<ReferenceDot x={soloCurrent.date} y={soloCurrent.score} ifOverflow="visible" shape={<SoloChartMarkers rows={soloPoints} low={soloLow} high={soloHigh} current={soloCurrent}/>}/>}
    </LineChart></ResponsiveContainer></div>
   </section>
  </div>
  <p className="zg-sfg-footnote">변화량은 해당 기간 전 날짜 또는 직전 저장일 대비 점수 차이입니다. 비교 이력이 없으면 —로 표시합니다.</p>
 </div>;
}
