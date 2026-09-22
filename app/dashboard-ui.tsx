"use client";
import {useEffect,useId,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {Activity,ArrowRight,ChevronLeft,ChevronRight,Info,Radar,Coins,Users,Percent,Droplet,Landmark,ShieldCheck,Factory,ShoppingCart,BriefcaseBusiness,ArrowLeftRight,Network,DollarSign} from 'lucide-react';
import {Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis,ReferenceDot} from 'recharts';
export type DashboardPoint={label:string;value:number};
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
export function ScoreScale({score,label,color}:{score:number|null;label:string;color:string}){const band=score===null?'unknown':score<25?'danger':score<40?'caution':score<60?'neutral':score<75?'positive':'strong';return <div className={`zg-scale zg-scale-${band}`} data-score-band={band} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score??undefined}><div style={{width:`${score??0}%`,background:color}}/>{score!==null&&<i style={{left:`${score}%`,borderColor:color}}/>}</div>}
const scoreColor=(score:number)=>score<25?'#ef4444':score<40?'#f59e0b':score<60?'#94a3b8':score<75?'#22c55e':'#10b981';
function Sparkline({data,label}:{data:DashboardPoint[];label:string}){return <div className="zg-spark" aria-label={`${label} 관측 추이`}><ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}><LineChart data={data} accessibilityLayer margin={{top:6,right:6,left:6,bottom:6}}><Tooltip offset={10} cursor={{stroke:'#AAB2BC',strokeWidth:1}} formatter={v=>[v,'점수']} contentStyle={{fontSize:13,borderRadius:4,border:'1px solid #D7DCE2'}}/><Line type="linear" dataKey="value" stroke="#3478D4" strokeWidth={2} dot={false} activeDot={{r:4}} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>}
function CardTrend({data,label,color}:{data:DashboardPoint[];label:string;color:string}){
 const latest=data.at(-1);
 return <div className="zg-spark" aria-label={`${label} 관측 추이`}>
  <ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}>
   <LineChart data={data} accessibilityLayer margin={{top:6,right:6,left:4,bottom:6}}>
    <XAxis hide dataKey="label"/><YAxis hide domain={[0,100]}/>
    <Tooltip labelFormatter={v=>String(v)} formatter={v=>[typeof v==='number'?v.toFixed(1):'—','점수']} contentStyle={{background:'#071a2d',border:'1px solid #17446d',color:'#eef4fa',fontSize:11}}/>
    <Line type="linear" dataKey="value" stroke={color} strokeWidth={1.8} dot={false} connectNulls={false} isAnimationActive={false}/>
    {latest&&<ReferenceDot x={latest.label} y={latest.value} r={2.5} fill={color} stroke={color}/>}
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
 trend?:DashboardPoint[];
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
 {label:'금리',Icon:Percent,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['정책금리','2년물','10년 실질','10년물']},
 {label:'채권신용',Icon:ShieldCheck,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['HY 신용 스트레스','IG 신용 스트레스','채권 변동성','회사채 시장위험']},
 {label:'경기',Icon:Factory,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['실질 국내총생산','제조업','서비스업','산업생산']},
 {label:'소비',Icon:ShoppingCart,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['실질 소비지출','소매판매','가처분소득','저축률']},
 {label:'기업실적',Icon:BriefcaseBusiness,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['주당이익 성장','매출 성장률','이익 성장비','영업·순이익률']},
 {label:'유동성',Icon:Landmark,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['은행 준비금','통화량 증가','재무부 계정변화','익일 역레포']},
 {label:'자금흐름',Icon:ArrowLeftRight,basis:'SEC 등록펀드 전체 순유입을 전월 순자산으로 나눈 월별 비율입니다. 미국 주식형 펀드만의 값이 아닙니다. 추이는 실제 월별 점수이며 일별 보간하지 않습니다.',details:[]},
 {label:'수급·폭',Icon:Network,basis:'Data by Equibles. S&P 500 추적펀드의 일별 구성 기준이며 공식 S&P DJI 구성 파일이 아닙니다. 종가×거래량은 거래대금 대용값입니다. 권리·관측일·커버리지 검증 전에는 점수를 표시하지 않습니다.',details:[]},
 {label:'달러환율',Icon:DollarSign,basis:'공개 점수 결과를 표시합니다. PARTIAL/UNAVAILABLE은 0점으로 대체하지 않습니다.',details:['광의 달러지수','3개월 변화율','신흥국 달러지수','달러 변동성']},
 {label:'유가원자재',Icon:Droplet,basis:'공개 점수 결과를 표시합니다. 공급충격 점수를 유가·원자재 점수로 대체하지 않습니다.',details:['서부텍사스유','브렌트유','구리','휘발유']}
] as const;

const diagnosticSubscores=[
 {name:'인플레이션',components:'근원 PCE, 근원 CPI, CPI, 기대물가'},
 {name:'경기 침체',components:'비농업고용, 실질 GDP, 산업생산, 실질 소비지출, 실업률, 소매판매, 가처분소득'},
 {name:'유동성 위기',components:'단기자금시장 스트레스, 은행준비금, TGA 변화, ON RRP, M2, 채권변동성'},
 {name:'신용 위험',components:'HY CMDI, IG CMDI, Total CMDI, 채권변동성'},
 {name:'실적 침체',components:'EPS 성장, 영업·순이익률, 매출성장, 이익성장 폭'},
 {name:'자산 버블',components:'밸류에이션 압력, 가격가속, 위험자산비중, 투기성 자금흐름, 시장폭 괴리, 과잉유동성'},
 {name:'부채 위험',components:'Debt Service Ratio, 부채/GDP, 금리부담, 신용스트레스, 실적상환능력'},
 {name:'공급 충격',components:'NY Fed GSCPI, 유가충격, 휘발유, 구리, 산업생산, Headline-Core 물가괴리'}
] as const;

export function CompositeMarketSection({items,points,demo,loading}:{items:Summary[];points:number;demo:boolean;loading:boolean}){
 void items;
 void points;
 const [expanded,setExpanded]=useState(false);
 const [periodDays,setPeriodDays]=useState(90);
 const [market,setMarket]=useState<MarketScoreResponse|null>(null);
 const [marketLoading,setMarketLoading]=useState(true);
 const [marketError,setMarketError]=useState<string|null>(null);

 useEffect(()=>{
  const controller=new AbortController();
  let alive=true;
  setMarketLoading(true);
  fetch('/api/market-score',{signal:controller.signal,cache:'default'})
   .then(async response=>{
    const body=await response.json() as MarketScoreResponse;
    if(!response.ok||body?.status!=='SUCCESS')throw new Error('MARKET_SCORE_UNAVAILABLE');
    if(alive){setMarket(body);setMarketError(null)}
   })
   .catch(error=>{
    if(error?.name==='AbortError')return;
    if(alive){setMarket(null);setMarketError('MARKET_SCORE_UNAVAILABLE')}
   })
   .finally(()=>{if(alive)setMarketLoading(false)});
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
 const overallTrend=marketTrendWindow(market?.overall?.trend,periodDays);
 const hasDatedHistory=[market?.overall?.trend,...(market?.domains??[]).map(d=>d.trend)].some(data=>marketTrendWindow(data,365).length>1);

 return <section id="market" className="zg-section zg-r55-market">
  <div className="zg-section-heading zg-r55-heading">
   <div>
    <h2><Activity/>종합 시장 점수</h2>
    <span className="zg-brand-tag">ZGmini 독자 지표{demo?' · 예시':''}</span>
   </div>
   <div className="zg-r55-header-controls">
   <div className="zg-r55-period" role="group" aria-label="종합 시장 점수 추이 기간" title={hasDatedHistory?'제공된 관측 마지막 날짜 기준':'날짜가 있는 추이 데이터 제공 시 이용 가능'}>
    {marketPeriods.map(p=><button key={p.label} type="button" disabled={!hasDatedHistory} aria-pressed={periodDays===p.days} onClick={()=>setPeriodDays(p.days)}>{p.label}</button>)}
   </div>
   <button type="button" className="zg-r55-expand" aria-expanded={expanded} onClick={toggle}>
    {expanded?'전체 접기':'전체 펼침'}
   </button>
   </div>
  </div>

  <div className="zg-r55-shell" data-testid="macro-row" data-expanded={expanded?'true':'false'}>
   <div className="zg-r55-body">
    <article className="zg-r55-summary" data-testid="composite-panel">
     <div className="zg-r55-summary-top" role="img" aria-label={`종합 시장 점수 ${overallScore===null?overallStatus:`${Math.round(overallScore)}점`}`}>
      <div className="zg-r55-gauge-ring" data-missing={overallScore===null} style={{'--r55-score-angle':`${(overallScore??0)*2.7}deg`,'--r55-score-color':overallScore===null?'#64748b':scoreColor(overallScore)} as CSSProperties}/>
      <div className="zg-r55-master-number">
       <strong style={{color:overallScore===null?'#94a3b8':scoreColor(overallScore)}}>{overallScore===null?'—':Math.round(overallScore)}</strong>
       <span>{overallStatus}</span>
      </div>
     </div>

     <div className="zg-r55-summary-chart">

      {overallTrend.length>1
       ?<Sparkline data={overallTrend} label="종합 시장 점수"/>
       :<div className="zg-r55-empty-spark" aria-label="종합 추이 데이터 없음">추이 데이터 준비 중</div>}
     </div>

     <div className="zg-r55-coverage"><DashboardTip label="종합 점수 데이터 안내">{marketError?'공개 점수 API를 확인 중입니다.':busy?'공개 점수 불러오는 중':`${readyDomains}/${totalDomains} 영역 READY · 커버리지 가중치 ${coverageWeight}/100 · 누락 가중치 자동 재분배 없음`}</DashboardTip></div>

     <div className="zg-r55-subscore-area" aria-label="8개 위험 지표">
      <div className="zg-r55-subscore-grid">
       {diagnosticSubscores.map((s,index)=>{
        const diag=market?.diagnostics8?.[diagnosticKeys[index]];
        const score=diag?.status==='READY'&&validPublicScore(diag.score)?diag.score:null;
        return <div key={s.name} className="zg-r55-subscore" data-index={index}>
         <div className="zg-r55-subscore-head">
          <span className="zg-r55-subscore-title">
           <span onClick={e=>e.stopPropagation()}><DashboardTip label={`${s.name} 반영 항목`} trigger={<b>{s.name}</b>}>{s.components}. API diagnostics8에서 READY인 경우에만 숫자를 표시합니다.</DashboardTip></span>
          </span>
          <strong>{score===null?'—':Math.round(score)}</strong>
         </div>
         <div className="zg-r55-subscore-foot">
          <span className="zg-r55-subscore-meter" aria-hidden="true"><i style={{width:`${score??0}%`,background:score===null?'transparent':scoreColor(score)}}/></span>
         </div>
        </div>
       })}
      </div>
     </div>
    </article>

    <div className="zg-r55-component-panel" data-testid="component-panel">
     <div className="zg-r55-card-grid" data-testid="component-grid">
      {r55Cards.map((m,index)=>{
       const Icon=m.Icon;
       const domain=market?.domains?.find(d=>d.id===r55DomainIds[index]);
       const score=domain?.status==='READY'&&validPublicScore(domain.score)?domain.score:null;
       const trend=marketTrendWindow(domain?.trend,periodDays);

       const band=score===null?'unknown':score<25?'danger':score<40?'caution':score<60?'neutral':score<75?'positive':'strong';
       const detailRows=domain?.indicators?.length
        ?domain.indicators.slice(0,4).map((item,i)=>({label:item.name??item.label??m.details[i]??`지표 ${i+1}`,score:validPublicScore(item.score)?item.score:null,raw:r55DomainIds[index]==="breadth"||r55DomainIds[index]==="fundFlows",value:item.status==="READY"&&typeof item.value==="number"&&Number.isFinite(item.value)?item.value:null,unit:item.unit??""}))
        :[];
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
         <span className="zg-r55-badge">{busy?'로딩':score===null?'미완료':domain?.state??(score<25?'위험':score<40?'주의':score<60?'중립':score<75?'양호':'안정')}</span>
         <span onClick={e=>e.stopPropagation()}><DashboardTip label={`${m.label} 산출 근거`}>{m.basis}</DashboardTip></span>
        </div>
        <div className="zg-r55-card-mid">
         <div className="zg-r55-card-number">
          <strong style={{color:score===null?'#94a3b8':scoreColor(score)}}>{score===null?'—':Math.round(score)}</strong>
          <span className="zg-r55-day-change" aria-label="전일 대비 확인 불가" title="검증된 전일 비교 점수 없음">-</span>

         </div>
         {trend.length>0
          ?<CardTrend data={trend} label={m.label} color={score===null?'#94a3b8':scoreColor(score)}/>
          :<div className="zg-r55-card-spark-empty" aria-label={`${m.label} 추이 데이터 없음`}>—</div>}
        </div>
        <ScoreScale score={score} label={`${m.label} 점수`} color={score===null?'#64748b':scoreColor(score)}/>
        <div className="zg-r55-scale-labels" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>

        <div className="zg-r55-details" aria-hidden={!expanded}>
         {detailRows.map(row=><div className="zg-r55-detail" key={row.label}><span>{row.label}</span>{!row.raw&&<ScoreScale score={row.score} label={`${row.label} 구성 점수`} color={row.score===null?'#64748b':scoreColor(row.score)}/>}<b style={{color:row.score===null?'#94a3b8':scoreColor(row.score),gridColumn:row.raw?'2 / 4':undefined,textAlign:'right'}}>{row.raw?(row.value===null?'—':`${Number(row.value.toFixed(2))}${row.unit}`):(row.score===null?'—':Math.round(row.score))}</b></div>)}
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
