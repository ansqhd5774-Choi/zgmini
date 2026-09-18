"use client";
import {useMemo,useState} from 'react';
import {LineChart,Line,ResponsiveContainer,Tooltip,XAxis,YAxis,CartesianGrid} from 'recharts';
import {useKoreaFunds,type Composite} from './korea-funds-store';
import {DEFAULT_KOREA_MARKET_PERIOD,getMarketPeriodConfig,getMarketPeriodDays,type MarketPeriod} from './market-card-shared';
import {MarketPeriodControls} from './market-period-controls';
import {FearGreedCardShell} from './fear-greed-card-shell';
import {MarketCardInsight} from './market-card-insight';
import {MarketFearGreedChart,type MarketFearGreedChartPoint,type MarketFearGreedChartValidPoint} from './market-fear-greed-chart';

export const formatDate=(s:string|null)=>s?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:'—';
const time=(d:string)=>Date.parse(`${formatDate(d)}T00:00:00Z`);
const colors:Record<string,string>={EXTREME_FEAR:'#b91c1c',FEAR:'#dc2626',NEUTRAL:'#64748b',GREED:'#15803d',EXTREME_GREED:'#166534'};

const periodComparisonLabels:Record<MarketPeriod,string>={
 "1W":"1주 대비",
 "1M":"1개월 대비",
 "3M":"3개월 대비",
 "6M":"6개월 대비",
 "1Y":"1년 대비",
};

function cardDate(value:string|null|undefined){
 if(!value||!/^\d{8}$/.test(value))return '—';
 const date=new Date(`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T00:00:00Z`);
 return Number.isFinite(date.getTime())
  ?new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeZone:'Asia/Seoul'}).format(date)
  :'—';
}

function normalizeCompositeHistory(history:Composite['history']):Array<MarketFearGreedChartPoint&{time:number}>{
 return history.flatMap(point=>{
  if(!/^\d{8}$/.test(point.date))return [];
  const pointTime=time(point.date);
  if(!Number.isFinite(pointTime))return [];
  const score=typeof point.score==='number'&&Number.isFinite(point.score)&&point.score>=0&&point.score<=100
   ?point.score
   :null;
  return [{date:point.date,time:pointTime,score}];
 }).sort((a,b)=>a.time-b.time);
}

function validHistory(points:ReturnType<typeof normalizeCompositeHistory>){
 return points.filter((point):point is MarketFearGreedChartValidPoint&{time:number}=>typeof point.score==='number');
}

function previousHistoryBaseline(points:ReturnType<typeof normalizeCompositeHistory>,observationDate:string|null|undefined){
 if(!observationDate)return null;
 const observedTime=time(observationDate);
 if(!Number.isFinite(observedTime))return null;
 let candidate:number|null=null;
 for(const point of points){
  if(point.time>=observedTime)break;
  if(typeof point.score==='number')candidate=point.score;
 }
 return candidate;
}

function targetPeriodTime(observationDate:string|null|undefined,period:MarketPeriod){
 if(!observationDate)return null;
 const date=new Date(time(observationDate));
 if(!Number.isFinite(date.getTime()))return null;
 if(period==='1W')date.setUTCDate(date.getUTCDate()-7);
 else if(period==='1M')date.setUTCMonth(date.getUTCMonth()-1);
 else if(period==='3M')date.setUTCMonth(date.getUTCMonth()-3);
 else if(period==='6M')date.setUTCMonth(date.getUTCMonth()-6);
 else date.setUTCMonth(date.getUTCMonth()-12);
 return date.getTime();
}

function historicalBaseline(points:ReturnType<typeof normalizeCompositeHistory>,targetTime:number|null){
 if(targetTime===null)return null;
 let candidate:number|null=null;
 for(const point of points){
  if(point.time>targetTime)break;
  if(typeof point.score==='number')candidate=point.score;
 }
 return candidate;
}

function samplePoints<T>(points:T[],count:number){
 if(points.length<=count)return points;
 if(count<=1)return [points[points.length-1]];
 const selected:T[]=[],seen=new Set<number>();
 for(let index=0;index<count;index+=1){
  const pointIndex=Math.round(index*(points.length-1)/(count-1));
  if(seen.has(pointIndex))continue;
  seen.add(pointIndex);
  selected.push(points[pointIndex]);
 }
 return selected;
}

function buildKoreaAxisTicks(points:ReturnType<typeof normalizeCompositeHistory>,period:MarketPeriod){
 const labels=new Map<string,string>();
 if(points.length===0)return {ticks:[] as string[],labels};
 const add=(point:(typeof points)[number],label:string)=>labels.set(point.date,label);

 if(period==='1W'||period==='1M'){
  for(const point of samplePoints(points,period==='1W'?4:5))add(point,`${point.date.slice(4,6)}.${point.date.slice(6,8)}`);
  return {ticks:[...labels.keys()],labels};
 }

 const groups=new Map<string,{year:number;month:number;monthText:string;point:(typeof points)[number]}>();
 for(const point of points){
  const year=Number(point.date.slice(0,4)),month=Number(point.date.slice(4,6)),monthText=point.date.slice(4,6);
  const key=`${year}-${monthText}`;
  if(!groups.has(key))groups.set(key,{year,month,monthText,point});
 }
 const monthly=[...groups.values()];
 if(period==='3M'||period==='6M'){
  const selected=period==='6M'?monthly.slice(-6):monthly;
  selected.forEach(group=>add(group.point,group.monthText));
  return {ticks:[...labels.keys()],labels};
 }

 const selectedIndexes=new Set<number>([0,monthly.length-1]);
 for(let index=2;index<monthly.length-1;index+=2)selectedIndexes.add(index);
 const latestYear=monthly.at(-1)?.year;
 monthly.forEach((group,index)=>{if(group.month===12&&latestYear&&group.year<latestYear)selectedIndexes.add(index);});
 [...selectedIndexes].sort((a,b)=>a-b).forEach(index=>{
  const group=monthly[index];
  if(group)add(group.point,group.month===12&&latestYear&&group.year<latestYear?`${String(group.year).slice(-2)}.12`:group.monthText);
 });
 return {ticks:[...labels.keys()],labels};
}

function componentModelLabel(composite:Composite|null){
 if(!composite)return '한국 V2 모델';
 if(composite.fallbackApplied)return 'V2 자료 대기 · V1 2요소 대체값';
 if(composite.methodologyVersion==='kr-fg-2f-cs-2.0.0'){
  const leverage=composite.components.find(component=>component.id==='KR_LEVERAGE_INTENSITY_Z252_E50');
  const liquidation=composite.components.find(component=>component.id==='KR_LIQUIDATION_LOG_Z252_INV_E50');
  const penalty=composite.components.find(component=>component.id==='KR_CORPORATE_STRESS_PENALTY');
  if(leverage&&liquidation&&penalty)return `신용융자·반대매매 ${Math.round(leverage.weight*100)}/${Math.round(liquidation.weight*100)} + 기업스트레스 최대 10점 감점`;
  return '한국 V2 기업스트레스 감점 모델';
 }
 const credit=composite.components.find(component=>component.id==='LEV_BLEND20_60');
 const liquidation=composite.components.find(component=>component.id==='L3_PRESSURE_P252');
 if(!credit||!liquidation)return '한국 V1 2요소 모델';
 return `V1 신용융자 ${Math.round(credit.weight*100)}%·반대매매 역점수 ${Math.round(liquidation.weight*100)}%`;
}

function buildKoreaInsight({
 composite,
 dayDelta,
 periodDelta,
 periodLabel,
 loading,
}:{
 composite:Composite|null;
 dayDelta:number|null;
 periodDelta:number|null;
 periodLabel:string;
 loading:boolean;
}){
 if(loading)return '한국 V2 투자심리 데이터를 확인하고 있습니다.';
 if(!composite||typeof composite.displayScore!=='number'){
  if(composite?.status==='WARMUP')return '한국 V2 모델의 계산 준비기간입니다.';
  return '한국 V2 모델의 공통 관측값을 확인할 수 없습니다.';
 }

 const model=componentModelLabel(composite);
 const stage=composite.stageLabel??'확인 불가';
 if(composite.status==='STALE')return `${model} 기준 ${stage} 구간이며 최신 공통 관측일 갱신이 지연되고 있습니다.`;

 const periodName=periodLabel.replace(' 대비','');
 const dayDown=dayDelta!==null&&dayDelta<-0.05,dayUp=dayDelta!==null&&dayDelta>0.05;
 const periodDown=periodDelta!==null&&periodDelta<-0.05,periodUp=periodDelta!==null&&periodDelta>0.05;

 if(dayDown&&periodDown)return `${model} 기준 ${stage} 구간이며 이전 관측과 ${periodName} 흐름이 모두 약화됐습니다.`;
 if(dayUp&&periodUp)return `${model} 기준 ${stage} 구간이며 이전 관측과 ${periodName} 흐름이 모두 개선됐습니다.`;
 if(dayUp&&periodDown)return `${model} 기준 ${stage} 구간입니다. 이전 관측 대비 반등했지만 ${periodName} 흐름은 약세입니다.`;
 if(dayDown&&periodUp)return `${model} 기준 ${stage} 구간입니다. 이전 관측 대비 약화됐지만 ${periodName} 흐름은 개선됐습니다.`;
 if(dayDown)return `${model} 기준 ${stage} 구간에서 이전 관측 대비 심리가 약화됐습니다.`;
 if(dayUp)return `${model} 기준 ${stage} 구간에서 이전 관측 대비 심리가 개선됐습니다.`;
 if(periodDown)return `${model} 기준 ${stage} 구간이며 ${periodName} 흐름은 약화된 상태입니다.`;
 if(periodUp)return `${model} 기준 ${stage} 구간이며 ${periodName} 흐름은 개선된 상태입니다.`;
 return `${model} 기준 ${stage} 구간에서 뚜렷한 방향 변화는 확인되지 않습니다.`;
}

type CompositeChartProps = {
 item: Composite;
 mini?: boolean;
 slot?: boolean;
 period?: MarketPeriod;
 initialPeriod?: MarketPeriod;
 onPeriodChange?: (period: MarketPeriod) => void;
 showControls?: boolean;
};

export function CompositeChart({
 item,
 mini=false,
 slot=false,
 period,
 initialPeriod=DEFAULT_KOREA_MARKET_PERIOD,
 onPeriodChange,
 showControls=!slot,
}:CompositeChartProps){
 const [internalPeriod,setInternalPeriod]=useState<MarketPeriod>(initialPeriod);
 const activePeriod=period??internalPeriod;
 const activeDays=getMarketPeriodDays(activePeriod);
 const end=item.history.at(-1)?.date;
 const rows=item.history
  .filter(p=>end&&time(p.date)>=time(end)-activeDays*86400000)
  .map(p=>({...p,time:time(p.date)}));

 const handlePeriodChange=(nextPeriod:MarketPeriod)=>{
  if(onPeriodChange) onPeriodChange(nextPeriod);
  else setInternalPeriod(nextPeriod);
 };

 const chart=<ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}><LineChart data={rows} accessibilityLayer margin={{top:8,right:8,left:mini?0:-20,bottom:4}}>
   {!mini&&<CartesianGrid vertical={false} stroke="var(--zg-chart-grid,#365269)" strokeDasharray="3 5" strokeWidth={1}/>}<XAxis hide={mini} type="number" dataKey="time" domain={['dataMin','dataMax']} tickFormatter={v=>new Date(v).toISOString().slice(0,10)} minTickGap={40} axisLine={{stroke:'var(--zg-chart-axis,#60798d)',strokeWidth:1}} tickLine={false} tick={{fontSize:11,fill:"var(--zg-text-meta,#8fa8bb)"}}/><YAxis hide={mini} axisLine={false} tickLine={false} domain={[0,100]} ticks={[0,50,100]} tick={{fontSize:11,fill:"var(--zg-text-meta,#8fa8bb)"}}/>
   <Tooltip content={({active,payload})=>{const p=payload?.[0]?.payload;return active&&p?<div className="rounded border bg-white p-2 text-sm text-slate-900">{formatDate(p.date)}<br/>{p.displayScore===null?'자료 없음':`${p.displayScore.toFixed(1)}점 · ${p.stageLabel}`}</div>:null;}}/>
   <Line type="linear" dataKey="score" stroke={colors[item.stageCode??'']??'#64748b'} dot={false} connectNulls={false} isAnimationActive={false}/>
  </LineChart></ResponsiveContainer>;

 if(slot){
  return <div className="fg-chart-renderer" aria-label="한국 공포탐욕 추이 0~100점">{chart}</div>;
 }

 return <div className="min-w-0">
  {!mini&&showControls&&<MarketPeriodControls activeKey={activePeriod} onChange={handlePeriodChange} ariaLabel="한국 공포탐욕 차트 기간"/>}
  <div className={`korea-composite-chart-host ${mini?'is-mini':'is-detail'}`} aria-label="한국 공포탐욕 추이 0~100점">{chart}</div>
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
  {c?.status==='STALE'&&<p role="status" className="mt-2 text-sm text-amber-700">{c.fallbackApplied?'V2 입력자료를 확인할 수 없어 V1 대체값을 표시합니다.':`갱신 대기 · ${c.staleReason?.includes('COMMON_DATE_LAG')?'구성자료의 관측일이 달라 최근 공통일을 표시합니다.':'자료가 지연되거나 조회되지 않아 과거 유효값을 표시합니다.'}`}</p>}
  {c&&<CompositeChart item={c} mini={!detail}/>}
  {detail&&<><p className="mt-5 text-sm">{c?.briefMethodology??'신용융자/투자자예탁금과 실제 반대매매금액을 50%씩 반영하고 기업스트레스 급증 시 최대 10점을 감점하는 V2 지수입니다.'}</p><p className="mt-3 text-sm">기업스트레스는 부도·영업정지·회생·해산·채권은행 관리절차 공시가 평상보다 증가할 때만 감점하며, 공시가 적다는 이유만으로 탐욕 점수를 추가하지 않습니다.</p><p className="mt-3 text-xs">과거 점수는 현재 확보한 원자료로 재구성한 이력입니다. 당시 공표시점·빈티지는 검증되지 않았습니다.</p></>}
 </div>;
}

export function KoreanCountryCard(){
 const {composite:c,loading}=useKoreaFunds();
 const [selectedPeriod,setSelectedPeriod]=useState<MarketPeriod>(DEFAULT_KOREA_MARKET_PERIOD);
 const valid=typeof c?.displayScore==='number'&&Number.isFinite(c.displayScore);
 const allHistory=useMemo(()=>normalizeCompositeHistory(c?.history??[]),[c?.history]);
 const observedTime=c?.observationDate?time(c.observationDate):null;
 const chartHistory=useMemo(()=>{
  if(observedTime===null||!Number.isFinite(observedTime))return allHistory;
  const days=getMarketPeriodConfig(selectedPeriod).days;
  return allHistory.filter(point=>point.time<=observedTime&&point.time>=observedTime-days*86400000);
 },[allHistory,observedTime,selectedPeriod]);

 const dayBaseline=useMemo(
  ()=>previousHistoryBaseline(allHistory,c?.observationDate),
  [allHistory,c?.observationDate],
 );
 const periodBaseline=useMemo(
  ()=>historicalBaseline(allHistory,targetPeriodTime(c?.observationDate,selectedPeriod)),
  [allHistory,c?.observationDate,selectedPeriod],
 );
 const score=valid?c!.displayScore!:null;
 const dayDelta=score!==null&&dayBaseline!==null?score-dayBaseline:null;
 const periodDelta=score!==null&&periodBaseline!==null?score-periodBaseline:null;
 const periodLabel=periodComparisonLabels[selectedPeriod];
 const latestHistoryPoint=validHistory(chartHistory).at(-1)??null;
 const chartAxis=useMemo(()=>buildKoreaAxisTicks(chartHistory,selectedPeriod),[chartHistory,selectedPeriod]);
 const insight=buildKoreaInsight({composite:c,dayDelta,periodDelta,periodLabel,loading});
 const source=c?.sourceAttribution??'ZGmini 한국 V2 자체 산출';

 return <FearGreedCardShell
  className="korea-target-card"
  layoutVariant="shared"
  testId="kr-composite"
  marketState={loading?'loading':!c?'empty':valid?c.status.toLowerCase():'unavailable'}
  busy={loading}
  header={{
   flag:"/flags/kr.svg",
   eyebrow:"ZGMINI KOREA FEAR & GREED",
   title:"한국 시장",
   description:"KOSPI · 신용융자·반대매매·기업스트레스",
   dateLabel:"관측 기준일",
   date:cardDate(c?.observationDate),
   source,
   rightContent:<MarketCardInsight text={insight}/>,
  }}
  score={{
   value:loading||score===null?'—':score.toFixed(1),
   state:loading?'확인 중':valid?(c!.stageLabel??'확인 불가'):c?.status==='WARMUP'?'준비 중':'확인 불가',
   caption:"",
   variant:"hero",
   dayDelta,
   periodDelta,
   periodLabel,
   metaDate:cardDate(c?.observationDate),
   dayLabel:"이전 대비",
   comparisonAriaLabel:"한국 공포탐욕 변화량",
  }}
  period={<MarketPeriodControls
   activeKey={selectedPeriod}
   onChange={setSelectedPeriod}
   ariaLabel="한국 공포탐욕 차트 기간"
  />}
  chart={<MarketFearGreedChart
   data={chartHistory}
   axisTicks={chartAxis.ticks}
   axisLabels={chartAxis.labels}
   latestPoint={latestHistoryPoint}
   instanceKey={`kr-${selectedPeriod}`}
   gradientId="korea-fg-fill"
   formatTooltipLabel={value=>formatDate(value)}
   emptyLabel={loading?'확인 중':c?.status==='WARMUP'?'계산 준비 중':'공통 관측 이력 없음'}
  />}
  footer={{
   href:"/fear-greed/korea/",
   label:"자세히",
   ariaLabel:"한국 공포탐욕지수 상세보기",
   children:source,
  }}
 />;
}
