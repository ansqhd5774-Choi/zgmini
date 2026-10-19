"use client";
import {useEffect,useRef,useState} from 'react';
import {useStoredIndex} from './use-stored-index';
import {ChevronRight,Layers3,Sparkles} from 'lucide-react';
import {Line,LineChart,ResponsiveContainer,CartesianGrid,XAxis,YAxis,Tooltip,ReferenceLine,ReferenceDot} from 'recharts';
import {chartExtrema,clampedChartIndex} from '../lib/chart-extrema.mjs';
import ChartExtremumPoint from './chart-extremum-point';
import './sector-sentiment-chart.css';
import ChartAxisLabels from './chart-axis-labels';
import './chart-axis-labels.css';

export const SECTORS=[
 {id:'technology',name:'정보기술',color:'#38bdf8'},
 {id:'financials',name:'금융',color:'#34d399'},
 {id:'communication',name:'커뮤니케이션',color:'#a78bfa'},
 {id:'discretionary',name:'임의소비재',color:'#fb7185'},
 {id:'industrials',name:'산업재',color:'#fbbf24'},
 {id:'energy',name:'에너지',color:'#e879f9'},
 {id:'healthcare',name:'헬스케어',color:'#2dd4bf'},
 {id:'staples',name:'필수소비재',color:'#a3e635'},
 {id:'utilities',name:'유틸리티',color:'#c084fc'},
 {id:'materials',name:'소재',color:'#f97316'},
 {id:'realEstate',name:'부동산',color:'#94a3b8'},
] as const;
export type SectorId=typeof SECTORS[number]['id'];
const SHORT_NAMES:Record<SectorId,string>={technology:'기술',communication:'통신',discretionary:'재량',industrials:'산업',financials:'금융',utilities:'유틸',healthcare:'의료',materials:'소재',energy:'에너지',staples:'필수',realEstate:'부동산'};
// Connect dated formula outputs here. Missing values stay null; no synthetic scores.
export type SectorSentimentPoint={date:string}&Partial<Record<SectorId,number|null>>;
export type SentimentSeries={id:string;name:string;color:string;shortName?:string};
type ChartInputRow={date:string}&Record<string,string|number|null|undefined>;
export type SectorSnapshotMeta={confirmedObservationDate?:string;phase?:string;provisional?:{date:string;asOf:string;delayMinutes:number|null}};
type SectorFearGreedStoredPayload=SectorSnapshotMeta&{status?:string;history?:ChartInputRow[]};
export default function SectorSentimentChart({data=[],series=SECTORS,title='섹터별 공포·탐욕',draggable=false,linkToDetail=true,snapshot}:{data?:ChartInputRow[];series?:readonly SentimentSeries[];title?:string;draggable?:boolean;linkToDetail?:boolean;snapshot?:SectorSnapshotMeta}){
 const [hidden,setHidden]=useState<Set<string>>(()=>new Set(series===SECTORS?SECTORS.slice(6).map(sector=>sector.id):[]));
 const drag=useRef<{x:number;left:number;active:boolean;moved:boolean}>({x:0,left:0,active:false,moved:false});
 const legendRef=useRef<HTMLDivElement>(null);
 const [atEnd,setAtEnd]=useState(false);
 const [touchTooltip,setTouchTooltip]=useState<boolean|null>(null);
 const heldPointer=useRef<number|null>(null);
 const [heldIndex,setHeldIndex]=useState<number|null>(null);
 const releasePlot=()=>{heldPointer.current=null;setHeldIndex(null);setTouchTooltip(false)};
 useEffect(()=>{window.addEventListener('blur',releasePlot);return()=>window.removeEventListener('blur',releasePlot)},[]);
 const autoStored=data.length===0&&series===SECTORS&&title==='섹터별 공포·탐욕'&&!draggable;
 const {payload}=useStoredIndex<SectorFearGreedStoredPayload>('/api/sector-fear-greed',null,autoStored);
 const storedData=autoStored&&payload?.status==='READY'&&Array.isArray(payload.history)?payload.history:[];
 const meta=autoStored?payload:snapshot;
 const confirmedDate=meta?.confirmedObservationDate??storedData.at(-1)?.date;
 const provisional=meta?.phase==='PROVISIONAL'?meta.provisional:null;
 const nextKeyword=()=>{const list=legendRef.current;if(!list)return;const next=Array.from(list.children).find(child=>(child as HTMLElement).offsetLeft>list.scrollLeft+2) as HTMLElement|undefined;const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;list.scrollTo({left:next?next.offsetLeft:list.scrollWidth-list.clientWidth,behavior:reduce?'auto':'smooth'});};
 const [period,setPeriod]=useState(90);
 const sourceData:ChartInputRow[]=data.length?data:storedData;
 const rows:ChartInputRow[]=sourceData.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&Number.isFinite(Date.parse(row.date))).map(row=>({date:row.date,...Object.fromEntries(series.map(({id})=>{const value=row[id];return [id,typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:null]}))})).sort((a,b)=>a.date.localeCompare(b.date));
 const toggle=(id:string)=>setHidden(previous=>{const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next});
 const end=rows.length?Date.parse(rows[rows.length-1].date):0;
 const visibleRows=rows.filter(row=>Date.parse(row.date)>=end-period*86400000);
 const shownSeries=series.filter(s=>!hidden.has(s.id));
 const extrema=shownSeries.length===1?chartExtrema(visibleRows.map(row=>({date:row.date,value:row[shownSeries[0].id]}))):[];
 const heldRow=heldIndex===null?null:visibleRows[heldIndex];
 const moveHeld=(clientX:number,element:HTMLDivElement)=>{const rect=element.getBoundingClientRect();setHeldIndex(clampedChartIndex(clientX,rect.left+32,rect.width-44,visibleRows.length))};
 return <section className="zg-sector-chart" aria-label={`${series.length}개 ${title} 비교 차트`}>
  <div className="zg-sector-chart-heading"><h2>{draggable?<Sparkles size={18} aria-hidden="true"/>:<Layers3 size={18} aria-hidden="true"/>}{autoStored&&linkToDetail?<a href="/sector-fear-greed/">{title}</a>:title}</h2><div className="zg-sector-period" aria-label={`${title} 기간`}>{[[7,'1W'],[30,'1M'],[90,'3M'],[180,'6M'],[365,'1Y']].map(([days,label])=><button key={days} type="button" aria-pressed={period===days} onClick={()=>setPeriod(Number(days))}>{label}</button>)}</div></div>
  {(autoStored||snapshot)&&confirmedDate&&<p className="zg-sector-observation" role="status">{provisional?`${provisional.date} 장중 잠정 · 조회 미국 동부 ${new Date(provisional.asOf).toLocaleTimeString('ko-KR',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false})} · IEX · 확정 ${confirmedDate}`:`미국 거래일 ${confirmedDate} 마감 기준`}</p>}
  <div className="zg-sector-chart-plot" onPointerDownCapture={event=>{if(event.pointerType==='mouse'&&event.button===0){heldPointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);moveHeld(event.clientX,event.currentTarget);setTouchTooltip(false);event.preventDefault()}else if(event.pointerType!=='mouse')setTouchTooltip(true)}} onPointerUpCapture={releasePlot} onPointerCancelCapture={releasePlot} onLostPointerCapture={releasePlot} onPointerMoveCapture={event=>{if(heldPointer.current===event.pointerId){moveHeld(event.clientX,event.currentTarget)}else if(event.pointerType==='mouse')setTouchTooltip(null)}}>
   {heldRow&&<div className="zg-sector-held-tooltip zg-sector-tooltip" role="status"><p>{heldRow.date}</p><ul>{shownSeries.map(s=>typeof heldRow[s.id]==='number'?<li key={s.id} style={{color:s.color}}><span>{s.name}</span><strong>{Number(heldRow[s.id]).toFixed(1)}</strong></li>:null)}</ul></div>}
   {!rows.length&&<ChartAxisLabels ticks={[0,25,50,75,100]} top={2.15} bottom={97.85} left={4.67}/>}
   {!rows.length?<svg className="zg-chart-empty-svg" width="100%" height="100%" viewBox="0 0 600 280" preserveAspectRatio="none" role="img" aria-label={`${title} 차트, 0부터 100점 축`}><rect x="36" y="6" width="552" height="268" fill="#071a27"/>{[0,25,50,75,100].map(value=>{const y=274-value*2.68;return <g key={value}><line x1="36" x2="588" y1={y} y2={y} stroke={value===50?'#64748b':'#25465a'} strokeDasharray="3 5"/><text x="28" y={y+4} textAnchor="end" fontSize="11" fill="#9db0c2">{value}</text></g>})}</svg>:<ResponsiveContainer width="100%" height="100%">
    <LineChart data={visibleRows} margin={{top:6,right:12,bottom:0,left:0}}>
     <CartesianGrid vertical={false} stroke="#456174" strokeDasharray="2 4"/>
     <XAxis dataKey="date" stroke="#9db0c2" fontSize={11} tickFormatter={date=>String(date).slice(5)} minTickGap={36}/>
     <YAxis domain={[0,100]} ticks={[0,25,50,75,100]} stroke="#9db0c2" fontSize={11} width={32}/>
     <ReferenceLine y={50} stroke="#64748b" strokeDasharray="4 5"/>
     <Tooltip active={touchTooltip??undefined} position={{x:0,y:0}} allowEscapeViewBox={{x:true,y:true}} wrapperStyle={{transform:'translateY(calc(-100% - 8px))',zIndex:20}} isAnimationActive={false} cursor={{stroke:'#cbd5e1',strokeWidth:1,strokeDasharray:'3 3'}} content={({active,payload,label})=>!active||!payload?.length?null:<div className="zg-sector-tooltip" role="status"><p>{String(label)}</p><ul>{payload.filter(entry=>typeof entry.value==='number'&&Number.isFinite(entry.value)).map(entry=><li key={String(entry.dataKey)} style={{color:entry.color}}><span>{entry.name}</span><strong>{Number(entry.value).toFixed(1)}</strong></li>)}</ul></div>}/>
     {series.map(sector=><Line key={sector.id} dataKey={sector.id} name={sector.name} stroke={sector.color} hide={hidden.has(sector.id)} strokeWidth={2} dot={false} activeDot={{r:4}} connectNulls={false} isAnimationActive={false}/>)}
     {extrema.map(point=><ReferenceDot key={'extreme-'+point.kind} x={point.date} y={point.value} ifOverflow="visible" shape={<ChartExtremumPoint point={point} peerIndex={extrema.find(p=>p.kind!==point.kind)?.index} samples={visibleRows.map(p=>({x:p.date,value:typeof p[shownSeries[0].id]==='number'?Number(p[shownSeries[0].id]):null}))} count={visibleRows.length} color={shownSeries[0].color}/>}/>)}
     {heldRow&&<ReferenceLine x={heldRow.date} stroke="#cbd5e1" strokeDasharray="3 3"/>}
     {heldRow&&shownSeries.map(s=>typeof heldRow[s.id]==='number'?<ReferenceDot key={'held-'+s.id} x={heldRow.date} y={Number(heldRow[s.id])} r={4} fill={s.color} stroke="#fff" ifOverflow="visible"/>:null)}
    </LineChart>
   </ResponsiveContainer>}
  </div>
  <div className={`zg-legend-row${draggable?' has-next':''}`}><div ref={legendRef} className={`zg-sector-chart-legend${draggable?' is-draggable':''}`} aria-label={draggable?'표시할 테마 선택':'표시할 섹터 선택'} onScroll={event=>{const list=event.currentTarget;setAtEnd(list.scrollLeft+list.clientWidth>=list.scrollWidth-2)}} onPointerDown={event=>{if(!draggable||event.pointerType!=='mouse'||event.button!==0)return;drag.current={x:event.clientX,left:event.currentTarget.scrollLeft,active:true,moved:false}}} onPointerMove={event=>{if(!drag.current.active)return;const dx=event.clientX-drag.current.x;if(Math.abs(dx)>5){drag.current.moved=true;event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.scrollLeft=drag.current.left-dx;event.preventDefault()}}} onPointerUp={()=>{drag.current.active=false}} onPointerCancel={()=>{drag.current.active=false}} onLostPointerCapture={()=>{drag.current.active=false}} onClickCapture={event=>{if(drag.current.moved){event.preventDefault();event.stopPropagation();drag.current.moved=false}}}>{series.map(sector=><button key={sector.id} type="button" title={sector.name} aria-label={sector.name} aria-pressed={!hidden.has(sector.id)} onClick={()=>toggle(sector.id)} style={{borderBottomColor:sector.color}}>{sector.shortName??SHORT_NAMES[sector.id as SectorId]??sector.name}</button>)}</div>{draggable&&<button type="button" className="zg-theme-next" aria-label="다음 테마로 이동" onClick={nextKeyword} disabled={atEnd}><ChevronRight size={16} aria-hidden="true"/></button>}</div>
 </section>;
}
