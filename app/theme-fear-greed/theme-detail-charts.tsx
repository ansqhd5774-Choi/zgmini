'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {usePlotArea,useXAxisScale,useYAxisScale,ReferenceDot} from 'recharts';
import {extremaLeader,placeExtremaLabels} from '../../lib/chart-extrema.mjs';
import {themeTooltipRows} from '../../lib/theme-tooltip-rows.mjs';
import {mergeConfiguredThemeFeed} from '../../lib/theme-configured-merge.mjs';
import {Search} from 'lucide-react';
import {CartesianGrid,Line,LineChart,ReferenceArea,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {THEME_GROUPS} from '../../components/market-explorer-catalog';
import {useStoredIndex} from '../../components/use-stored-index';

type Point={date:string;score:number|null};
type ThemeScore={id?:string;configured?:boolean;theme:string;etfs:string[];score:number;history:Point[]};
type PublicThemeFeed={status:string;observationDate?:string;phase?:string;themes?:ThemeScore[];provisional?:{points:{date:string;scores:Record<string,number>}[]}};
type Theme={name:string;group:string;color:string;key:string;etfs:string[];points:Point[];provisionalFrom:number;score:number;date:string};
const CATALOG=THEME_GROUPS.flatMap(g=>g.items.map(name=>({name,group:g.name})));
const COLORS=['#a3e635','#2dd4bf','#38bdf8','#ff8729','#b777ed','#ffd438','#f15aa7','#ff6464','#9fb1c5','#16d8d7','#e76aba'];
const PERIODS=[['1W',7],['1M',30],['3M',90],['6M',180],['1Y',365]] as const;
const validScore=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
const validDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'));
const deltaText=(v:number|null)=>v===null?'—':(v>0?'+':'')+v.toFixed(1)+'p';
const deltaState=(v:number|null)=>v===null?'is-missing':v>0?'is-up':v<0?'is-down':'is-flat';
const scoreColor=(v:number|null)=>v===null?'#8299ac':v>=75?'var(--zg-score-extreme-greed)':v>=55?'var(--zg-score-greed)':v>=45?'var(--zg-score-neutral)':v>=25?'var(--zg-score-fear)':'var(--zg-score-extreme-fear)';
function acceptedThemes(feed:PublicThemeFeed|null):Theme[]{
 if(feed?.status!=='READY'||!Array.isArray(feed.themes))return [];
 const provisional=feed.phase==='PROVISIONAL'&&Array.isArray(feed.provisional?.points)?feed.provisional.points:[];
 return feed.themes.flatMap(item=>{
  const index=CATALOG.findIndex(t=>t.name===item?.theme);
  if((index<0&&!item.configured)||!validScore(item.score)||!Array.isArray(item.history)||!item.history.length||item.history.length>252)return [];
  const allowMissing=item.configured||item.theme==='우주·위성';
  if(!item.history.every((p,i)=>validDate(p?.date)&&
   (validScore(p?.score)||(allowMissing&&p?.score===null))&&
   (!i||p.date>item.history[i-1].date)))return [];
  if(!validScore(item.history.at(-1)!.score)||
   Math.abs(item.history.at(-1)!.score!-item.score)>0.000001)return [];
  const points=item.history.map(p=>({...p})),provisionalFrom=points.length;
  for(const extra of provisional){
   if(validDate(extra?.date)&&extra.date>points[points.length-1].date&&validScore(extra.scores?.[item.theme]))points.push({date:extra.date,score:extra.scores[item.theme]});
  }
  const currentScore=points.at(-1)?.score;
  if(!validScore(currentScore))return [];
  const colorIndex=index>=0?index:Array.from(item.id??item.theme).reduce((n,c)=>((n*31+c.charCodeAt(0))>>>0),0);
  return [{name:item.theme,group:index>=0?CATALOG[index].group:'기타',color:COLORS[colorIndex%COLORS.length],key:item.configured?'registered_'+item.id:'theme_'+index,etfs:Array.isArray(item.etfs)?item.etfs:[],points,provisionalFrom,score:currentScore,date:points.at(-1)!.date}];
 }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'ko'));
}
function comparisonDate(date:string,months:number,days:number){
 const target=new Date(date+'T00:00:00Z');
 if(months){const day=target.getUTCDate();target.setUTCDate(1);target.setUTCMonth(target.getUTCMonth()-months);const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(day,last));}
 target.setUTCDate(target.getUTCDate()-days);return target.toISOString().slice(0,10);
}
function changeFor(points:Point[],months:number,days:number){
 const latest=points.at(-1);if(!latest||!validScore(latest.score))return null;
 const before=points.findLast(p=>p.date<=comparisonDate(latest.date,months,days));
 return before&&validScore(before.score)?Math.round((latest.score-before.score)*10)/10:null;
}
function PeriodButtons({value,onChange,items,label}:{value:number;onChange:(n:number)=>void;items:readonly (readonly [string,number])[];label:string}){
 return <div className="zg-sfg-periods" role="group" aria-label={label}>{items.map(([name,days])=><button type="button" key={name} aria-pressed={value===days} onClick={()=>onChange(days)}>{name}</button>)}</div>;
}
function ScoreBar({score}:{score:number}){
 return <div className="zg-sfg-meter" aria-label={'심리 점수 '+score.toFixed(1)+'점'}><span/><span/><span/><span/><span/><i className="zg-sfg-meter-marker" style={{left:score+'%'}}/></div>;
}
function Sparkline({item,days}:{item:Theme;days:number}){
 const provisional=item.points.length>item.provisionalFrom;
 const end=Date.parse(item.points.at(-1)!.date+'T00:00:00Z');
 const selected=item.points.filter(p=>Date.parse(p.date+'T00:00:00Z')>=end-days*86400000);
 const firstProvisional=item.points[item.provisionalFrom]?.date,confirmed=item.points[item.provisionalFrom-1]?.date;
 const data=selected.map(p=>({...p,
  solid:provisional&&firstProvisional&&p.date>=firstProvisional?null:p.score,
  dash:provisional&&confirmed&&p.date>=confirmed?p.score:null,
 }));
 return <div className="zg-sfg-sparkline" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><LineChart accessibilityLayer={false} data={data} margin={{top:3,right:2,bottom:3,left:2}}>
  <XAxis dataKey="date" hide height={0}/><YAxis hide domain={[0,100]}/>
  <Tooltip cursor={false} isAnimationActive={false} allowEscapeViewBox={{x:true,y:true}} wrapperStyle={{pointerEvents:'none',zIndex:30}} content={({active,payload})=>{
   const point=payload?.[0]?.payload as Point|undefined;
   return active&&point&&validScore(point.score)?<div className="zg-sfg-tooltip zg-sfg-spark-tooltip"><strong>{point.date}</strong><div><span style={{color:item.color}}>{item.name}</span><b>{point.score.toFixed(1)}점</b></div></div>:null;
  }}/>
  <Line dataKey={provisional?'solid':'score'} stroke={item.color} strokeWidth={1.7} dot={false} activeDot={{r:2.5}} connectNulls={false} isAnimationActive={false}/>
  {provisional&&<Line dataKey="dash" stroke={item.color} strokeWidth={1.7} strokeDasharray="4 4" dot={false} activeDot={{r:2.5}} connectNulls={false} isAnimationActive={false}/>}
 </LineChart></ResponsiveContainer></div>;
}
function Zones(){return <><ReferenceArea y1={0} y2={25} fill="#8d3048" fillOpacity={0.22}/><ReferenceArea y1={25} y2={45} fill="#9f6032" fillOpacity={0.18}/><ReferenceArea y1={45} y2={55} fill="#718092" fillOpacity={0.10}/><ReferenceArea y1={55} y2={75} fill="#348856" fillOpacity={0.17}/><ReferenceArea y1={75} y2={100} fill="#078b83" fillOpacity={0.18}/></>}

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
export default function ThemeDetailCharts(){
 const {payload,error,loading}=useStoredIndex<PublicThemeFeed>('/api/theme-fear-greed');
 const {payload:configured,error:configuredError}=useStoredIndex<{status:string;themes:unknown[]}>('/api/theme-configured');
 const [group,setGroup]=useState('전체'),[query,setQuery]=useState('');
 const [searchOpen,setSearchOpen]=useState(false);
 const searchContainerRef=useRef<HTMLDivElement>(null),searchInputRef=useRef<HTMLInputElement>(null);
 const [visible,setVisible]=useState<Set<string>|null>(null);
 const [compareDays,setCompareDays]=useState(90),[comparisonPinned,setComparisonPinned]=useState(false);
 // Never display a cached score once the stored-only API has failed.
 const ready=useMemo(()=>acceptedThemes(mergeConfiguredThemeFeed(error?null:payload,configuredError?null:configured)),[error,payload,configuredError,configured]);
 const topOne=useMemo(()=>new Set(ready.slice(0,1).map(t=>t.name)),[ready]);
 const currentVisible=visible??topOne;
 const matches=(name:string,g:string)=>(group==='전체'||group===g)&&name.toLocaleLowerCase('ko').includes(query.trim().toLocaleLowerCase('ko'));
 const ranked=ready.filter(t=>matches(t.name,t.group));
 const applyThemeFilter=(nextGroup:string,nextQuery:string)=>{
  setGroup(nextGroup);setQuery(nextQuery);
  const normalized=nextQuery.trim().toLocaleLowerCase('ko');
  const filtered=ready.filter(t=>(nextGroup==='전체'||t.group===nextGroup)&&t.name.toLocaleLowerCase('ko').includes(normalized));
  setVisible(new Set(filtered.slice(0,1).map(t=>t.name)));
 };
 const closeSearch=()=>{setSearchOpen(false);if(query)applyThemeFilter(group,'');};
 useEffect(()=>{
  if(!searchOpen)return;
  searchInputRef.current?.focus();
  const onOutsidePointer=(event:PointerEvent)=>{if(!searchContainerRef.current?.contains(event.target as Node))closeSearch();};
  const onEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')closeSearch();};
  document.addEventListener('pointerdown',onOutsidePointer);
  document.addEventListener('keydown',onEscape);
  return ()=>{document.removeEventListener('pointerdown',onOutsidePointer);document.removeEventListener('keydown',onEscape);};
 },[searchOpen,group,query,ready]);
 const toggle=(name:string)=>setVisible(previous=>{const next=new Set(previous??topOne);if(next.has(name))next.delete(name);else next.add(name);return next;});
 const compareRows=useMemo(()=>{
  const dates=[...new Set(ready.flatMap(t=>t.points.map(p=>p.date)))].sort();
  const end=dates.at(-1);if(!end)return [];
  const limit=Date.parse(end+'T00:00:00Z')-compareDays*86400000;
  const values=new Map(ready.map(t=>[t.name,new Map(t.points.map(p=>[p.date,p.score]))]));
  return dates.filter(date=>Date.parse(date+'T00:00:00Z')>=limit).map(date=>({date,...Object.fromEntries(ready.flatMap(t=>{
   const value=values.get(t.name)?.get(date)??null,provisional=t.points.length>t.provisionalFrom;
   const first=t.points[t.provisionalFrom]?.date,confirmed=t.points[t.provisionalFrom-1]?.date;
   return [[t.key,value],[t.key+'__solid',provisional&&first&&date>=first?null:value],[t.key+'__dash',provisional&&confirmed&&date>=confirmed?value:null]];
  }))}));
 },[ready,compareDays]);
 const soloTheme=currentVisible.size===1?ranked.find(item=>currentVisible.has(item.name)):undefined;
 const soloPoints=soloTheme?soloTheme.points.filter(p=>{
  const end=Date.parse(soloTheme.points.at(-1)!.date+'T00:00:00Z');
  return Date.parse(p.date+'T00:00:00Z')>=end-compareDays*86400000;
 }).flatMap(p=>validScore(p.score)?[{date:p.date,score:p.score}]:[]):[];
 const soloLow=soloPoints.reduce<(typeof soloPoints)[number]|null>((best,p)=>!best||p.score<best.score?p:best,null);
 const soloHigh=soloPoints.reduce<(typeof soloPoints)[number]|null>((best,p)=>!best||p.score>best.score?p:best,null);
 const soloCurrent=soloPoints.at(-1);
 return <div className="zg-sfg-content zg-tfg-content">
  <p className="zg-sfg-as-of">{ready.length?'기준일 '+(payload?.observationDate??ready[0].date).replaceAll('-','.')+' · 공개 '+ready.length+'개':'테마 데이터 대기'}</p>
  <div className="zg-tfg-toolbar">
   <div className="zg-tfg-search-control" ref={searchContainerRef}>
    <button type="button" className="zg-tfg-search-toggle" aria-label={searchOpen?'테마 검색 닫기':'테마 검색 열기'} aria-expanded={searchOpen} aria-controls="zg-tfg-search-popover" onClick={()=>{if(searchOpen)closeSearch();else setSearchOpen(true);}}><Search size={16} aria-hidden="true"/></button>
    {searchOpen&&<div className="zg-tfg-search-popover" id="zg-tfg-search-popover"><label className="zg-explorer-search"><Search size={16} aria-hidden="true"/><input ref={searchInputRef} aria-label="테마 검색" type="search" value={query} onChange={e=>applyThemeFilter(group,e.target.value)} placeholder="테마 검색"/></label></div>}
   </div>
   <div className="zg-explorer-filters" role="group" aria-label="테마 분류">{[...new Set(['전체',...THEME_GROUPS.map(g=>g.name),...ready.map(t=>t.group)])].map(name=><button type="button" key={name} aria-pressed={group===name} onClick={()=>{setSearchOpen(false);applyThemeFilter(name,'');}}>{name}</button>)}</div>
  </div>
  {ready.length?<>
   <section className="zg-sfg-ranking" aria-label="공개 테마 투자심리 순위">
    <h2 className="zg-sfg-mobile-ranking-title">테마 심리 순위</h2>
    <div className="zg-sfg-mobile-rank-head" aria-hidden="true"><span>테마</span><span>점수</span><span>1M</span></div>
    <div className="zg-sfg-rank-head" aria-hidden="true"><span>순위</span><span>테마</span><span>현재 점수</span><div className="zg-sfg-scale"><span>극단적 공포</span><span>공포</span><span>중립</span><span>탐욕</span><span>극단적 탐욕</span></div><span>1년 추이</span><span>1개월 변동</span></div>
    <div className="zg-sfg-rank-list">{ranked.map((item,index)=>{
     const delta=changeFor(item.points,1,0);
     return <button type="button" key={item.name} className="zg-sfg-rank-row" aria-pressed={currentVisible.has(item.name)} aria-label={(index+1)+'위 '+item.name+', '+item.score.toFixed(1)+'점, 1개월 변화 '+deltaText(delta)+'. 비교 차트 '+(currentVisible.has(item.name)?'ON':'OFF')+', 클릭하면 비교 차트 표시 전환'} onClick={()=>toggle(item.name)}>
      <span className="zg-sfg-rank-number">{index+1}</span><span className="zg-sfg-rank-name"><i style={{background:item.color}}/>{item.name}</span><strong className="zg-sfg-rank-score" style={{color:scoreColor(item.score)}}>{item.score.toFixed(1)}</strong>
      <ScoreBar score={item.score}/><Sparkline item={item} days={compareDays}/><span className={'zg-sfg-rank-delta '+deltaState(delta)}>{deltaText(delta)}{delta!==null&&delta!==0&&<i aria-hidden="true">{delta>0?'▲':'▼'}</i>}</span>
     </button>;
    })}</div>
    {!ranked.length&&<p className="zg-tfg-empty">해당 분류에 공개된 점수가 없습니다.</p>}
   </section>
   <div className="zg-sfg-lower">
    <section className="zg-sfg-comparison" aria-label="테마별 심리 지수 비교">
     <div className="zg-sfg-panel-head"><div><h2>테마별 1년 심리 지수 비교</h2><p>선택한 테마의 ETF 기반 공포·탐욕 점수를 비교합니다.</p></div><PeriodButtons value={compareDays} onChange={days=>{setCompareDays(days);setComparisonPinned(false);}} items={PERIODS} label="테마 비교 기간"/></div>
     <div className="zg-sfg-legend" role="group" aria-label="비교할 테마 선택">{ranked.map(item=><button type="button" key={item.name} aria-pressed={currentVisible.has(item.name)} onClick={()=>toggle(item.name)} title={item.name}><i style={{background:item.color}}/><span className="zg-sfg-legend-name">{item.name}</span><strong className="zg-sfg-legend-score" style={{color:scoreColor(item.score)}}>{item.score.toFixed(1)}</strong></button>)}</div>
     <div className="zg-sfg-comparison-plot"><ResponsiveContainer width="100%" height="100%"><LineChart data={compareRows} margin={{top:8,right:10,bottom:0,left:0}} onMouseDown={()=>setComparisonPinned(true)} onMouseUp={()=>setComparisonPinned(false)} onMouseLeave={()=>setComparisonPinned(false)}>
      <Zones/><CartesianGrid stroke="#23485b" strokeDasharray="2 4" vertical={true}/>
      <XAxis dataKey="date" stroke="#a9bccd" fontSize={11} axisLine={false} tickLine={false} tickFormatter={date=>String(date).slice(5)} minTickGap={42}/><YAxis domain={[0,100]} ticks={[0,25,50,75,100]} interval={0} stroke="#a9bccd" axisLine={false} tickLine={false} fontSize={11} width={34}/><ReferenceLine y={50} stroke="#92a3b0" strokeDasharray="3 4"/>
      <Tooltip active={comparisonPinned||undefined} isAnimationActive={false} wrapperStyle={{pointerEvents:'none'}} content={({active:show,label})=>{
       if(!show)return null;
       const day=String(label),dayRow=compareRows.find(row=>row.date===day);
       const values=themeTooltipRows(ranked,currentVisible,dayRow,day);
       return !values.length?null:<div className="zg-sfg-tooltip zg-tfg-compare-tooltip"><strong>{day}</strong>{values.map(item=><div key={item.name} className={item.score===null?'zg-tfg-tooltip-missing':undefined}>
        <span style={{color:item.score===null?'#8299ac':item.color}}>{item.name}</span>
        <b>{item.score===null?'—':item.score.toFixed(1)+'점'}{item.score===null&&item.lastObservedDate&&<small>최종 {item.lastObservedDate.slice(5)}</small>}</b>
       </div>)}</div>;
      }}/>
      {ranked.flatMap(item=>item.points.length>item.provisionalFrom?[
       <Line key={item.key} dataKey={item.key+'__solid'} name={item.name} stroke={item.color} hide={!currentVisible.has(item.name)} strokeWidth={1.9} dot={false} activeDot={{r:3}} connectNulls={false} isAnimationActive={false}/>,
       <Line key={item.key+'-dash'} dataKey={item.key+'__dash'} name={item.name} stroke={item.color} hide={!currentVisible.has(item.name)} strokeWidth={1.9} strokeDasharray="4 4" dot={false} activeDot={{r:3}} connectNulls={false} isAnimationActive={false}/>,
      ]:[<Line key={item.key} dataKey={item.key} name={item.name} stroke={item.color} hide={!currentVisible.has(item.name)} strokeWidth={1.9} dot={false} activeDot={{r:3}} connectNulls={false} isAnimationActive={false}/>])}
      {soloLow&&soloHigh&&soloCurrent&&<ReferenceDot x={soloCurrent.date} y={soloCurrent.score} ifOverflow="visible" shape={<SoloChartMarkers rows={soloPoints} low={soloLow} high={soloHigh} current={soloCurrent}/>}/>}
     </LineChart></ResponsiveContainer></div>
    </section>
   </div>
   <p className="zg-sfg-footnote">ETF 저장 점수의 변화량입니다. 비교 이력이 없으면 —로 표시하며, 잠정 구간은 점선으로 구분합니다.</p>
  </>:<p className="zg-sfg-state" role="status">{loading?'ETF 전용 3축 연구 · 공개 데이터를 불러오는 중입니다.':'ETF 전용 3축 연구 · 공개 데이터 대기'}</p>}
 </div>;
}
