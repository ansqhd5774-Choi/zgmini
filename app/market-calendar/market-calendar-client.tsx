'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Search,Star} from 'lucide-react';
import {releaseImportance,rowsForSelectedDay} from '../../lib/market-calendar-importance.mjs';
import snapshot from '../guides/release-snapshot.json';

type EventKind='economic'|'earnings';
type Country='US'|'KR';
type View='week'|'month';
type FilterKind='all'|EventKind;
type FilterCountry='all'|Country;
type OfficialEvent={id:string;date:string;title:string;source:string;sourceUrl:string};
type SourceState={status:string;checkedAt?:string|null};
type CalendarFeed={status:string;updatedAt?:string;sources?:Record<string,SourceState>;events?:OfficialEvent[]};
type CalendarRow={key:string;date:string;at:string|null;name:string;country:Country;category:string;kind:EventKind;actual:string|null;forecast:string|null;previous:string|null;major:boolean;importance:number;source:string;sourceUrl:string;checkedAt:string|null;status:'scheduled'|'released';fresh:boolean};

const dayLabels=['일','월','화','수','목','금','토'];
const sourceNames:Record<string,string>={bls:'BLS',bea:'BEA',fed:'연준',fed_calendar:'연준',census:'Census',eia:'EIA',usda:'USDA'};
const eventKinds:Record<string,{category:string;name:string;major:boolean}>={
 employment:{category:'고용',name:'미국 고용보고서 · 비농업고용·실업률',major:true},
 pce:{category:'물가',name:'미국 개인소득·지출(PCE)',major:true},
 gdp:{category:'경기',name:'미국 국내총생산(GDP)',major:true},
 retail:{category:'소비',name:'미국 소매판매',major:true},
 'industrial-production':{category:'제조',name:'미국 산업생산',major:false},
 cpi:{category:'물가',name:'미국 소비자물가지수(CPI)',major:true},
 ppi:{category:'물가',name:'미국 생산자물가지수(PPI)',major:true},
 jolts:{category:'고용',name:'미국 구인·이직 조사(JOLTS)',major:true},
 eci:{category:'고용',name:'미국 고용비용지수(ECI)',major:true},
 'import-export-prices':{category:'무역',name:'미국 수출입물가지수',major:false},
 productivity:{category:'생산성',name:'미국 생산성·단위노동비용',major:false},
 'real-earnings':{category:'고용',name:'미국 실질임금',major:false},
 'consumer-expenditures':{category:'소비',name:'미국 소비자지출 조사',major:false},
 'employer-compensation':{category:'고용',name:'미국 고용주 인건비 조사',major:false},
 'usda-wasde':{category:'원자재',name:'미국 농산물 수급전망(WASDE)',major:false},
 fomc:{category:'금리',name:'미국 FOMC 기준금리 결정',major:true},
 press:{category:'금리',name:'FOMC 기자회견',major:false},
};

const validDate=(s:string)=>/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s)&&new Date(`${s}T00:00:00Z`).toISOString().slice(0,10)===s;
const parseDay=(key:string)=>new Date(`${key}T00:00:00Z`);
const dayKey=(date:Date)=>date.toISOString().slice(0,10);
const plusDays=(key:string,days:number)=>dayKey(new Date(parseDay(key).getTime()+days*86400000));
const monday=(key:string)=>plusDays(key,-((parseDay(key).getUTCDay()+6)%7));
const monthStart=(key:string)=>`${key.slice(0,7)}-01`;
const monthEnd=(key:string)=>dayKey(new Date(Date.UTC(Number(key.slice(0,4)),Number(key.slice(5,7)),0)));
const monthStep=(key:string,step:number)=>dayKey(new Date(Date.UTC(Number(key.slice(0,4)),Number(key.slice(5,7))-1+step,1)));
const dayInZone=(at:Date,timeZone:string)=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at);
 const v=(key:string)=>parts.find(p=>p.type===key)?.value??'';
 return `${v('year')}-${v('month')}-${v('day')}`;
};
const kstDay=(at:Date)=>dayInZone(at,'Asia/Seoul');
const usDay=(at:Date)=>dayInZone(at,'America/New_York');
const kstTime=(at:string)=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at));
const elapsed=(deadline:string,nowMs:number)=>{
 if(!nowMs)return '계산 중';
 const minutes=Math.ceil((Date.parse(deadline)-nowMs)/60000);
 if(!Number.isFinite(minutes))return '시간 미확정';
 if(minutes<=0)return '발표 시간 경과';
 const days=Math.floor(minutes/1440),hours=Math.floor((minutes%1440)/60),mins=minutes%60;
 const two=(n:number)=>String(n).padStart(2,'0');
 return days>0?`D-${days} ${two(hours)}:${two(mins)}`:hours>0?`${hours}시간 ${two(mins)}분`:`${minutes}분 남음`;
};
const diffDays=(a:string,b:string)=>Math.round((parseDay(a).getTime()-parseDay(b).getTime())/86400000);
const dateCaption=(key:string)=>`${Number(key.slice(5,7))}.${key.slice(8,10)}`;
const weekTitle=(start:string)=>`${Number(start.slice(5,7))}월 ${Math.ceil(Number(start.slice(8,10))/7)}주차`;
const officialName=(item:OfficialEvent,defaultName:string)=>{
 if(item.id!=='gdp')return defaultName;
 const stage=/\bAdvance Estimate\b/i.test(item.title)?'1차 추정':/\bSecond Estimate\b/i.test(item.title)?'2차 추정':/\bThird Estimate\b/i.test(item.title)?'3차 추정':/\bInitial Estimate\b/i.test(item.title)?'초기 추정':/\bUpdated Estimate\b/i.test(item.title)?'수정 추정':null;
 return stage?`${defaultName} · ${stage}`:defaultName;
};

function snapshotRows():CalendarRow[]{
 const scheduled:CalendarRow[]=snapshot.events.map(item=>{
  const at=new Date(item.at);const meta=eventKinds[item.id]??{category:'경기',name:item.name,major:false};
  return {key:`manual-${item.id}-${item.at}`,date:kstDay(at),at:item.at,name:meta.name,country:'US',category:meta.category,kind:'economic',actual:null,forecast:null,previous:null,major:meta.major,importance:releaseImportance(item.id,item.name),source:item.id==='cpi'?'BLS':item.id==='pce'?'BEA':'연준',sourceUrl:item.source,checkedAt:snapshot.checkedAt,status:'scheduled',fresh:false};
 });
 const released:CalendarRow[]=snapshot.releases.map((item,index)=>({
  key:`manual-release-${index}-${item.publishedAt}`,date:item.publishedAt,at:null,
  name:`${item.name} · ${item.period} · ${item.unit}`,country:'US',category:'물가',kind:'economic',
  actual:item.actual.toFixed(1),forecast:null,previous:item.previous.toFixed(1),major:true,importance:releaseImportance(item.name.includes('CPI')?'cpi':'pce',item.name),
  source:item.name.includes('CPI')?'BLS':'BEA',sourceUrl:item.source,checkedAt:snapshot.checkedAt,status:'released',fresh:false,
 }));
 return [...scheduled,...released];
}

function mergeOfficial(feed:CalendarFeed|null):CalendarRow[]{
 const manual=snapshotRows();
 if(!feed?.events?.length)return manual;
 const fromFeed:CalendarRow[]=[];
 const seen=new Set<string>();
 for(const item of feed.events){
  const fedCalendarEvent=item.source==='fed_calendar'&&item.id.startsWith('fed-calendar-');
  const eiaEvent=item.source==='eia'&&['eia-wpsr','eia-wngsr','eia-steo'].includes(item.id);
  const usdaEvent=item.source==='usda'&&item.id==='usda-wasde';
  if(!validDate(item.date)||!(eventKinds[item.id]||fedCalendarEvent||eiaEvent||usdaEvent||((item.source==='bls'||item.source==='bea'||item.source==='census')&&item.id.startsWith(`${item.source}-`)))||typeof item.sourceUrl!=='string'||!item.sourceUrl.startsWith('https://'))continue;
  if(item.id==='fomc'||item.id==='press')continue;
  const duplicate=`${item.id}:${item.date}`;
  if(seen.has(duplicate))continue;
  seen.add(duplicate);
  const sourceState=feed.sources?.[item.source];
  const checkedAt=sourceState?.checkedAt??null;
  const fresh=sourceState?.status==='READY'&&!!checkedAt&&Date.now()-Date.parse(checkedAt)>=0&&Date.now()-Date.parse(checkedAt)<=48*3600000;
  const category=item.source==='usda'?'원자재':item.source==='eia'?'에너지':item.id==='fed-calendar-fomc-minutes'?'금리':item.id==='fed-calendar-beige-book'?'경기':item.source==='bls'?'고용·노동':'경제';
  const meta=eventKinds[item.id]??{category,name:item.title,major:false};
  // Provider feed supplies dates only. Keep an exact clock time solely when
  // the already verified manual snapshot matches this event and day.
  const timed=manual.find(row=>row.key.startsWith(`manual-${item.id}-`)&&row.date===item.date);
  // Existing verified actuals supersede past date-only schedule placeholders.
  const hasActual=manual.some(row=>row.status==='released'&&row.date===item.date&&((item.id==='cpi'&&row.source==='BLS')||(item.id==='pce'&&row.source==='BEA')));
  if(hasActual)continue;
  fromFeed.push({key:`official-${duplicate}`,date:item.date,at:timed?.at??null,name:officialName(item,meta.name),country:'US',category:meta.category,kind:'economic',actual:null,forecast:null,previous:null,major:meta.major,importance:releaseImportance(item.id,item.title),source:sourceNames[item.source]??item.source,sourceUrl:item.sourceUrl,checkedAt:timed?.checkedAt??checkedAt,fresh:timed?false:fresh,status:'scheduled'});
 }
 const scheduledIds=new Set(fromFeed.map(row=>row.key.slice('official-'.length)));
 return [...fromFeed,...manual.filter(row=>row.status==='released'||!scheduledIds.has(`${row.key.split('-')[1]}:${row.date}`))];
}

export default function MarketCalendar(){
 const [feed,setFeed]=useState<CalendarFeed|null>(null);
 const [loadState,setLoadState]=useState<'loading'|'ready'|'error'>('loading');
 const [today,setToday]=useState('2026-10-26'); // Hydration-safe placeholder, replaced with real KST date on mount.
 const [selected,setSelected]=useState('2026-10-26');
 const [activeDate,setActiveDate]=useState<string|null>(null);
 const [view,setView]=useState<View>('week');
 const [kind,setKind]=useState<FilterKind>('economic');
 const [country,setCountry]=useState<FilterCountry>('all');
 const [query,setQuery]=useState('');
 const [nowMs,setNowMs]=useState(0);
 const stripRef=useRef<HTMLDivElement>(null);

 useEffect(()=>{
  const now=new Date();const key=kstDay(now);setToday(key);setSelected(key);setNowMs(now.getTime());
  const timer=window.setInterval(()=>{const current=new Date();setNowMs(current.getTime());setToday(kstDay(current));},30000);
  const controller=new AbortController();
  fetch('/api/release-calendar',{signal:controller.signal,cache:'no-store'}).then(async res=>{
   if(!res.ok)throw Error(`HTTP ${res.status}`);
   return await res.json() as CalendarFeed;
  }).then(data=>{if(!controller.signal.aborted){setFeed(data);setLoadState('ready');}}).catch(()=>{
   if(!controller.signal.aborted)setLoadState('error');
  });
  return()=>{window.clearInterval(timer);controller.abort();};
 },[]);

 const range=useMemo(()=>view==='week'?{start:monday(selected),end:plusDays(monday(selected),6)}:{start:monthStart(selected),end:monthEnd(selected)},[selected,view]);
 const allRows=useMemo(()=>mergeOfficial(feed),[feed]);
 const periodRows=useMemo(()=>allRows.filter(row=>row.date>=range.start&&row.date<=range.end&&(kind==='all'||row.kind===kind)&&(country==='all'||row.country===country)&&(!query||`${row.name} ${row.category} ${row.source} ${row.country}`.toLowerCase().includes(query.trim().toLowerCase()))).sort((a,b)=>a.date.localeCompare(b.date)||(a.at??'').localeCompare(b.at??'')||a.name.localeCompare(b.name)),[allRows,range,kind,country,query]);
 const filtered=useMemo(()=>rowsForSelectedDay(periodRows,activeDate) as CalendarRow[],[periodRows,activeDate]);
 const days=useMemo(()=>Array.from({length:diffDays(range.end,range.start)+1},(_,i)=>plusDays(range.start,i)),[range]);
 const shownDates=useMemo(()=>new Set(periodRows.map(row=>row.date)),[periodRows]);
 const byWeek=useMemo(()=>{
  const groups=new Map<string,CalendarRow[]>();
  for(const row of filtered){const key=monday(row.date);groups.set(key,[...(groups.get(key)??[]),row]);}
  return [...groups.entries()];
 },[filtered]);
 const changeRange=(offset:number)=>{setActiveDate(null);setSelected(current=>view==='week'?plusDays(current,offset*7):monthStep(current,offset));};

 useEffect(()=>{
  if(view!=='month'||!stripRef.current)return;
  const active=stripRef.current.querySelector<HTMLButtonElement>('.mc-day.selected, .mc-day.today');
  if(active)stripRef.current.scrollLeft=Math.max(0,active.offsetLeft-stripRef.current.offsetLeft-stripRef.current.clientWidth/2+active.clientWidth/2);
 },[view,selected]);

 const remaining=(row:CalendarRow)=>{
  if(row.status==='released')return {label:'발표 완료',style:'done'};
  if(row.at){const label=elapsed(row.at,nowMs);return {label,style:label==='발표 시간 경과'?'elapsed':''};}
  if(!nowMs)return {label:'계산 중',style:''};
  // Untimed official US events are dated in the publishing agency's US calendar day.
  const referenceDay=row.country==='US'?usDay(new Date(nowMs)):today;
  const daysLeft=diffDays(row.date,referenceDay);
  if(daysLeft<0)return {label:'발표일 경과',style:'elapsed'};
  if(daysLeft===0)return {label:'오늘 · 시각 미정',style:'elapsed'};
  return {label:`D-${daysLeft} · 시각 미정`,style:''};
 };

 return <section className="mc-panel" aria-label="시장 발표 일정">
  <div className="mc-controls">
   <label className="mc-search"><Search size={15} aria-hidden="true"/><input value={query} onChange={event=>setQuery(event.target.value)} type="search" placeholder="지표·기업명 검색" aria-label="지표 또는 기업명 검색"/></label>
   <div className="mc-filter"><span className="mc-filter-label">일정</span><div className="mc-pills" role="group" aria-label="일정 유형">
    {([['economic','경제지표'],['earnings','기업 실적'],['all','전체']] as const).map(([key,label])=><button key={key} type="button" className={kind===key?'active':''} onClick={()=>setKind(key)} aria-pressed={kind===key}>{label}</button>)}
   </div></div>
   <div className="mc-filter"><span className="mc-filter-label">국가</span><div className="mc-pills" role="group" aria-label="국가 선택">
    {([['all','전체'],['US','미국'],['KR','한국']] as const).map(([key,label])=><button key={key} type="button" className={country===key?'active':''} onClick={()=>setCountry(key)} aria-pressed={country===key}>{label}</button>)}
   </div></div>
   <div className="mc-range" role="group" aria-label="기간 선택과 이동">
    <button type="button" className={view==='week'?'active':''} aria-pressed={view==='week'} onClick={()=>{setView('week');setActiveDate(null);}}>주간</button>
    <button type="button" className={view==='month'?'active':''} aria-pressed={view==='month'} onClick={()=>{setView('month');setActiveDate(null);}}>월간</button>
    <span className="mc-divider" aria-hidden="true"/>
    <button type="button" onClick={()=>{setSelected(today);setActiveDate(today);}}>오늘</button>
    <button type="button" className="mc-arrow" onClick={()=>changeRange(-1)} aria-label="이전 기간"><ChevronLeft size={17}/></button>
    <button type="button" className="mc-arrow" onClick={()=>changeRange(1)} aria-label="다음 기간"><ChevronRight size={17}/></button>
   </div>
  </div>
  <div className="mc-calendar-strip">
   <div className="mc-period"><strong>{view==='week'?`${range.start.slice(0,4)}년 ${weekTitle(range.start)}`:`${selected.slice(0,4)}년 ${Number(selected.slice(5,7))}월`}</strong><span>{activeDate?`${Number(activeDate.slice(5,7))}월 ${Number(activeDate.slice(8,10))}일 · `:''}{filtered.length}개 일정</span></div>
   <div className={`mc-day-strip ${view==='month'?'is-month':''}`} ref={stripRef} aria-label="가로형 달력">
    {days.map(key=><button type="button" key={key} aria-label={`${key.slice(0,4)}년 ${Number(key.slice(5,7))}월 ${Number(key.slice(8))}일`} aria-pressed={activeDate===key} className={`mc-day ${activeDate===key?'selected':''} ${today===key?'today':''} ${shownDates.has(key)?'has-event':''}`} onClick={()=>{setSelected(key);setActiveDate(current=>current===key?null:key);}}><strong>{Number(key.slice(8,10))}</strong><small>{dayLabels[parseDay(key).getUTCDay()]}</small></button>)}
   </div>
  </div>
  <div className="mc-head" aria-hidden="true"><span className="mc-importance-heading" title="발표 예상 시장 영향도: 별 1개 일반, 2개 관심, 3개 핵심"><Star size={12} fill="currentColor" aria-hidden="true"/>중요도</span><span>날짜</span><span>시간</span><span>국가</span><span>발표 일정</span><span>발표</span><span>예상</span><span>이전</span><span>남은 시간</span></div>
  <div className="mc-results" aria-live="polite">
   {loadState!=='ready'&&<p className="mc-data-state">{loadState==='loading'?'공식 일정 저장본 확인 중':'공식 일정 저장본 조회 실패'} · 수동 확인 자료와 분리하여 표시합니다.</p>}
   {loadState==='ready'&&feed?.status!=='READY'&&<p className="mc-data-state">공식 일정 저장본 미확정 · 기존 확인 자료는 확인일 기준으로 표시합니다.</p>}
   {!filtered.length&&<div className="mc-empty"><strong>{activeDate?'선택한 날짜에 일정이 없습니다.':'표시할 일정이 없습니다.'}</strong><span>{kind==='earnings'?'기업 실적 발표일은 검증된 수집 경로가 연결되지 않았습니다.':country==='KR'?'한국 공식 발표 일정은 수집 경로 연결 전입니다.':'해당 조건에 확인된 공식 발표 일정이 없습니다.'}</span></div>}
   {byWeek.map(([weekStart,rows])=><div key={weekStart}>
    <div className="mc-week"><strong>{activeDate?`${Number(activeDate.slice(5,7))}월 ${Number(activeDate.slice(8,10))}일`:weekTitle(weekStart)}</strong><span>{rows.length}개 일정</span></div>
    {rows.map((row,index)=>{const remain=remaining(row);const firstOfDay=rows.findIndex(item=>item.date===row.date)===index;return <article key={row.key} id={firstOfDay?`mc-day-${row.date}`:undefined} className="mc-row">
     <div className="mc-importance" role="img" aria-label={`중요도 별 ${row.importance}개`} title={`ZGMINI 예상 시장 영향도 ${row.importance}단계`}>{Array.from({length:row.importance},(_,i)=><Star key={i} size={13} strokeWidth={1.5} fill="currentColor" aria-hidden="true"/>)}</div>
     <div className="mc-date">{dateCaption(row.date)} <small>{dayLabels[parseDay(row.date).getUTCDay()]}</small></div>
     <time className="mc-time" dateTime={row.at??row.date}>{row.at?kstTime(row.at):'미정'}</time>
     <span className="mc-country">{row.country==='US'?'미국':'한국'}</span>
     <div className="mc-event"><a href={row.sourceUrl} target="_blank" rel="noopener noreferrer" title="공식 발표 일정 출처로 이동">{row.name}</a><span className={`mc-tag-status ${row.status==='released'?'released':''}`}>{row.status==='released'?'확인된 발표값':row.fresh?'공식 저장':'확인일 기준'}</span><small className="mc-source">{row.category} · {row.source} · {row.checkedAt?`확인 ${row.checkedAt.slice(0,10)}`:'확인일 미제공'}</small></div>
     <div className="mc-number" data-kind="actual"><span className="mc-mobile-label">발표</span>{row.actual??'—'}</div>
     <div className="mc-number muted" data-kind="forecast"><span className="mc-mobile-label">예상</span>{row.forecast??'—'}</div>
     <div className="mc-number muted" data-kind="previous"><span className="mc-mobile-label">이전</span>{row.previous??'—'}</div>
     <div className={`mc-remaining ${remain.style}`} aria-label={`남은 시간: ${remain.label}`}>{remain.label}</div>
    </article>;})}
   </div>)}
  </div>
 </section>;
}
