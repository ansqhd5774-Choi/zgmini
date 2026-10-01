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
  const visibleScore=typeof point.displayScore==='number'&&Number.isFinite(point.displayScore)
   ?point.displayScore
   :point.score;
  const score=typeof visibleScore==='number'&&Number.isFinite(visibleScore)&&visibleScore>=0&&visibleScore<=100
   ?visibleScore
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
 if(!composite)return '한국 Revision 7';
 return composite.methodologyVersion==='kr-fg-cnn-r7-1.0.0'
  ?'한국 시장 투자심리'
  :'한국 Revision 7';
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
 if(loading)return '한국 Revision 7 투자심리 데이터를 확인하고 있습니다.';
 if(!composite||typeof composite.displayScore!=='number'){
  if(composite?.status==='WARMUP')return '한국 Revision 7 모델의 계산 준비기간입니다.';
  return '한국 Revision 7 모델의 유효 관측값을 확인할 수 없습니다.';
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
  {c?.status==='STALE'&&<p role="status" className="mt-2 text-sm text-amber-700">갱신 대기 · Revision 7의 최근 유효 관측값을 표시합니다.</p>}
  {c&&<CompositeChart item={c} mini={!detail}/>}
  {detail&&<>
  <p className="mt-3 text-xs">과거 점수는 현재 확보한 원자료로 재구성한 이력이며 당시 point-in-time 빈티지는 검증되지 않았습니다. 현재는 연구용 베타입니다.</p>
  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
   <span className="font-semibold text-slate-700">데이터 출처</span>
   <a className="text-blue-700 underline" href="https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd" aria-label="한국거래소 KRX Data Marketplace 원본 페이지 열기">KRX 원본 ↗</a>
   <a className="text-blue-700 underline" href="https://ecos.bok.or.kr/" aria-label="한국은행 ECOS 원본 페이지 열기">ECOS 원본 ↗</a>
  </div>
 </>}
 </div>;
}

export function KoreanCountryCard({detail=false}:{detail?:boolean}={}){
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
 const source=c?.sourceAttribution??'한국거래소 통계정보 · 한국은행 ECOS · ZGmini 자체 가공';

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
   description:"KOSPI · 시장 투자심리",
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
   href:detail?"https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd":"/fear-greed/korea/",
   label:detail?"KRX 원본":"자세히",
   ariaLabel:detail?"한국거래소 KRX Data Marketplace 원본 페이지 열기":"한국 공포탐욕지수 상세보기",
   children:source,
  }}
 />;
}


const koreaScoreGuide=[
 {range:"0–<25",label:"극심한 공포"},
 {range:"25–<45",label:"공포"},
 {range:"45–55",label:"중립"},
 {range:">55–75",label:"탐욕"},
 {range:">75–100",label:"극심한 탐욕"},
] as const;

const koreaDetailDefinitions=[
 {id:"momentum",title:"모멘텀",question:"한국 시장의 추세는 얼마나 강한가?",meaning:"가격 흐름과 추세 강도를 0~100으로 정규화해 현재 시장 모멘텀을 봅니다.",fearDirection:"추세 약화",greedDirection:"추세 강화"},
 {id:"strength",title:"시장 강도",question:"상승 종목의 힘이 하락 종목보다 우세한가?",meaning:"시장 내부의 상승·하락 강도를 비교해 위험선호가 얼마나 퍼져 있는지 확인합니다.",fearDirection:"하락 강도 우세",greedDirection:"상승 강도 우세"},
 {id:"breadth",title:"시장 폭",question:"상승 참여가 시장 전반으로 퍼지고 있는가?",meaning:"일부 종목이 아니라 시장 전체의 참여 폭이 넓어지는지 정규화 점수로 확인합니다.",fearDirection:"상승 참여 축소",greedDirection:"상승 참여 확대"},
 {id:"putCall",title:"풋/콜",question:"옵션 수요는 방어와 위험선호 중 어디에 가까운가?",meaning:"풋·콜 수요의 상대적 위치를 이용해 투자자의 방어 심리와 위험선호를 측정합니다.",fearDirection:"풋 수요 상대 우세",greedDirection:"콜 수요 상대 우세"},
 {id:"volatility",title:"변동성",question:"시장 변동성은 안정되고 있는가?",meaning:"시장 변동성의 상대 수준을 0~100으로 정규화해 불안과 안정 정도를 확인합니다.",fearDirection:"변동성 확대",greedDirection:"변동성 안정"},
 {id:"safeHaven",title:"안전자산 선호",question:"투자자는 위험자산보다 안전자산을 더 선호하는가?",meaning:"안전자산 선호의 상대 강도를 통해 위험회피 심리가 커지는지 확인합니다.",fearDirection:"안전자산 선호 확대",greedDirection:"위험자산 선호 확대"},
 {id:"junkBond",title:"신용 스프레드",question:"신용위험에 대한 경계가 커지고 있는가?",meaning:"신용 스프레드의 상대 위치를 통해 시장이 위험을 얼마나 감수하는지 측정합니다.",fearDirection:"스프레드 확대",greedDirection:"스프레드 축소"},
] as const;

function koreaStageFromScore(score:number|null|undefined){
 if(typeof score!=="number"||!Number.isFinite(score))return "확인 필요";
 if(score<25)return "극심한 공포";
 if(score<45)return "공포";
 if(score<=55)return "중립";
 if(score<=75)return "탐욕";
 return "극심한 탐욕";
}

function koreaToneFromScore(score:number|null|undefined){
 const stage=koreaStageFromScore(score);
 return stage.includes("공포")?"fear":stage.includes("탐욕")?"greed":"neutral";
}

export function KoreaDetailPanel(){
 const {composite:c,indicators,loading}=useKoreaFunds();
 const indicatorMap=new Map(indicators.map(item=>[item.id,item]));
 const readyCount=koreaDetailDefinitions.filter(definition=>indicatorMap.get(definition.id)?.status==="READY").length;
 const compositeScore=typeof c?.displayScore==="number"&&Number.isFinite(c.displayScore)?c.displayScore:null;

 return <>
  <KoreanCountryCard detail/>

  <section className="cnn-education-panel" aria-labelledby="korea-education-title">
   <header className="cnn-education-header">
    <div>
     <p className="cnn-eyebrow">LEARN THE 7 COMPONENTS</p>
     <h1 id="korea-education-title">한국 공포·탐욕지수를 숫자로 이해하기</h1>
     <p>종합점수만 보지 않고, 한국 Revision 7을 구성하는 7개 시장심리 요소를 각각 확인합니다.</p>
    </div>
    <div className="cnn-education-status" aria-label="확인된 한국 구성요소 수">
     <strong>{loading?"—":`${readyCount}/7`}</strong>
     <span>현재 확인된 구성요소</span>
    </div>
   </header>

   <div className="cnn-method-strip">
    <div><strong>시장 원자료</strong><span>KRX·ECOS 기반 저장 데이터</span></div>
    <b aria-hidden="true">→</b>
    <div><strong>구성요소 정규화</strong><span>각 요소를 0~100 점수로 환산</span></div>
    <b aria-hidden="true">→</b>
    <div><strong>Revision 7 종합</strong><span>낮을수록 공포 · 높을수록 탐욕</span></div>
   </div>

   <div className="cnn-composite-formula" aria-label="한국 공포탐욕 Revision 7 구성요소와 종합점수">
    <div><span>구성요소</span><strong>{loading?"—":`${readyCount}/7`}</strong></div>
    <b aria-hidden="true">→</b>
    <div><span>모델 버전</span><strong>R7</strong></div>
    <b aria-hidden="true">↔</b>
    <div className="is-total"><span>현재 종합점수</span><strong>{compositeScore===null?"—":compositeScore.toFixed(1)}</strong></div>
   </div>
   <p className="cnn-composite-caption">현재 공개 API는 구성요소별 정규화 점수와 이력은 제공하지만 각 지표의 원시 입력값은 노출하지 않습니다. 원시값을 임의 생성하지 않고 저장·공개된 점수만 표시합니다.</p>

   <p className="cnn-scale-note"><strong>중요:</strong> 각 구성요소 점수는 서로 다른 시장 데이터를 0~100 척도로 정규화한 값입니다. 개별 점수 하나만으로 매수·매도를 판단하지 않고 종합점수와 변화 방향을 함께 봅니다.</p>

   <div className="cnn-score-guide" aria-label="한국 공포탐욕 점수 해석 구간">
    {koreaScoreGuide.map(item=><span key={item.range}><b>{item.range}</b><small>{item.label}</small></span>)}
   </div>

   <section className="cnn-component-overview" aria-labelledby="korea-component-overview-title">
    <div className="cnn-component-overview-head">
     <div>
      <p className="cnn-eyebrow">CURRENT COMPONENT SNAPSHOT</p>
      <h2 id="korea-component-overview-title">7개 구성요소 한눈에 보기</h2>
     </div>
     <span>현재 점수 → 이전 대비 → 현재 상태 순서로 읽으세요.</span>
    </div>
    <div className="cnn-component-overview-list" role="list">
     {koreaDetailDefinitions.map((definition,index)=>{
      const indicator=indicatorMap.get(definition.id);
      return <div className="cnn-component-overview-row" data-tone={koreaToneFromScore(indicator?.score)} role="listitem" key={definition.id}>
       <div className="cnn-component-overview-name"><span>{String(index+1).padStart(2,"0")}</span><strong>{definition.title}</strong></div>
       <div className="cnn-component-overview-value"><small>현재 점수</small><strong>{typeof indicator?.score==="number"?indicator.score.toFixed(1):"—"}</strong></div>
       <div className="cnn-component-overview-score"><small>이전 대비</small><strong>{typeof indicator?.changePoints==="number"?`${indicator.changePoints>=0?"+":""}${indicator.changePoints.toFixed(1)}`:"—"}</strong></div>
       <div className="cnn-component-overview-rating"><small>현재 상태</small><strong>{koreaStageFromScore(indicator?.score)}</strong></div>
      </div>;
     })}
    </div>
   </section>

   <div className="cnn-component-education-grid">
    {koreaDetailDefinitions.map((definition,index)=>{
     const indicator=indicatorMap.get(definition.id);
     const score=typeof indicator?.score==="number"&&Number.isFinite(indicator.score)?indicator.score:null;
     const tone=koreaToneFromScore(score);
     const change=typeof indicator?.changePoints==="number"&&Number.isFinite(indicator.changePoints)?indicator.changePoints:null;
     return <article className="cnn-education-card" key={definition.id} data-tone={tone} data-layout={index===koreaDetailDefinitions.length-1?"wide":"standard"}>
      <div className="cnn-education-card-head">
       <span className="cnn-component-number">{String(index+1).padStart(2,"0")}</span>
       <div><h2>{definition.title}</h2><p>{definition.question}</p></div>
       <span className="cnn-component-rating">{koreaStageFromScore(score)}</span>
      </div>

      <p className="cnn-component-meaning">{definition.meaning}</p>

      <div className="cnn-component-metrics">
       <div><span>현재 원시값</span><strong>API 미노출</strong></div>
       <div><span>관측 기준일</span><strong>{formatDate(indicator?.observationDate??null)}</strong></div>
       <div><span>이전 대비</span><strong>{change===null?"—":`${change>=0?"+":""}${change.toFixed(1)}점`}</strong></div>
       <div className="cnn-component-score"><span>Revision 7 정규화 점수</span><strong>{score===null?"—":`${score.toFixed(1)} / 100`}</strong></div>
      </div>

      <div className="cnn-component-scorebar" aria-label={score===null?`${definition.title} 점수 확인 필요`:`${definition.title} 정규화 점수 ${score.toFixed(1)}점`}>
       <div className="cnn-component-scorebar-track">{score!==null?<i style={{left:`${score}%`}} aria-hidden="true"/>:null}</div>
       <div className="cnn-component-scorebar-ticks" aria-hidden="true"><span>0</span><span>25</span><span>45</span><span>55</span><span>75</span><span>100</span></div>
      </div>

      <div className="cnn-component-direction" aria-label={`${definition.title} 해석 방향`}>
       <span><b>공포 방향</b>{definition.fearDirection}</span>
       <span><b>탐욕 방향</b>{definition.greedDirection}</span>
      </div>

      <div className="cnn-component-reading-grid">
       <div className="cnn-component-reading is-raw">
        <strong>데이터 해석</strong>
        <p>{score===null?"현재 유효 구성점수를 확인할 수 없습니다.":`현재 ${score.toFixed(1)}점으로 ${koreaStageFromScore(score)} 구간입니다. 원시 입력값은 현재 공개 API에서 제공하지 않습니다.`}</p>
       </div>
       <div className="cnn-component-reading is-score">
        <strong>정규화 점수</strong>
        <p>{score===null?"검증 가능한 Revision 7 점수가 없습니다.":`${score.toFixed(1)} / 100 · ${koreaStageFromScore(score)}. 이전 관측 대비 ${change===null?"비교 자료 없음":`${change>=0?"+":""}${change.toFixed(1)}점`}입니다.`}</p>
        <small>{indicator?.status==="READY"?"저장 데이터 기반 READY":"임의 수치로 대체하지 않습니다."}</small>
       </div>
      </div>
     </article>;
    })}
   </div>

   <aside className="cnn-education-note">
    <strong>숫자를 읽는 핵심</strong>
    <p>한국 Revision 7은 7개 구성요소의 정규화 점수와 종합점수를 함께 봅니다. 원시값이 공개되지 않은 항목은 추정치로 채우지 않습니다.</p>
   </aside>

   <div className="mt-6 flex flex-wrap gap-4 text-sm">
    <a className="cnn-return-cta" href="https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd">KRX 원본 ↗</a>
    <a className="cnn-return-cta" href="https://ecos.bok.or.kr/">ECOS 원본 ↗</a>
    <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
   </div>
  </section>
 </>;
}
