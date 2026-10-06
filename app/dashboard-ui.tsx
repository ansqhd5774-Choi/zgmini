"use client";
// Cloudflare Git Integration deployment marker: plain-language macro labels R1
import {useEffect,useId,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {Activity,ArrowRight,ArrowUpRight,ChevronLeft,ChevronRight,Info,Radar,Coins,Users,Percent,Droplet,Landmark,ShieldCheck,Factory,ShoppingCart,BriefcaseBusiness,ArrowLeftRight,Network,DollarSign} from 'lucide-react';
import {Line,LineChart,ResponsiveContainer,XAxis,YAxis,ReferenceDot,ReferenceLine} from 'recharts';
import {readProgressiveMarketResponse} from '../lib/market-score/read-progressive-response.mjs';
import {readMarketSnapshot,saveMarketSnapshot} from '../lib/market-score/browser-snapshot.mjs';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';
import {breadthNotice} from '../lib/market-score/breadth-notice.mjs';
import {breadthB1R4PreviousSessionDelta as breadthPreviousSessionDelta} from '../lib/market-score/breadth-b1-r4-ui-delta.mjs';
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
export function DashboardTip({label,children,trigger}:{label:string;children:ReactNode;trigger?:ReactNode}){
 const [open,setOpen]=useState(false),id=useId(),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const root=useRef<HTMLSpanElement>(null);
 const [coords,setCoords]=useState({left:12,top:0});
 const clear=()=>{if(timer.current){clearTimeout(timer.current);timer.current=null}};
 const close=()=>{clear();setOpen(false)};
 const show=()=>{clear();const r=root.current?.getBoundingClientRect();setCoords({left:Math.max(12,Math.min((r?.right??252)-240,window.innerWidth-252)),top:Math.min(r?.bottom??0,window.innerHeight-180)});setOpen(true)};
 useEffect(()=>()=>clear(),[]);
 useEffect(()=>{if(!open)return;const dismiss=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))close()};document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss)},[open]);
 return <span
  ref={root}
  className="zg-tip-wrap"
  onMouseEnter={()=>{clear();timer.current=setTimeout(show,250)}}
  onMouseLeave={()=>{clear();timer.current=setTimeout(close,100)}}
  onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))close()}}
  onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close()}}}
 >
  <button
   type="button"
   className="zg-info"
   aria-label={label}
   aria-expanded={open}
   aria-controls={open?id:undefined}
   aria-describedby={open?id:undefined}
   onFocus={show}
   onClick={show}
  >
   {trigger??<Info size={16}/>}
  </button>
  {open&&<span id={id} role="tooltip" className="zg-tip" style={{position:"fixed",right:"auto",...coords}}>{children}</span>}
 </span>;
}
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

function CardTrend({data,label,color,periodDays}:{data:DashboardPoint[];label:string;color:string;periodDays:number}){
 const scaled=timeScaledTrend(data,periodDays),latest=scaled.points.at(-1);
 return <div className="zg-spark zg-r55-mini-chart" aria-label={`${label} 관측 추이`} onPointerDown={event=>event.preventDefault()}>
  <div className="zg-r55-mini-y-labels" aria-hidden="true"><span>100</span><span>50</span><span>0</span></div>
  <ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}>
   <LineChart data={scaled.points} accessibilityLayer={false} tabIndex={-1} margin={{top:3,right:3,left:13,bottom:3}}>
    <XAxis hide dataKey="ts" type="number" domain={[scaled.start,scaled.end]}/>
    <YAxis hide domain={[0,100]} width={0}/>
    <ReferenceLine y={25} stroke="rgba(111,130,149,.22)" strokeDasharray="2 3" strokeWidth={0.8}/>
    <ReferenceLine y={50} stroke="rgba(111,130,149,.26)" strokeDasharray="2 3" strokeWidth={0.8}/>
    <ReferenceLine y={75} stroke="rgba(111,130,149,.22)" strokeDasharray="2 3" strokeWidth={0.8}/>
    <Line type="linear" dataKey="value" stroke={color} strokeWidth={1.8} dot={false} activeDot={false} connectNulls={false} isAnimationActive={false}/>
    {latest&&<ReferenceDot x={latest.ts} y={latest.value} r={2.5} fill={color} stroke={color}/>}
   </LineChart>
  </ResponsiveContainer>
 </div>;
}

const summaryDateLabel=(value:number)=>new Date(value).toISOString().slice(5,10).replace('-','/');

function SummaryTrend({data,label,color,periodDays}:{data:DashboardPoint[];label:string;color:string;periodDays:number}){
 const scaled=timeScaledTrend(data,periodDays),latest=scaled.points.at(-1);
 return <div className="zg-spark zg-r55-mini-chart zg-r55-summary-mini-chart" aria-label={`${label} 관측 추이`} onPointerDown={event=>event.preventDefault()}>
  <ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}>
   <LineChart data={scaled.points} accessibilityLayer={false} tabIndex={-1} margin={{top:12,right:18,left:0,bottom:4}}>
    <XAxis dataKey="ts" type="number" domain={[scaled.start,scaled.end]} ticks={[scaled.start,scaled.start+(scaled.end-scaled.start)/4,scaled.start+(scaled.end-scaled.start)/2,scaled.start+(scaled.end-scaled.start)*3/4,scaled.end]} tickFormatter={summaryDateLabel} minTickGap={30} tick={{fill:'#a9bfd1',fontSize:12}} axisLine={false} tickLine={false} height={28}/>
    <YAxis domain={[0,100]} ticks={[0,50,100]} tick={{fill:'#a9bfd1',fontSize:13}} axisLine={false} tickLine={false} width={36}/>
    <ReferenceLine y={0} stroke="rgba(111,130,149,.22)" strokeDasharray="3 4"/>
    <ReferenceLine y={50} stroke="rgba(111,130,149,.4)" strokeDasharray="3 4"/>
    <ReferenceLine y={100} stroke="rgba(111,130,149,.22)" strokeDasharray="3 4"/>
    <Line type="linear" dataKey="value" stroke={color} strokeWidth={2.2} dot={false} activeDot={false} connectNulls={false} isAnimationActive={false}/>
    {latest&&<ReferenceDot x={latest.ts} y={latest.value} r={3.5} fill={color} stroke={color}/>}
   </LineChart>
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
 const dated=(data??[]).filter(p=>/^\d{4}-\d{2}-\d{2}/.test(p.label)&&Number.isFinite(Date.parse(p.label))&&validPublicScore(p.value));
 if(!dated.length)return [];
 const end=Math.max(...dated.map(p=>Date.parse(p.label)));
 return dated.filter(p=>Date.parse(p.label)>=end-days*86400000).sort((a,b)=>Date.parse(a.label)-Date.parse(b.label));
}
const publicStatusLabel=(status?:string)=>status==="READY"?"연결됨":status==="PARTIAL"?"부분 데이터":"데이터 준비 중";

const r55Cards=[
 {label:'물가',Icon:Coins,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['근원 소비지출물가','근원 소비자물가','소비자물가','기대물가']},
 {label:'고용',Icon:Users,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['비농업고용','실업률','실업수당','임금상승률']},
 {label:'금리',Icon:Percent,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['미국 기준금리','2년 국채금리','미국 실질금리','장단기 금리차']},
 {label:'채권신용',Icon:ShieldCheck,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['고위험 회사채','우량 회사채','채권 변동성','회사채 시장위험']},
 {label:'경기',Icon:Factory,basis:'Growth R2 경기 총점은 저장된 24개 지표 전체의 승인 가중합입니다. 아래 4개는 총점 산식의 대체값이 아니라 대표 점수입니다.',details:['제조업 신규주문','산업생산','비농업고용 증감','신규 사업체 신청']},
 {label:'소비',Icon:ShoppingCart,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['실질 소매판매','실질 가처분소득','개인저축률','카드 연체율']},
 {label:'기업실적',Icon:BriefcaseBusiness,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['주당이익 성장','매출 성장률','이익 증가 종목','영업·순이익률']},
 {label:'유동성',Icon:Landmark,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['은행 준비금','시중 통화량','재무부 현금','연준 단기자금']},
 {label:'자금흐름',Icon:ArrowLeftRight,basis:'SEC 등록펀드의 전체 순유입, 순유입 추세, 펀드 동반 유입, 환매 압력을 저장 이력 기준으로 종합합니다. 추이는 실제 월별 관측만 사용합니다.',details:['전체 펀드 순유입','순유입 추세','펀드 동반 유입','환매 압력']},
 {label:'수급·폭',Icon:Network,basis:'B1-R5는 저장된 S&P500 종가·거래량만 사용합니다. 오른 종목 비율 30% + 상승 거래비중 20% + 5일 수급 추세 30% + 20일 수급 추세 20%로 계산하며, 98% 커버리지 미달 시 점수를 만들지 않습니다.',details:[]},
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
 {name:'공급 충격',href:'/supply-shock/',components:'NY Fed GSCPI, 유가충격, 휘발유, 구리, 산업생산, Headline-Core 물가괴리'}
] as const;

export function CompositeMarketSection({items,points,demo,loading}:{items:Summary[];points:number;demo:boolean;loading:boolean}){
 void items;
 void points;
 const [expanded,setExpanded]=useState(false);
 const [periodDays,setPeriodDays]=useState(365);
 const [market,setMarket]=useState<MarketScoreResponse|null>(null);
 const [marketLoading,setMarketLoading]=useState(true);
 const [marketError,setMarketError]=useState<string|null>(null);

 useEffect(()=>{
  const controller=new AbortController();
  let alive=true;
  let storage:Storage|undefined;
  try{storage=window.sessionStorage}catch{/* Storage may be disabled. */}
  const cached=storage?readMarketSnapshot(storage,Date.now(),{allowExpired:true}):null;
  if(cached){setMarket(cached.body);setMarketLoading(false)}
  else setMarketLoading(true);
  // A mounted page is a fixed snapshot. Only a manual page reload fetches again.
  // Retain the last displayed result while that reload's request completes.
  const publish=(body:MarketScoreResponse)=>{
   setMarket(previous=>JSON.stringify(previous)===JSON.stringify(body)?previous:body);
   setMarketError(null);
  };
  const load=()=>{
   let received=false;
   return fetch('/api/market-score',{signal:controller.signal,cache:'no-store',headers:{accept:'application/x-ndjson'}})
    .then(response=>readProgressiveMarketResponse(response,
     (body:MarketScoreResponse)=>{
      if(!alive)return;
      received=true;if(!cached)publish(body);
     },
     (body:MarketScoreResponse,headers:Headers)=>{
      if(!alive)return;
      publish(body);
      if(storage)saveMarketSnapshot(storage,body,headers);
     }))
    .catch(error=>{
     if(error?.name==='AbortError')return;
     if(alive){
      if(!received&&!cached)setMarket(null);
      setMarketError('MARKET_SCORE_UNAVAILABLE');
     }
    })
    .finally(()=>{if(alive)setMarketLoading(false)});
  };
  void load();
  return()=>{alive=false;controller.abort()};
 },[]);

 const toggle=()=>setExpanded(v=>!v);
 const keyToggle=(e:React.KeyboardEvent<HTMLElement>)=>{
  if(e.currentTarget!==e.target)return;
  if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}
 };
 const busy=marketLoading;
 const overallScore=market?.overall?.status==='READY'&&validPublicScore(market.overall.score)?market.overall.score:null;
 const overallStatus=busy?'불러오는 중':marketError?'데이터 확인 중':publicStatusLabel(market?.overall?.status);
 const readyDomains=market?.dataQuality?.readyDomains??0;
 const totalDomains=market?.dataQuality?.totalDomains??12;
 const coverageWeight=market?.dataQuality?.coverageWeight??0;
 const overallTrend=marketTrendWindow(normalizeMarketTrendPoints(market?.overall?.trend),periodDays);
 const hasDatedHistory=[market?.overall?.trend,...(market?.domains??[]).map(d=>d.trend)].some(data=>marketTrendWindow(normalizeMarketTrendPoints(data),365).length>1);

 return <section id="market" className="zg-section zg-r55-market">
  <div className="zg-section-heading zg-r55-heading">
   <div>
    <h2><Activity/>종합 시장 점수</h2>
    <span style={{fontSize:12,fontWeight:500,color:'#a8bacb',whiteSpace:'nowrap'}}>베타 버전 v1.0</span>
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
     <div className="zg-r55-summary-top" role="img" aria-label={`종합 시장 점수 ${overallScore===null?overallStatus:`${Math.round(overallScore)}점`}`}>
      <div className="zg-r55-master-number" data-score-mode="number-only">
       <span>종합 점수</span>
       <strong style={{color:overallScore===null?'#94a3b8':scoreColor(overallScore)}}>{overallScore===null?'—':Math.round(overallScore)}</strong>
       <span>/ 100</span>
      </div>
     </div>

     <div className="zg-r55-summary-chart">
      {overallTrend.length>1&&<p className="zg-r55-main-period">{new Date(timeScaledTrend(overallTrend,periodDays).start).toISOString().slice(0,10)} ~ {new Date(timeScaledTrend(overallTrend,periodDays).end).toISOString().slice(0,10)}</p>}
      {overallTrend.length>1
       ?<SummaryTrend data={overallTrend} label="종합 시장 점수" color={overallScore===null?'#94a3b8':scoreColor(overallScore)} periodDays={periodDays}/>
       :<div className="zg-r55-empty-spark" aria-label="종합 추이 데이터 없음">추이 데이터 준비 중</div>}
     </div>

     <div className="zg-r55-coverage"><DashboardTip label="종합 점수 데이터 안내">{marketError?'공개 점수 API를 확인 중입니다.':busy?'공개 점수 불러오는 중':`${readyDomains}/${totalDomains} 영역의 자료를 확인했습니다.`}</DashboardTip></div>
     </div>

     <div className="zg-r55-diagnostics-zone">
      <div className="zg-r55-subscore-area" aria-label="8개 위험 지표">
       <div className="zg-r55-subscore-grid">
       {diagnosticSubscores.map((s,index)=>{
        const diag=market?.diagnostics8?.[diagnosticKeys[index]];
        const score=diag?.status==='READY'&&validPublicScore(diag.score)?diag.score:null;
        return <div key={s.name} className="zg-r55-subscore" data-index={index}>
         <div className="zg-r55-subscore-head">
          <span className="zg-r55-subscore-title"><b>{s.name}</b></span>
          <span onClick={e=>e.stopPropagation()} className="zg-r55-subscore-info"><a className="zg-info" href={s.href} aria-label={`${s.name} 상세페이지 열기`} title={`${s.name} 상세페이지`}><ArrowUpRight size={12} aria-hidden="true"/></a></span>
         </div>
         <div className="zg-r55-subscore-foot">
          <span className="zg-r55-subscore-meter" aria-hidden="true"><i style={{width:`${score??0}%`,background:score===null?'transparent':scoreColor(score)}}/></span>
          <strong className="zg-r55-subscore-value">{score===null?'—':Math.round(score)}</strong>
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
       const breadthDelta=r55DomainIds[index]==='breadth'?breadthPreviousSessionDelta(domain?.trend):null;

       const band=score===null?'unknown':score<25?'danger':score<40?'caution':score<60?'neutral':score<75?'positive':'strong';
       const detailRows=marketDetailRows(r55DomainIds[index],domain?.indicators) as Array<{label:string;score:number|null;raw:boolean;value:number|null;displayValue?:string|null;unit:string;asOfDate?:string|null;source?:string|null}>;
       const notice=!busy?breadthNotice(domain):null;
       return <article
        key={m.label}
        className={`zg-r55-card band-${band}`}
        style={{'--r55-card-accent':score===null?'#94a3b8':scoreColor(score)} as CSSProperties}
        data-status={(domain?.status??'unavailable').toLowerCase()}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-label={`${m.label} ${score===null?publicStatusLabel(domain?.status):`${Math.round(score)}점`}`}
        onClick={toggle}
        onKeyDown={keyToggle}
       >
        <div className="zg-r55-card-head">
         <span className="zg-r55-card-icon"><Icon size={18} aria-hidden="true"/></span>
         <h3>{m.label}</h3>
         <span className="zg-r55-badge">{busy&&score===null?'로딩':score===null?(notice?.badge??'미완료'):domain?.state??(score<25?'위험':score<40?'주의':score<60?'중립':score<75?'양호':'안정')}</span>
         <span onClick={e=>e.stopPropagation()}><DashboardTip label={`${m.label} 산출 근거`}>{notice?`${notice.detail} ${m.basis}`:m.basis}</DashboardTip></span>
        </div>
        {notice&&<p data-testid="breadth-unavailable-reason" style={{margin:'6px 0',fontSize:12,lineHeight:1.5,color:'#cbd5e1'}}>{notice.message}</p>}
        <div className="zg-r55-card-mid">
         <div className="zg-r55-card-number">
          <strong style={{color:score===null?'#94a3b8':scoreColor(score)}}>{score===null?'—':Math.round(score)}</strong>
          <span
            className="zg-r55-day-change"
            aria-label={breadthDelta?`전 거래일 ${breadthDelta.previousDate} 대비 ${breadthDelta.delta>=0?'+':''}${breadthDelta.delta.toFixed(1)}점`:'전일 대비 확인 불가'}
            title={breadthDelta?`${breadthDelta.previousDate} 대비`:'검증된 전일 비교 점수 없음'}
           >{breadthDelta?`${breadthDelta.delta>=0?'+':''}${breadthDelta.delta.toFixed(1)}`:'-'}</span>
          <div className="zg-r55-card-compact-scale"><ScoreScale score={score} label={`${m.label} 점수`} color={score===null?'#64748b':scoreColor(score)}/></div>
         </div>
         <div className="zg-r55-card-visual">
          {trend.length>0
           ?<CardTrend data={trend} label={m.label} color={score===null?'#94a3b8':scoreColor(score)} periodDays={periodDays}/>
           :<div className="zg-r55-card-spark-empty" aria-label={`${m.label} 추이 데이터 없음`}>—</div>}
         </div>
        </div>
        <div className="zg-r55-card-wide-scale"><ScoreScale score={score} label={`${m.label} 점수`} color={score===null?'#64748b':scoreColor(score)}/></div>
        <div className="zg-r55-scale-labels" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>

        <div className="zg-r55-details" aria-hidden={!expanded}>
         {detailRows.map(row=>{
          const breadthMeta=r55DomainIds[index]==='breadth';
          const rawText=row.displayValue??(row.value===null?'—':`${Number(row.value.toFixed(2))}${breadthMeta?(row.unit?` ${row.unit}`:''):row.unit}`);
          return <div className="zg-r55-detail" key={row.label}>
           <span>{row.label}</span>
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
export function StrengthPanel({title,items,points,onAll,onFavorite,isFavorite}:{title:string;items:{name:string;score:number;data:DashboardPoint[]}[];points:number;onAll:()=>void;onFavorite?:(name:string)=>void;isFavorite?:(name:string)=>boolean}){return <section className="zg-strength"><div className="zg-card-heading"><h2>{title}</h2><button className="zg-detail" onClick={onAll}>전체 보기 <ArrowRight size={14}/></button></div><p>표시용 예시 순위 · 실제 지수 아님</p><ol>{[...items].sort((a,b)=>b.score-a.score).slice(0,5).map((item,index)=>{const series=item.data.slice(-points),delta=series.length>1?series.at(-1)!.value-series[0].value:null;return <li key={item.name}><span>{index+1}</span><b>{item.name}</b><strong className="zg-strength-score">예시 {item.score}</strong><DashboardTip label={`${item.name} 기간 비교`}>{item.name} · 현재 예시 점수 {item.score} · 선택 구간 변화 {delta===null?'확인 불가':`${delta>=0?'+':''}${delta}p`}</DashboardTip>{onFavorite&&<button className="zg-detail" onClick={()=>onFavorite(item.name)} aria-label={`${item.name} 즐겨찾기`}>{isFavorite?.(item.name)?'해제':'추가'}</button>}</li>})}</ol></section>}
