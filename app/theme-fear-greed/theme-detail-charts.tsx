'use client';
import {useMemo,useState} from 'react';
import {Search} from 'lucide-react';
import {CartesianGrid,Line,LineChart,ReferenceArea,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {THEME_GROUPS} from '../../components/market-explorer-catalog';
import {useStoredIndex} from '../../components/use-stored-index';

type Point={date:string;score:number};
type ThemeScore={theme:string;etfs:string[];score:number;history:Point[]};
type PublicThemeFeed={status:string;observationDate?:string;phase?:string;themes?:ThemeScore[];provisional?:{points:{date:string;scores:Record<string,number>}[]}};
type Theme={name:string;group:string;color:string;key:string;etfs:string[];points:Point[];provisionalFrom:number;score:number;date:string};
const CATALOG=THEME_GROUPS.flatMap(g=>g.items.map(name=>({name,group:g.name})));
const COLORS=['#a3e635','#2dd4bf','#38bdf8','#ff8729','#b777ed','#ffd438','#f15aa7','#ff6464','#9fb1c5','#16d8d7','#e76aba'];
const PERIODS=[['1W',7],['1M',30],['3M',90],['6M',180],['1Y',365]] as const;
const DETAIL_PERIODS=[['1D',0],...PERIODS] as const;
const CHANGES=[['1일',0,1],['1주',0,7],['1개월',1,0],['3개월',3,0],['6개월',6,0],['1년',12,0]] as const;
const validScore=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
const validDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'));
const deltaText=(v:number|null)=>v===null?'—':(v>0?'+':'')+v.toFixed(1)+'p';
const deltaState=(v:number|null)=>v===null?'is-missing':v>0?'is-up':v<0?'is-down':'is-flat';
function acceptedThemes(feed:PublicThemeFeed|null):Theme[]{
 if(feed?.status!=='READY'||!Array.isArray(feed.themes))return [];
 const provisional=feed.phase==='PROVISIONAL'&&Array.isArray(feed.provisional?.points)?feed.provisional.points:[];
 return feed.themes.flatMap(item=>{
  const index=CATALOG.findIndex(t=>t.name===item?.theme);
  if(index<0||!validScore(item.score)||!Array.isArray(item.history)||item.history.length!==252)return [];
  if(!item.history.every((p,i)=>validDate(p?.date)&&validScore(p?.score)&&(!i||p.date>item.history[i-1].date)))return [];
  if(Math.abs(item.history[251].score-item.score)>0.000001)return [];
  const points=item.history.map(p=>({...p})),provisionalFrom=points.length;
  for(const extra of provisional){
   if(validDate(extra?.date)&&extra.date>points[points.length-1].date&&validScore(extra.scores?.[item.theme]))points.push({date:extra.date,score:extra.scores[item.theme]});
  }
  return [{name:item.theme,group:CATALOG[index].group,color:COLORS[index%COLORS.length],key:'theme_'+index,etfs:Array.isArray(item.etfs)?item.etfs:[],points,provisionalFrom,score:points.at(-1)!.score,date:points.at(-1)!.date}];
 }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'ko'));
}
function comparisonDate(date:string,months:number,days:number){
 const target=new Date(date+'T00:00:00Z');
 if(months){const day=target.getUTCDate();target.setUTCDate(1);target.setUTCMonth(target.getUTCMonth()-months);const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(day,last));}
 target.setUTCDate(target.getUTCDate()-days);return target.toISOString().slice(0,10);
}
function changeFor(points:Point[],months:number,days:number){
 const latest=points.at(-1);if(!latest)return null;
 const before=points.findLast(p=>p.date<=comparisonDate(latest.date,months,days));
 return before?Math.round((latest.score-before.score)*10)/10:null;
}
function periodPoints(points:Point[],days:number){
 if(!points.length)return points;if(!days)return points.slice(-2);
 const limit=Date.parse(points.at(-1)!.date+'T00:00:00Z')-days*86400000;
 return points.filter(p=>Date.parse(p.date+'T00:00:00Z')>=limit);
}
function PeriodButtons({value,onChange,items,label}:{value:number;onChange:(n:number)=>void;items:readonly (readonly [string,number])[];label:string}){
 return <div className="zg-sfg-periods" role="group" aria-label={label}>{items.map(([name,days])=><button type="button" key={name} aria-pressed={value===days} onClick={()=>onChange(days)}>{name}</button>)}</div>;
}
function ScoreBar({score}:{score:number}){
 return <div className="zg-sfg-meter" aria-label={'심리 점수 '+score.toFixed(1)+'점'}><span/><span/><span/><span/><span/><i className="zg-sfg-meter-marker" style={{left:score+'%'}}/></div>;
}
function Sparkline({item}:{item:Theme}){
 const provisional=item.points.length>item.provisionalFrom;
 const data=item.points.map((p,i)=>({...p,solid:provisional&&i>=item.provisionalFrom?null:p.score,dash:provisional&&i>=item.provisionalFrom-1?p.score:null}));
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

export default function ThemeDetailCharts(){
 const {payload,error,loading}=useStoredIndex<PublicThemeFeed>('/api/theme-fear-greed');
 const [group,setGroup]=useState('전체'),[query,setQuery]=useState('');
 const [visible,setVisible]=useState<Set<string>|null>(null),[selected,setSelected]=useState<string|null>(null);
 const [compareDays,setCompareDays]=useState(365),[detailDays,setDetailDays]=useState(365),[comparisonPinned,setComparisonPinned]=useState(false);
 // Never display a cached score once the stored-only API has failed.
 const ready=useMemo(()=>acceptedThemes(error?null:payload),[error,payload]);
 const topThree=useMemo(()=>new Set(ready.slice(0,3).map(t=>t.name)),[ready]);
 const currentVisible=visible??topThree;
 const available=useMemo(()=>new Set(ready.map(t=>t.name)),[ready]);
 const matches=(name:string,g:string)=>(group==='전체'||group===g)&&name.toLocaleLowerCase('ko').includes(query.trim().toLocaleLowerCase('ko'));
 const ranked=ready.filter(t=>matches(t.name,t.group));
 const pending=CATALOG.filter(t=>!available.has(t.name)&&matches(t.name,t.group));
 const active=ready.find(t=>t.name===selected)??ready[0];
 const toggle=(name:string)=>setVisible(previous=>{const next=new Set(previous??topThree);if(next.has(name))next.delete(name);else next.add(name);return next;});
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
 const detailRows=active?periodPoints(active.points,detailDays).map(p=>({...p,
  solid:active.points.length>active.provisionalFrom&&p.date>=active.points[active.provisionalFrom]?.date?null:p.score,
  dash:active.points.length>active.provisionalFrom&&p.date>=active.points[active.provisionalFrom-1]?.date?p.score:null,
 })): [];
 return <div className="zg-sfg-content zg-tfg-content">
  <p className="zg-sfg-as-of">{ready.length?'기준일 '+(payload?.observationDate??ready[0].date).replaceAll('-','.')+' · 공개 '+ready.length+'개 / 전체 '+CATALOG.length+'개':'전체 '+CATALOG.length+'개 테마'}</p>
  <div className="zg-tfg-toolbar"><div className="zg-explorer-filters" role="group" aria-label="테마 분류">{['전체',...THEME_GROUPS.map(g=>g.name)].map(name=><button type="button" key={name} aria-pressed={group===name} onClick={()=>setGroup(name)}>{name}</button>)}</div><label className="zg-explorer-search"><Search size={16}/><input aria-label="테마 검색" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="테마 검색"/></label></div>
  {ready.length?<>
   <section className="zg-sfg-ranking" aria-label="공개 테마 투자심리 순위">
    <div className="zg-sfg-rank-head" aria-hidden="true"><span>순위</span><span>테마</span><span>현재 점수</span><div className="zg-sfg-scale"><span>극단적 공포</span><span>공포</span><span>중립</span><span>탐욕</span><span>극단적 탐욕</span></div><span>1년 추이</span><span>1개월 변동</span></div>
    <div className="zg-sfg-rank-list">{ranked.map(item=>{
     const index=ready.findIndex(t=>t.name===item.name),delta=changeFor(item.points,1,0);
     return <button type="button" key={item.name} className="zg-sfg-rank-row" aria-pressed={currentVisible.has(item.name)} data-selected={active?.name===item.name} aria-label={(index+1)+'위 '+item.name+', '+item.score.toFixed(1)+'점, 1개월 변화 '+deltaText(delta)+'. 비교 차트 '+(currentVisible.has(item.name)?'ON':'OFF')+', 클릭하면 차트 표시 전환 및 상세 보기'} onClick={()=>{setSelected(item.name);toggle(item.name);}}>
      <span className="zg-sfg-rank-number">{index+1}</span><span className="zg-sfg-rank-name"><i style={{background:item.color}}/>{item.name}</span><strong className="zg-sfg-rank-score">{item.score.toFixed(1)}</strong>
      <ScoreBar score={item.score}/><Sparkline item={item}/><span className={'zg-sfg-rank-delta '+deltaState(delta)}>{deltaText(delta)}{delta!==null&&delta!==0&&<i aria-hidden="true">{delta>0?'▲':'▼'}</i>}</span>
     </button>;
    })}</div>
    {!ranked.length&&<p className="zg-tfg-empty">해당 분류에 공개된 점수가 없습니다.</p>}
   </section>
   <div className="zg-sfg-lower">
    <section className="zg-sfg-comparison" aria-label="테마별 심리 지수 비교">
     <div className="zg-sfg-panel-head"><div><h2>테마별 1년 심리 지수 비교</h2><p>선택한 테마의 ETF 기반 공포·탐욕 점수를 비교합니다.</p></div><PeriodButtons value={compareDays} onChange={days=>{setCompareDays(days);setComparisonPinned(false);}} items={PERIODS} label="테마 비교 기간"/></div>
     <div className="zg-sfg-legend" role="group" aria-label="비교할 테마 선택">{ready.map(item=><button type="button" key={item.name} aria-pressed={currentVisible.has(item.name)} onClick={()=>toggle(item.name)}><i style={{background:item.color}}/>{item.name}</button>)}</div>
     <div className="zg-sfg-comparison-plot"><ResponsiveContainer width="100%" height="100%"><LineChart data={compareRows} margin={{top:8,right:10,bottom:0,left:0}} onMouseDown={()=>setComparisonPinned(true)} onMouseUp={()=>setComparisonPinned(false)} onMouseLeave={()=>setComparisonPinned(false)}>
      <Zones/><CartesianGrid stroke="#23485b" strokeDasharray="2 4" vertical={true}/>
      <XAxis dataKey="date" stroke="#a9bccd" fontSize={11} axisLine={false} tickLine={false} tickFormatter={date=>String(date).slice(5)} minTickGap={42}/><YAxis domain={[0,100]} ticks={[0,25,50,75,100]} interval={0} stroke="#a9bccd" axisLine={false} tickLine={false} fontSize={11} width={34}/><ReferenceLine y={50} stroke="#92a3b0" strokeDasharray="3 4"/>
      <Tooltip active={comparisonPinned||undefined} isAnimationActive={false} wrapperStyle={{pointerEvents:'none'}} content={({active:show,payload,label})=>!show||!payload?.length?null:<div className="zg-sfg-tooltip"><strong>{String(label)}</strong>{payload.filter(p=>validScore(p.value)).map(p=><div key={String(p.dataKey)}><span style={{color:p.color}}>{p.name}</span><b>{Number(p.value).toFixed(1)}점</b></div>)}</div>}/>
      {ready.flatMap(item=>item.points.length>item.provisionalFrom?[
       <Line key={item.key} dataKey={item.key+'__solid'} name={item.name} stroke={item.color} hide={!currentVisible.has(item.name)} strokeWidth={1.9} dot={false} activeDot={{r:3}} connectNulls={false} isAnimationActive={false}/>,
       <Line key={item.key+'-dash'} dataKey={item.key+'__dash'} name={item.name} stroke={item.color} hide={!currentVisible.has(item.name)} strokeWidth={1.9} strokeDasharray="4 4" dot={false} activeDot={{r:3}} connectNulls={false} isAnimationActive={false}/>,
      ]:[<Line key={item.key} dataKey={item.key} name={item.name} stroke={item.color} hide={!currentVisible.has(item.name)} strokeWidth={1.9} dot={false} activeDot={{r:3}} connectNulls={false} isAnimationActive={false}/>])}
     </LineChart></ResponsiveContainer></div>
    </section>
    {active&&<section className="zg-sfg-detail" aria-label={active.name+' 개별 차트와 변화량'}>
     <div className="zg-sfg-detail-head"><h2><i style={{background:active.color}}/>{active.name}</h2><strong>{active.score.toFixed(1)}<small>점</small></strong></div>
     <p className="zg-sfg-detail-desc">{active.group} · ETF {active.etfs.join(' · ')||'구성 정보 없음'}</p><PeriodButtons value={detailDays} onChange={setDetailDays} items={DETAIL_PERIODS} label={active.name+' 차트 기간'}/>
     <div className="zg-sfg-detail-plot"><ResponsiveContainer width="100%" height="100%"><LineChart data={detailRows} margin={{top:8,right:10,bottom:0,left:0}}>
      <CartesianGrid vertical={false} stroke="#315064" strokeDasharray="2 4"/><XAxis dataKey="date" stroke="#9eb2c4" fontSize={10} tickFormatter={date=>String(date).slice(5)} minTickGap={26} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} ticks={[0,25,50,75,100]} interval={0} width={28} stroke="#9eb2c4" fontSize={10} axisLine={false} tickLine={false}/>
      <Tooltip content={({active:show,payload,label})=>show&&validScore(payload?.[0]?.value)?<div className="zg-sfg-tooltip"><strong>{String(label)}</strong><div><span style={{color:active.color}}>{active.name}</span><b>{Number(payload![0].value).toFixed(1)}점</b></div></div>:null}/>
      <Line dataKey={active.points.length>active.provisionalFrom?'solid':'score'} name={active.name} stroke={active.color} strokeWidth={2} dot={false} activeDot={{r:4}} connectNulls={false} isAnimationActive={false}/>
      {active.points.length>active.provisionalFrom&&<Line dataKey="dash" name={active.name} stroke={active.color} strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{r:4}} connectNulls={false} isAnimationActive={false}/>}
     </LineChart></ResponsiveContainer></div>
     <dl className="zg-sfg-changes">{CHANGES.map(([label,months,days])=>{const delta=changeFor(active.points,months,days);return <div key={label}><dt>{label}</dt><dd className={deltaState(delta)}>{deltaText(delta)}</dd></div>;})}</dl>
    </section>}
   </div>
   <p className="zg-sfg-footnote">ETF 저장 점수의 변화량입니다. 비교 이력이 없으면 —로 표시하며, 잠정 구간은 점선으로 구분합니다.</p>
  </>:<p className="zg-sfg-state" role="status">{loading?'ETF 전용 3축 연구 · 공개 데이터를 불러오는 중입니다.':'ETF 전용 3축 연구 · 공개 데이터 대기'}</p>}
  <details className="zg-tfg-pending" open={Boolean(query.trim())} key={group}>
   <summary>데이터 준비 중인 테마 <strong>{pending.length}개</strong><span>목록 펼치기 ▾</span></summary>
   <div className="zg-tfg-pending-list">{pending.map(item=><div key={item.name}><span>{item.group}</span><strong>{item.name}</strong><small>— · 데이터 준비 중</small></div>)}</div>
  </details>
  {!ranked.length&&!pending.length&&<p className="zg-tfg-empty" role="status">검색한 테마가 없습니다.</p>}
 </div>;
}
