"use client";
import {LiveScoreValue} from '../components/live-score-value';
import ChartExtremumPoint from '../components/chart-extremum-point';
import {chartExtrema} from '../lib/chart-extrema.mjs';
import {domainObservationDelta} from '../lib/market-score/domain-observation-delta.mjs';
import {compositeDayDelta,compositePeriodDelta} from '../lib/market-score/composite-day-delta.mjs';

// Cloudflare Git Integration deployment marker: plain-language macro labels R1
import {useEffect,useId,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {Activity,ArrowRight,ArrowUpRight,ChevronLeft,ChevronRight,Info,Radar,Coins,Users,Percent,Droplet,Landmark,ShieldCheck,Factory,ShoppingCart,BriefcaseBusiness,ArrowLeftRight,Network,DollarSign} from 'lucide-react';
import {Area,AreaChart,ReferenceArea,Line,LineChart,ResponsiveContainer,XAxis,YAxis,ReferenceDot,ReferenceLine,Tooltip} from 'recharts';
import {readProgressiveMarketResponse} from '../lib/market-score/read-progressive-response.mjs';
import {useStoredIndex} from '../components/use-stored-index';
import {useScoreArrows,useScoreArrowDelta,StoredScoreDirection} from '../components/score-arrow-provider';
import {acceptsStoredUpdate,startStoredRefresh} from '../lib/market-score/live-refresh.mjs';
import {readMarketSnapshot,saveMarketSnapshot} from '../lib/market-score/browser-snapshot.mjs';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';
import {breadthNotice} from '../lib/market-score/breadth-notice.mjs';
import {breadthB1R4PreviousSessionDelta as breadthPreviousSessionDelta} from '../lib/market-score/breadth-b1-r4-ui-delta.mjs';
import {marketTrendWindowR1} from '../lib/market-score/market-trend-window-r1.mjs';
import {amplifyCompositeDisplayScore,amplifyCompositeDisplayTrend} from '../lib/market-score/composite-display-sensitivity-r1.mjs';
import {ContentHelp} from './content-help';
import {HELP,HelpText} from './help-copy';
export type DashboardPoint={label:string;value:number};
type MarketTrendPoint={label?:string;date?:string;value?:number;score?:number};
function normalizeMarketTrendPoints(data?:MarketTrendPoint[]):DashboardPoint[]{
 return (Array.isArray(data)?data:[]).flatMap(point=>{
  const label=typeof point?.label==='string'&&point.label
   ?point.label
   :typeof point?.date==='string'&&point.date
    ?point.date
    :null;
  const rawValue=typeof point?.value==='number'
   ?point.value
   :typeof point?.score==='number'
    ?point.score
    :null;
  return label!==null&&rawValue!==null&&Number.isFinite(rawValue)
   ?[{label,value:rawValue}]
   :[];
 });
}
export type Summary={label:string;score:number;value:string;note:string;data:DashboardPoint[]};
export function DashboardTip({label,children,trigger}:{label:string;children:ReactNode;trigger?:ReactNode}){return <ContentHelp label={label} trigger={trigger}>{children}</ContentHelp>;}
export function ScoreScale({score,label,color}:{score:number|null;label:string;color:string}){const band=score===null?'unknown':score<25?'danger':score<40?'caution':score<60?'neutral':score<75?'positive':'strong';const style={'--zg-score':`${score??0}%`,'--zg-score-color':color} as CSSProperties;return <div className={`zg-scale zg-scale-${band}`} data-score-band={band} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score??undefined} style={style}/>} 
const scoreColor=(score:number)=>score<25?'#ef4444':score<40?'#f59e0b':score<60?'#94a3b8':score<75?'#22c55e':'#10b981';
function timeScaledTrend(data:DashboardPoint[],periodDays:number){
 const points=data.flatMap(point=>{
  const ts=Date.parse(point.label);
  return Number.isFinite(ts)?[{...point,ts}]:[];
 });
 const end=points.length?Math.max(...points.map(point=>point.ts)):Date.now();
 const start=end-Math.max(1,periodDays)*86400000;
 return {points,start,end};
}

function CardTrend({data,label,color,periodDays,missingDates=[]}:{data:DashboardPoint[];label:string;color:string;periodDays:number;missingDates?:string[]}){
 const scaled=timeScaledTrend(data,periodDays),latest=scaled.points.at(-1);
 const chartPoints=[...scaled.points,...missingDates.map(label=>({label,ts:Date.parse(label),value:null}))].filter(point=>Number.isFinite(point.ts)&&point.ts>=scaled.start&&point.ts<=scaled.end).sort((a,b)=>a.ts-b.ts);
 return <div className="zg-spark zg-r55-mini-chart" aria-label={`${label} 관측 추이${missingDates.length?' · 점선은 결측 구간 연결이며 관측값이 아닙니다':''}`} title={missingDates.length?'점선: 미발표 자료가 있는 구간의 시각적 연결. 해당 월 점수는 결측입니다.':undefined} onPointerDown={event=>event.preventDefault()}>
  <div className="zg-r55-mini-y-labels" aria-hidden="true"><span>100</span><span>50</span><span>0</span></div>
  <ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}>
   <LineChart data={chartPoints} accessibilityLayer={false} tabIndex={-1} margin={{top:3,right:3,left:13,bottom:3}}>
    <XAxis hide dataKey="ts" type="number" domain={[scaled.start,scaled.end]}/>
    <YAxis hide domain={[0,100]} width={0}/>
    <ReferenceLine className="zg-r55-boundary-line" y={0} stroke="rgba(168,188,208,.4)" strokeWidth={1}/>
    <ReferenceLine className="zg-r55-boundary-line" y={100} stroke="rgba(168,188,208,.4)" strokeWidth={1}/>
    <ReferenceLine y={25} stroke="rgba(111,130,149,.22)" strokeDasharray="2 3" strokeWidth={0.8}/>
    <ReferenceLine y={50} stroke="rgba(111,130,149,.26)" strokeDasharray="2 3" strokeWidth={0.8}/>
    <ReferenceLine y={75} stroke="rgba(111,130,149,.22)" strokeDasharray="2 3" strokeWidth={0.8}/>
    {missingDates.length>0&&<Line type="linear" dataKey="value" stroke={color} strokeOpacity={0.65} strokeDasharray="2 3" strokeWidth={1.2} dot={false} activeDot={false} connectNulls={true} isAnimationActive={false}/>}
    <Line type="linear" dataKey="value" stroke={color} strokeWidth={1.8} dot={false} activeDot={false} connectNulls={false} isAnimationActive={false}/>
    {latest&&<ReferenceDot x={latest.ts} y={latest.value} r={2.5} fill={color} stroke={color}/>}
   </LineChart>
  </ResponsiveContainer>
 </div>;
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

function SummaryTrend({data,label,color,periodDays}:{data:DashboardPoint[];label:string;color:string;periodDays:number}){
 const scaled=timeScaledTrend(data,periodDays),latest=scaled.points.at(-1),axis=summaryAxisConfig(scaled.points,periodDays);
 const gradientId=`summary-${useId().replace(/:/g,'')}`;
 const extrema=chartExtrema(scaled.points.map(p=>({date:new Date(p.ts).toISOString().slice(0,10),value:p.value})));
 return <div className="zg-spark zg-r55-mini-chart zg-r55-summary-mini-chart" style={{height:120,minHeight:120,maxHeight:120}} aria-label={`${label} 관측 추이`}>
  <ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}>
   <AreaChart data={scaled.points} accessibilityLayer={false} tabIndex={-1} margin={{top:12,right:18,left:0,bottom:4}}>
    <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".6"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    <XAxis dataKey="ts" type="number" domain={[scaled.start,scaled.end]} ticks={axis.ticks} interval={0} tickMargin={5} tickFormatter={value=>axis.labels.get(Number(value))??''} tick={{fill:'var(--zg-text-meta,#a8bcd0)',fontSize:9}} axisLine={false} tickLine={false} height={30}/>
    <YAxis domain={[0,100]} ticks={[0,50,100]} tick={{fill:'#a9bfd1',fontSize:13}} axisLine={false} tickLine={false} width={36}/>
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
      const point=payload[0]?.payload as DashboardPoint&{ts:number};
      const parts=summaryDateParts(Number(tooltipLabel));
      const value=point?.value;
      return <div className="cnn-history-tooltip">
       <span>{parts?`${parts.year}. ${parts.monthText}. ${parts.dayText}.`:point?.label??'—'}</span>
       <strong style={{color:typeof value==='number'&&Number.isFinite(value)?scoreColor(value):'#94a3b8'}}>{typeof value==='number'&&Number.isFinite(value)?value.toFixed(1):'—'}</strong>
      </div>;
     }}
    />
    <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gradientId})`} strokeWidth={2.2} dot={false} activeDot={{r:3.5,strokeWidth:0,fill:color}} connectNulls={false} isAnimationActive={false}/>
    {latest&&<ReferenceDot x={latest.ts} y={latest.value} r={4.4} fill={color} stroke="#fff7f7" strokeWidth={2}/>}
    {extrema.map(point=><ReferenceDot key={'extreme-'+point.kind} x={scaled.points[point.index].ts} y={point.value} ifOverflow="visible" shape={<ChartExtremumPoint point={point} peerIndex={extrema.find(p=>p.kind!==point.kind)?.index} samples={scaled.points.map(p=>({x:p.ts,value:p.value}))} count={scaled.points.length} color={color}/>}/>)}
   </AreaChart>
  </ResponsiveContainer>
 </div>;
}
// Stage 12 R2 / W09.2 content ownership correction:
// The legacy 4-component market score is not the target content.
// CM-R1 now owns the public 12-domain composite contract.
// PARTIAL / UNAVAILABLE data is never converted to a fake numeric score.
type MarketScoreDomain={
 id:string;
 name:string;
 score:number|null;
 status:"READY"|"PARTIAL"|"UNAVAILABLE"|string;
 state?:string|null;
 interpretation?:string|null;
 trend?:MarketTrendPoint[];
 previousObservation?:{date:string;currentDate:string;score:number};
 indicators?:Array<{name?:string;label?:string;score?:number|null;status?:string;value?:number|null;unit?:string}>;
 freshness?:string|null;
 updatedAt?:string|null;
 missingFactors?:string[];
};
type MarketScoreResponse={
 status:string;
 modelVersion?:string;
 overall:{score:number|null;status:string;state?:string|null;trend?:DashboardPoint[]};
 domains:MarketScoreDomain[];
 diagnostics8?:Record<string,{status:string;score:number|null;missingFactors?:string[]}>;
 updatedAt?:string|null;
 dataQuality?:{
  readyDomains?:number;
  totalDomains?:number;
  missingDomains?:string[];
  partialDomains?:string[];
  coverageWeight?:number;
  overallComputable?:boolean;
  reweighted?:boolean;
 };
};
const r55DomainIds=["inflation","employment","rates","credit","growth","consumption","earnings","liquidity","fundFlows","breadth","dollarFx","commodities"] as const;
const diagnosticKeys=["inflationStability","recessionDefense","liquidityCrisisDefense","creditRiskDefense","earningsRecessionDefense","assetBubbleSafety","debtRiskSafety","supplyShockSafety"] as const;
const validPublicScore=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const marketPeriods=[{label:'1D',days:1},{label:'1W',days:7},{label:'1M',days:30},{label:'3M',days:90},{label:'6M',days:180},{label:'1Y',days:365}] as const;
function marketTrendWindow(data:DashboardPoint[]|undefined,days:number){
 return marketTrendWindowR1(data??[],days) as DashboardPoint[];
}
const publicStatusLabel=(status?:string)=>status==="READY"?"연결됨":status==="PARTIAL"?"부분 데이터":"데이터 준비 중";

const r55Cards=[
 {label:'물가',Icon:Coins,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['근원 소비지출물가','근원 소비자물가','소비자물가','기대물가']},
 {label:'고용',Icon:Users,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['비농업고용','실업률','실업수당','임금상승률']},
 {label:'금리',Icon:Percent,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['미국 기준금리','2년 국채금리','미국 실질금리','장단기 금리차']},
 {label:'채권신용',Icon:ShieldCheck,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['고위험 회사채','우량 회사채','채권 변동성','회사채 시장위험']},
 {label:'경기',Icon:Factory,basis:'Growth R2 경기 총점은 저장된 24개 지표 전체의 승인 가중합입니다. 아래 4개는 총점 산식의 대체값이 아니라 대표 점수입니다.',details:['제조업 신규주문','산업생산','비농업고용 증감','신규 사업체 신청']},
 {label:'소비',Icon:ShoppingCart,basis:'소비 R5: 실제 소비 30%, 소득 25%, 고용 15%, 가계 금융 여력 20%, 소비 확산 10%. 역사적 상대 수준을 평가하며 확률이 아닙니다.',details:['실제 소비','소득 기반','고용 기반','가계 금융 여력','소비 확산']},
 {label:'기업실적',Icon:BriefcaseBusiness,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['주당이익 성장','매출 성장률','이익 증가 종목','영업·순이익률']},
 {label:'유동성',Icon:Landmark,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['은행 준비금','시중 통화량','재무부 현금','연준 단기자금']},
 {label:'자금흐름',Icon:ArrowLeftRight,basis:'SEC 등록펀드의 전체 순유입, 순유입 추세, 펀드 동반 유입, 환매 압력을 저장 이력 기준으로 종합합니다. 추이는 실제 월별 관측만 사용합니다.',details:['전체 펀드 순유입','순유입 추세','펀드 동반 유입','환매 압력']},
 {label:'수급·폭',Icon:Network,basis:'B1-R5 R2는 저장된 S&P500 종가·거래량만 사용합니다. 오른 종목 비율 30% + 상승 거래비중 20% + 5일 수급 추세 30% + 20일 수급 추세 20%를 합성한 뒤 최종 3일 EMA를 적용합니다. 단기 잡음을 줄이지만 반응 지연이 생길 수 있습니다. 98% 커버리지 미달 시 점수를 만들지 않습니다.',details:[]},
 {label:'달러환율',Icon:DollarSign,basis:'미국 달러 종합지수의 수준, 단기·중기 추세, 변동성을 저장 이력 기준으로 평가합니다. 결측 시 재가중하지 않습니다.',details:['달러 강세 부담','단기 달러 추세','중기 달러 추세','달러 변동성']},
 {label:'유가원자재',Icon:Droplet,basis:'K1-R2는 미국 원유 30% + 국제 원유 25% + 구리 25% + 휘발유 20%입니다. 각 구성요소의 최신 유효 월간 점수를 독립 선택하며 최대 2개월 지연만 허용하고 결측 재가중은 하지 않습니다.',details:['미국 원유','국제 원유','구리','휘발유']}
] as const;

const diagnosticSubscores=[
 {name:'인플레이션',href:'/inflation/',components:'근원 PCE, 근원 CPI, CPI, 기대물가'},
 {name:'경기 침체',href:'/recession/',components:'비농업고용, 실질 GDP, 산업생산, 실질 소비지출, 실업률, 소매판매, 가처분소득'},
 {name:'유동성 위기',href:'/liquidity-crisis/',components:'단기자금시장 위험, 은행 준비금, 재무부 현금, 연준 단기자금, 시중 통화량, 채권 변동성'},
 {name:'신용 위험',href:'/credit-risk/',components:'고위험 회사채, 우량 회사채, 전체 회사채, 채권 변동성'},
 {name:'실적 침체',href:'/earnings-recession/',components:'주당이익 성장, 영업·순이익률, 매출 성장, 이익 증가 종목'},
 {name:'자산 버블',href:'/asset-bubble/',components:'밸류에이션 압력, 가격가속, 위험자산비중, 투기성 자금흐름, 시장폭 괴리, 과잉유동성'},
 {name:'부채 위험',href:'/debt-risk/',components:'Debt Service Ratio, 부채/GDP, 금리부담, 신용스트레스, 실적상환능력'},
 {name:'공급 충격',href:'/supply-shock/',components:'글로벌 공급망, 미국 석유 공급, 에너지 가격, 공급 주도 물가, 산업생산'}
] as const;

export function CompositeMarketSection({items,points,demo,loading}:{items:Summary[];points:number;demo:boolean;loading:boolean}){
 const arrows=useScoreArrows();
 const arrowDelta=useScoreArrowDelta();
 void items;
 void points;
 const [expanded,setExpanded]=useState(false);
 const [periodDays,setPeriodDays]=useState(365);
 const [market,setMarket]=useState<MarketScoreResponse|null>(null);
 const [marketLoading,setMarketLoading]=useState(true);
 const [marketError,setMarketError]=useState<string|null>(null);
 const {payload:assetBubble}=useStoredIndex<{status:string;score:number|null;scoreObservationQuarter?:string}>('/api/asset-bubble-detail');
 const {payload:supplyShock}=useStoredIndex<{status:string;score:number|null;scoreObservationMonth?:string}>('/api/supply-shock-detail');

 useEffect(()=>{
  let alive=true;
  let storage:Storage|undefined;
  try{storage=window.sessionStorage}catch{/* Storage may be disabled. */}
  const cached=storage?readMarketSnapshot(storage,Date.now()):null;
  let accepted=cached?.body??null;
  if(cached){setMarket(cached.body);setMarketLoading(false)}
  else setMarketLoading(true);
  const publish=(body:MarketScoreResponse)=>{
   if(!acceptsStoredUpdate(accepted,body))return false;
   accepted=body;setMarket(body);
   setMarketError(null);
   return true;
  };
  const load=(signal:AbortSignal)=>{
   return fetch('/api/market-score',{signal,cache:'no-store',headers:{accept:'application/x-ndjson'}})
    .then(async response=>{
     if(response.status===503){const failure=await response.clone().json() as {reason?:string};if(alive&&!signal.aborted&&failure.reason==='STORED_SCORE_STALE')setMarket(null);}
     return readProgressiveMarketResponse(response,
     (body:MarketScoreResponse)=>{
      if(!alive||signal.aborted)return;
      publish(body);
     },
     (body:MarketScoreResponse,headers:Headers)=>{
      if(!alive||signal.aborted)return;
      if(publish(body)&&storage)saveMarketSnapshot(storage,body,headers);
     });})
    .catch(error=>{
     if(error?.name==='AbortError')return;
     if(alive){
      // Preserve the last accepted response on transient failure.
      setMarketError('MARKET_SCORE_UNAVAILABLE');
     }
    })
    .finally(()=>{if(alive)setMarketLoading(false)});
  };
  const stop=startStoredRefresh(load);
  return()=>{alive=false;stop()};
 },[]);

 const toggle=()=>setExpanded(v=>!v);

 const busy=marketLoading;
 const overallRawScore=market?.overall?.status==='READY'&&validPublicScore(market.overall.score)?market.overall.score:null;
 const overallScore=overallRawScore===null?null:amplifyCompositeDisplayScore(overallRawScore);
 const overallDayChange=compositeDayDelta(market?.overall?.trend,overallRawScore);
 const overallPeriodChange=compositePeriodDelta(market?.overall?.trend,overallRawScore,periodDays);
 const overallArrows=arrows('composite',overallScore);
 const overallComparisons=[{label:'전일',change:overallDayChange},{label:({'1':'1일','7':'1주','30':'1개월','90':'3개월','180':'6개월','365':'1년'} as Record<string,string>)[String(periodDays)]??`${periodDays}일`,change:overallPeriodChange}];
 const overallStatus=busy?'불러오는 중':marketError?'데이터 확인 중':publicStatusLabel(market?.overall?.status);
 const readyDomains=market?.dataQuality?.readyDomains??0;
 const totalDomains=market?.dataQuality?.totalDomains??12;
 const coverageWeight=market?.dataQuality?.coverageWeight??0;
 const overallTrend=marketTrendWindow(amplifyCompositeDisplayTrend(normalizeMarketTrendPoints(market?.overall?.trend)),periodDays);
 const hasDatedHistory=[market?.overall?.trend,...(market?.domains??[]).map(d=>d.trend)].some(data=>marketTrendWindow(normalizeMarketTrendPoints(data),365).length>1);

 return <section id="market" className="zg-section zg-r55-market">
  <div className="zg-section-heading zg-r55-heading">
   <div>
    <h2><Activity/>종합 시장 점수<DashboardTip label="종합 시장 점수 도움말"><HelpText copy={HELP.composite}/></DashboardTip></h2>
    <span className="zg-r55-beta-label" style={{fontSize:12,fontWeight:500,color:'#a8bacb',whiteSpace:'nowrap'}}>베타 버전 v1.2</span>
    <span className="zg-brand-tag">ZGmini 독자 지표{demo?' · 예시':''}</span>
   </div>
   <div className="zg-r55-header-controls">
   <div className="zg-r55-period" role="group" aria-label="종합 시장 점수 추이 기간" title={hasDatedHistory?'제공된 관측 마지막 날짜 기준':'날짜가 있는 추이 데이터 제공 시 이용 가능'}>
    {marketPeriods.map(p=><button key={p.label} type="button" disabled={!hasDatedHistory} aria-pressed={periodDays===p.days} onClick={()=>setPeriodDays(p.days)}>{p.label}</button>)}
   </div>
   <button type="button" className="zg-r55-expand" aria-label={expanded?'전체 접기':'전체 펼침'} title={expanded?'전체 접기':'전체 펼침'} aria-expanded={expanded} onClick={toggle}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>
   </button>
   </div>
  </div>

  <div className="zg-r55-shell" data-testid="macro-row" data-expanded={expanded?'true':'false'}>
   <div className="zg-r55-body">
    <article className="zg-r55-summary" data-testid="composite-panel">
     <div className="zg-r55-primary-zone">
     <div className="zg-r55-summary-top" role="img" aria-label={`종합 시장 점수 ${overallScore===null?overallStatus:`${overallScore.toFixed(1)}점`}`}>
      <div className="zg-r55-master-number" data-score-mode="number-only">
       <LiveScoreValue value={overallScore} style={{color:overallScore===null?'#94a3b8':scoreColor(overallScore)}}>{overallScore===null?'—':<>{overallScore.toFixed(1).split('.')[0]}<span className="zg-composite-fraction">.{overallScore.toFixed(1).split('.')[1]}</span></>}</LiveScoreValue>
       <div className="zg-composite-comparisons" aria-label="종합 시장 점수 변화량">
        {overallComparisons.map(({label,change})=><div key={label} className="zg-composite-day-comparison" title={change?`${change.previousDate} 대비 · 점수 차이`:'비교할 저장 점수 없음'}>
         <span>{label}{label!=='전일'?<span className="zg-composite-pc-only">전</span>:null}</span><b data-direction={change?(change.delta>0?'up':change.delta<0?'down':'flat'):'unknown'}>{change?`${change.delta>0?'+':''}${change.delta.toFixed(1)}`:'—'}{change?.delta===0?<i className="zg-composite-pc-only" aria-hidden="true">−</i>:null}{overallArrows&&change&&change.delta!==0?<i aria-hidden="true">{change.delta>0?'▲':'▼'}</i>:null}</b>
        </div>)}
       </div>
      </div>
     </div>

     <div className="zg-r55-summary-chart">
      {overallTrend.length>1
       ?<SummaryTrend data={overallTrend} label="종합 시장 점수" color={overallScore===null?'#94a3b8':scoreColor(overallScore)} periodDays={periodDays}/>
       :<div className="zg-r55-empty-spark" aria-label="종합 추이 데이터 없음">추이 데이터 준비 중</div>}
     </div>
     </div>

     <div className="zg-r55-diagnostics-zone">
      <div className="zg-r55-subscore-area" aria-label="8개 위험 지표">
       <div className="zg-r55-subscore-grid">
       {diagnosticSubscores.map((s,index)=>{
        const diag=diagnosticKeys[index]==='assetBubbleSafety'?assetBubble:diagnosticKeys[index]==='supplyShockSafety'?supplyShock:market?.diagnostics8?.[diagnosticKeys[index]];
        const score=diag?.status==='READY'&&validPublicScore(diag.score)?diag.score:null;
        return <div key={s.name} className="zg-r55-subscore" data-index={index} title={diagnosticKeys[index]==='assetBubbleSafety'&&assetBubble?.scoreObservationQuarter?`평가 분기 ${assetBubble.scoreObservationQuarter} · 상세 페이지와 동일한 R10 저장 점수`:undefined}>
         <div className="zg-r55-subscore-head">
          <span className="zg-r55-subscore-title"><DashboardTip label={`${s.name} 도움말`}><HelpText copy={HELP[s.name]}/></DashboardTip><a className="zg-subscore-name-link" href={s.href}><b>{s.name}</b></a></span>
          <span onClick={e=>e.stopPropagation()} className="zg-r55-subscore-info"><a className="zg-info" href={s.href} aria-label={`${s.name} 상세페이지 열기`} title={`${s.name} 상세페이지`}><ArrowUpRight size={18} aria-hidden="true"/></a></span>
         </div>
         <div className="zg-r55-subscore-foot">
          <span className="zg-r55-subscore-meter" aria-hidden="true"><i style={{width:`${score??0}%`,background:score===null?'transparent':scoreColor(score)}}/></span>
          <LiveScoreValue value={score===null?null:Math.round(score)} className="zg-r55-subscore-value">{score===null?'—':Math.round(score)}<StoredScoreDirection id={'diagnostic:'+diagnosticKeys[index]} score={score}/></LiveScoreValue>
         </div>
        </div>
       })}
      </div>
     </div>
     </div>
    </article>

    <div className="zg-r55-component-panel" data-testid="component-panel">
     <div className="zg-r55-card-grid" data-testid="component-grid">
      {r55Cards.map((m,index)=>{
       const Icon=m.Icon;
       const domain=market?.domains?.find(d=>d.id===r55DomainIds[index]);
       const score=domain?.status==='READY'&&validPublicScore(domain.score)?domain.score:null;
       const normalizedTrend=normalizeMarketTrendPoints(domain?.trend);
       const trend=marketTrendWindow(normalizedTrend,periodDays);
       const breadthDelta=r55DomainIds[index]==='breadth'?breadthPreviousSessionDelta(domain?.trend):domainObservationDelta(domain?.trend,score,domain?.previousObservation);
       const comparison=r55DomainIds[index]==='breadth'?'전 거래일':'직전 관측일';
       const publishedDelta=arrowDelta('domain:'+r55DomainIds[index],score);
       const directionDelta=publishedDelta??breadthDelta?.delta??null;

       const band=score===null?'unknown':score<25?'danger':score<40?'caution':score<60?'neutral':score<75?'positive':'strong';
       const detailRows=marketDetailRows(r55DomainIds[index],domain?.indicators) as Array<{label:string;score:number|null;raw:boolean;value:number|null;displayValue?:string|null;unit:string;asOfDate?:string|null;source?:string|null;area?:string;areaHeading?:string|null;weight?:number|null;referenceCount?:number;referenceExpected?:number}>;
       const notice=!busy?breadthNotice(domain):null;
       return <article
        key={m.label}
        className={`zg-r55-card band-${band}`}
        style={{'--r55-card-accent':score===null?'#94a3b8':scoreColor(score)} as CSSProperties}
        data-status={(domain?.status??'unavailable').toLowerCase()}
        data-expanded={expanded?"true":"false"}
        onClick={event=>{
         // Card background expands, but native title/help links retain their own actions.
         if((event.target as HTMLElement).closest("a,button,[role=button]"))return;
         toggle();
        }}
       >
        <div className="zg-r55-card-head">
         <span className="zg-r55-card-icon"><Icon size={18} aria-hidden="true"/></span>
         <h3><a className="zg-r55-card-title-link" href={"/economic-indicators/"+({inflation:"inflation",employment:"employment",rates:"rates",credit:"credit",growth:"growth",consumption:"consumption",earnings:"earnings",liquidity:"liquidity",fundFlows:"fund-flows",breadth:"breadth",dollarFx:"dollar-fx",commodities:"commodities"}[r55DomainIds[index]])+"/"} onClick={event=>event.stopPropagation()} aria-label={m.label+" 상세페이지 열기"} title={m.label+" 상세페이지"}>{m.label}<ArrowUpRight size={13} aria-hidden="true"/></a></h3>
         <span onClick={e=>e.stopPropagation()}><DashboardTip label={`${m.label} 도움말`}><HelpText copy={HELP[m.label]}/></DashboardTip></span>
        </div>
        {notice&&<p data-testid="breadth-unavailable-reason" style={{margin:'6px 0',fontSize:12,lineHeight:1.5,color:'#cbd5e1'}}>{notice.message}</p>}
        <div className="zg-r55-card-mid">
         <div className="zg-r55-card-number">
          <span className="zg-r55-badge">{busy&&score===null?'로딩':score===null?(notice?.badge??'미완료'):domain?.state??(score<25?'위험':score<40?'주의':score<60?'중립':score<75?'양호':'안정')}</span>
          <LiveScoreValue value={score===null?null:Math.round(score)} style={{color:score===null?'#94a3b8':scoreColor(score)}}>{score===null?'—':Math.round(score)}</LiveScoreValue>
          <span
            className="zg-r55-day-change"
            data-arrow-active={arrows('domain:'+r55DomainIds[index],score)}
            data-direction={directionDelta===null?'unknown':directionDelta>0?'up':directionDelta<0?'down':'flat'}
            aria-label={publishedDelta!==null?`직전 공개 점수 대비 ${publishedDelta>0?'+':''}${publishedDelta.toFixed(1)}점`:breadthDelta?`${comparison} ${breadthDelta.previousDate} 대비 ${breadthDelta.delta>=0?'+':''}${breadthDelta.delta.toFixed(1)}점`:'직전 관측 대비 확인 불가'}
            title={publishedDelta!==null?'직전 공개 점수 대비 · 변동 후 24시간 표시':breadthDelta?`${breadthDelta.previousDate} 대비`:'검증된 직전 관측 비교 점수 없음'}
           >{directionDelta===null?'—':directionDelta>0?'▲':directionDelta<0?'▼':'-'}</span>
          <div className="zg-r55-card-compact-scale"><ScoreScale score={score} label={`${m.label} 점수`} color={score===null?'#64748b':scoreColor(score)}/></div>
         </div>
         <div className="zg-r55-card-visual">
          {trend.length>0
           ?<CardTrend data={trend} label={m.label} color={score===null?'#94a3b8':scoreColor(score)} periodDays={periodDays} missingDates={r55DomainIds[index]==='consumption'?(domain?.trend??[]).filter(point=>point.value==null&&point.score==null).map(point=>point.date??point.label??''):[]}/>
           :<div className="zg-r55-card-spark-empty" aria-label={`${m.label} 추이 데이터 없음`}>—</div>}
         </div>
        </div>
        <div className="zg-r55-card-wide-scale"><ScoreScale score={score} label={`${m.label} 점수`} color={score===null?'#64748b':scoreColor(score)}/></div>
        <div className="zg-r55-scale-labels" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>

        <div className="zg-r55-details" aria-hidden={!expanded}>
         {detailRows.map(row=>{
          const breadthMeta=r55DomainIds[index]==='breadth';
          const rawText=row.displayValue??(row.value===null?'—':`${Number(row.value.toFixed(2))}${breadthMeta?(row.unit?` ${row.unit}`:''):row.unit}`);
          if(row.area)return <div key={row.label} style={{gridColumn:'1 / -1',minWidth:0}}>
           {row.areaHeading&&<div style={{fontWeight:700,margin:'10px 0 6px',color:'#cbd5e1'}}>{row.areaHeading}</div>}
           <div className="zg-r55-detail"><span>{row.label}</span><ScoreScale score={row.score} label={`${row.label} 구성 점수`} color={row.score===null?'#64748b':scoreColor(row.score)}/><b style={{color:row.score===null?'#94a3b8':scoreColor(row.score)}}>{row.score===null?'—':Math.round(row.score)}</b></div>
           <div style={{fontSize:11,color:'#94a3b8',lineHeight:1.6,overflowWrap:'anywhere'}}>원값 {rawText} · 전체 비중 {row.weight??'—'}% · 기준 {row.asOfDate??'미확인'}<br/>{row.source??'출처 미확인'}{row.referenceCount!==undefined&&row.referenceExpected!==undefined&&row.referenceCount<row.referenceExpected?` · 참조 ${row.referenceCount}/${row.referenceExpected}`:''}</div>
          </div>;
          return <div className="zg-r55-detail" key={row.label}>
           <span style={r55DomainIds[index]==='consumption'?{fontSize:'clamp(10px, 2.6vw, 14px)'}:undefined}>{row.label}</span>
           {!row.raw&&<ScoreScale score={row.score} label={`${row.label} 구성 점수`} color={row.score===null?'#64748b':scoreColor(row.score)}/>}
           <b style={{color:row.score===null?'#94a3b8':scoreColor(row.score),gridColumn:row.raw?'2 / 4':undefined,textAlign:'right'}}>{row.raw?rawText:(row.score===null?'—':Math.round(row.score))}</b>
          </div>;
         })}
        </div>

       </article>
      })}
     </div>
    </div>
   </div>
  </div>
 </section>
}

export type Scenario={id:string;title:string;category:string;probability:number|null;previous?:number;updatedAt?:string;confidence?:string;reason?:string};
export function ScenarioSection({items=[]}:{items?:Scenario[]}){const ref=useRef<HTMLDivElement>(null),[position,setPosition]=useState({left:false,right:items.length>4});useEffect(()=>{const el=ref.current;if(!el)return;const measure=()=>setPosition({left:el.scrollLeft>4,right:el.scrollLeft+el.clientWidth<el.scrollWidth-4});const observer=new ResizeObserver(measure);observer.observe(el);measure();return()=>observer.disconnect();},[items.length]);const move=(dir:number)=>ref.current?.scrollBy({left:dir*ref.current.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return <section id="scenarios" className="zg-section"><div className="zg-section-heading"><h2><Radar/>아웃브레이크</h2><p>주요 사건의 가능성을 추적하는 모델</p></div>{!items.length?<div className="zg-scenario-empty"><Radar size={28}/><div><h3>모델 준비 중</h3><p>검증된 시나리오가 연결되면 확률과 산출 근거를 제공합니다. 현재 공개된 확률은 없습니다.</p></div><span>—</span></div>:<div className="zg-carousel-wrap">{position.left&&<button className="zg-prev" aria-label="이전 아웃브레이크" onClick={()=>move(-1)}><ChevronLeft/></button>}<div ref={ref} className="zg-scenario-track" onScroll={()=>{const e=ref.current!;setPosition({left:e.scrollLeft>4,right:e.scrollLeft+e.clientWidth<e.scrollWidth-4})}}>{items.map(s=><article className="zg-scenario-card" key={s.id}><div className="zg-card-heading"><span className="zg-neutral-tag">{s.category}</span>{s.confidence&&<span>{s.confidence}</span>}</div><h3>{s.title}</h3><div className="zg-scenario-number">{s.probability===null?'—':`${s.probability}%`}{s.previous!==undefined&&s.probability!==null&&<small>{s.probability-s.previous>=0?'+':''}{s.probability-s.previous}%p</small>}</div><ScoreScale score={s.probability} label={s.title} color="#FABC42"/><small>기준 {s.updatedAt??'확인 중'}</small>{s.reason&&<DashboardTip label="아웃브레이크 근거">{s.reason}</DashboardTip>}</article>)}</div>{position.right&&<button className="zg-next" aria-label="다음 아웃브레이크" onClick={()=>move(1)}><ChevronRight/></button>}</div>}</section>}
export function StrengthPanel({title,items,points,onAll,onFavorite,isFavorite}:{title:string;items:{name:string;score:number;data:DashboardPoint[]}[];points:number;onAll:()=>void;onFavorite?:(name:string)=>void;isFavorite?:(name:string)=>boolean}){return <section className="zg-strength"><div className="zg-card-heading"><h2>{title}<DashboardTip label={`${title.replace(' (예시)','')} 도움말`}><HelpText copy={title.includes('섹터')?HELP.sector:HELP.theme}/></DashboardTip></h2><button className="zg-detail" onClick={onAll}>전체 보기 <ArrowRight size={14}/></button></div><p>표시용 예시 순위 · 실제 지수 아님</p><ol>{[...items].sort((a,b)=>b.score-a.score).slice(0,5).map((item,index)=>{const series=item.data.slice(-points),delta=series.length>1?series.at(-1)!.value-series[0].value:null;return <li key={item.name}><span>{index+1}</span><b>{item.name}</b><strong className="zg-strength-score">예시 {item.score}</strong><DashboardTip label={`${item.name} 기간 비교`}><HelpText copy={{...(title.includes('섹터')?HELP.sector:HELP.theme),meaning:`${item.name}의 표시용 예시 점수입니다. 현재 예시 점수는 ${item.score}점입니다.`}}/></DashboardTip>{onFavorite&&<button className="zg-detail" onClick={()=>onFavorite(item.name)} aria-label={`${item.name} 즐겨찾기`}>{isFavorite?.(item.name)?'해제':'추가'}</button>}</li>})}</ol></section>}
