"use client";
import {Gauge,ShieldCheck,ArrowUpRight} from 'lucide-react';
import {useState} from 'react';
import {LineChart,Line,ResponsiveContainer,Tooltip,XAxis,YAxis,CartesianGrid} from 'recharts';
import {useKoreaFunds,type Composite} from './korea-funds-store';
import {marketPeriodDays} from './market-card-shared';
import {MarketPeriodControls} from './market-period-controls';
import {MarketCardHeader} from './market-card-header';
export const formatDate=(s:string|null)=>s?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:'—';
const time=(d:string)=>Date.parse(`${formatDate(d)}T00:00:00Z`);
const marketPeriodsKey=(days:number)=>({7:'1w',30:'1m',90:'3m',180:'6m',365:'1y'} as Record<number,string>)[days]??'3m';
const colors:Record<string,string>={EXTREME_FEAR:'#b91c1c',FEAR:'#dc2626',NEUTRAL:'#64748b',GREED:'#15803d',EXTREME_GREED:'#166534'};
export function CompositeChart({item,mini=false,height}:{item:Composite;mini?:boolean;height?:number}){
 const [days,setDays]=useState(90),end=item.history.at(-1)?.date;
 const rows=item.history.filter(p=>end&&time(p.date)>=time(end)-days*86400000).map(p=>({...p,time:time(p.date)}));
 return <div className="min-w-0">
  {!mini&&<MarketPeriodControls activeKey={marketPeriodsKey(days)} onChange={(key)=>setDays(marketPeriodDays.find(([n])=>String(n)===key)?.[0]??days)} ariaLabel="한국 공포탐욕 차트 기간"/>}
  <div style={{height:height??(mini?64:240)}} aria-label="한국 공포탐욕 추이 0~100점"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} accessibilityLayer margin={{top:8,right:8,left:mini?0:-20,bottom:4}}>
   {!mini&&<CartesianGrid vertical={false} stroke="var(--zg-chart-grid,#365269)" strokeDasharray="3 5" strokeWidth={1}/>}<XAxis hide={mini} type="number" dataKey="time" domain={['dataMin','dataMax']} tickFormatter={v=>new Date(v).toISOString().slice(0,10)} minTickGap={40} axisLine={{stroke:'var(--zg-chart-axis,#60798d)',strokeWidth:1}} tickLine={false} tick={{fontSize:11,fill:"var(--zg-text-meta,#8fa8bb)"}}/><YAxis hide={mini} axisLine={false} tickLine={false} domain={[0,100]} ticks={[0,50,100]} tick={{fontSize:11,fill:"var(--zg-text-meta,#8fa8bb)"}}/>
   <Tooltip content={({active,payload})=>{const p=payload?.[0]?.payload;return active&&p?<div className="rounded border bg-white p-2 text-sm text-slate-900">{formatDate(p.date)}<br/>{p.displayScore===null?'자료 없음':`${p.displayScore.toFixed(1)}점 · ${p.stageLabel}`}</div>:null;}}/>
   <Line type="linear" dataKey="score" stroke={colors[item.stageCode??'']??'#64748b'} dot={false} connectNulls={false} isAnimationActive={false}/>
  </LineChart></ResponsiveContainer></div>
  {!mini&&<p className="text-xs text-slate-500">제공 구간 {formatDate(rows[0]?.date??null)} ~ {formatDate(rows.at(-1)?.date??null)} · 실제 제공 이력만 표시</p>}
 </div>;
}
export function KoreaCompositeView({detail=false}:{detail?:boolean}){
 const {composite:c,loading}=useKoreaFunds();
 const valid=c?.displayScore!==null&&typeof c?.displayScore==='number';
 return <div className="min-w-0" data-testid="kr-composite" aria-busy={loading}>
  <p className="mt-1 text-sm text-slate-600">ZGmini 자체 산출 · 베타</p>
  <div className="my-5 min-h-12" aria-live="polite"><strong className="text-5xl font-black text-slate-950">{valid?c!.displayScore!.toFixed(1):'—'}</strong><span className="ml-3 text-sm font-bold" style={{color:colors[c?.stageCode??'']??'#64748b'}}>{valid?c!.stageLabel:loading?'확인 중':c?.status==='WARMUP'?'준비기간':'확인 불가'}</span></div>
  {valid&&<div role="meter" aria-label="한국 공포·탐욕지수" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c!.displayScore!} className="h-2 overflow-hidden rounded bg-slate-200"><div className="h-full" style={{width:`${c!.displayScore}%`,background:colors[c!.stageCode??'']}}/></div>}
  <p className="mt-3 text-xs text-slate-600">관측 기준일 {formatDate(c?.observationDate??null)}</p>
  <p className="mt-2 text-sm text-slate-700">이전 관측 대비 {c?.changePoints!=null?`${c.changePoints>=0?'+':''}${c.changePoints.toFixed(1)}점 (${formatDate(c.previousObservationDate)})`:'비교 자료 없음'}</p>
  {c?.status==='STALE'&&<p role="status" className="mt-2 text-sm text-amber-700">갱신 대기 · {c.staleReason?.includes('COMMON_DATE_LAG')?'두 구성지표의 관측일이 달라 최근 공통일을 표시합니다.':'자료가 지연되거나 조회되지 않아 과거 유효값을 표시합니다.'}</p>}
  {c&&<CompositeChart item={c} mini={!detail}/>}
  {detail&&<><p className="mt-5 text-sm">{c?.briefMethodology??'신용융자 확대 정도와 반대매매 압력의 역점수를 각 50% 반영한 2요소 베타 지수입니다.'}</p><p className="mt-3 text-sm">신용융자·반대매매 기반 지표로, 한국 주식시장 전체의 심리를 완전히 대표하지 않습니다. 낮은 반대매매 압력 자체가 적극적인 매수심리를 뜻하지는 않습니다.</p><p className="mt-3 text-xs">과거 점수는 현재 자료로 재구성한 이력입니다. 당시 공표시점·빈티지는 검증되지 않았습니다.</p></>}
 </div>;
}

export function KoreanCountryCard(){
 const {composite:c,loading}=useKoreaFunds();
 const color=colors[c?.stageCode??'']??'#64748b';
 const valid=typeof c?.displayScore==='number';
 return <article className="cnn-reference-panel korea-reference-panel" data-testid="kr-composite" data-market-state={loading?'loading':!c?'empty':valid?'ready':'unavailable'} aria-busy={loading}>
  <MarketCardHeader flag="/flags/kr.svg" eyebrow="ZGMINI KOREA SENTIMENT" title="한국 시장" description="KOSPI · 국내 투자심리" dateLabel="관측 기준일" date={formatDate(c?.observationDate??null)} source={loading?'확인 중':valid?'검증된 지수':'자체 산출 · 베타'}/>
  <div className="cnn-panel-main"><div className={`cnn-score-orb ${valid?`is-${(c?.stageCode??'').toLowerCase().replace('extreme_','')}`:''}`}><Gauge size={22}/><strong>{valid?c!.displayScore!.toFixed(1):'—'}</strong><span>{valid?c!.stageLabel:loading?'확인 중':'자료 준비 중'}</span><small>한국 공포 ↔ 탐욕</small></div><div className="cnn-trend-block"><div className="cnn-trend-toolbar"><span>한국 지수 추이</span><span>0 — 100</span></div>{c?<CompositeChart item={c} mini={false} height={166}/>:<div className="cnn-chart is-empty"><div className="cnn-chart-empty"><ShieldCheck size={18}/><span>공통 관측 자료를 확인 중입니다.</span></div></div>}</div></div>
  <div className="cnn-panel-note"><ShieldCheck size={16}/><span>신용융자와 반대매매 압력을 결합한 ZGmini 내부 산출값입니다.</span><a href="/fear-greed/korea/" aria-label="한국 공포탐욕지수 상세보기">상세 보기 <ArrowUpRight size={14}/></a></div>
 </article>;
}
