"use client";
import {useEffect,useState} from "react";
import {LineChart,Line,ResponsiveContainer,CartesianGrid,XAxis,YAxis,Tooltip} from "recharts";

type Point={date:string;score:number|null};
type Indicator={id:string;name:string;status:"READY"|"WARMUP"|"UNAVAILABLE"|"STALE";score:number|null;observationDate:string|null;previousObservationDate:string|null;changePoints:number|null;history:Point[];briefExplanation:string};
const names=[{id:"LEV_BLEND20_60",name:"신용융자 확대 정도",description:"최근 신용융자 변화의 과거 대비 상대 수준"},{id:"L3_PRESSURE_P252",name:"반대매매 상대강도",description:"최근 3관측 평균 반대매매 금액의 과거 대비 상대 수준"}];
const date=(s:string|null)=>s?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:"—";
const stamp=(s:string)=>Date.parse(`${date(s)}T00:00:00Z`);
const notices={WARMUP:"계산에 필요한 자료를 준비하고 있습니다",UNAVAILABLE:"현재 자료를 불러오지 못했습니다",STALE:"자료 갱신이 지연되고 있습니다",READY:"관측 기준일의 통계로 계산한 상대 점수입니다"};

function FundsCard({item,loading,index}:{item:Indicator;loading:boolean;index:number}){
 const [months,setMonths]=useState(3);
 const end=item.observationDate,cutoff=end?new Date(stamp(end)):null;
 cutoff?.setUTCMonth(cutoff.getUTCMonth()-months);
 const history=item.history.filter(p=>cutoff&&stamp(p.date)>=cutoff.getTime()).map(p=>({...p,time:stamp(p.date)}));
 const numeric=typeof item.score==="number"&&Number.isFinite(item.score);
 return <article className="min-w-0 border border-slate-300 bg-white p-4 text-slate-900 sm:p-5" aria-labelledby={`funds-${index}`} aria-busy={loading}>
   <h3 id={`funds-${index}`} className="text-lg font-extrabold">{item.name}</h3>
   <p className="mt-1 min-h-10 text-sm text-slate-600">{item.briefExplanation}</p>
   <div className="mt-3 min-h-10 text-3xl font-bold tabular-nums">{loading?<span className="inline-block h-9 w-32 animate-pulse bg-slate-100" aria-label="불러오는 중"/>:numeric?<>{item.score!.toFixed(1)}<span className="ml-1 text-sm font-normal text-slate-500">점 / 100</span></>:"—"}</div>
   <p className="mt-2 min-h-5 text-sm tabular-nums">{item.changePoints!==null?`이전 관측 대비 ${item.changePoints>=0?"+":""}${item.changePoints.toFixed(1)}점 (${date(item.previousObservationDate)})`:"이전 관측과 비교할 자료 없음"}</p>
   <p className="mt-1 text-xs text-slate-500">관측 기준일 {date(end)}</p>
   <p role="status" className={`mt-2 min-h-10 text-sm ${item.status==="STALE"?"text-amber-700":"text-slate-600"}`}>{loading?"자료를 불러오는 중입니다":notices[item.status]}</p>
   <div role="group" aria-label={`${item.name} 차트 기간`} className="mt-3 flex gap-1">{[1,3,12].map(m=><button key={m} type="button" aria-pressed={months===m} onClick={()=>setMonths(m)} className={`min-h-11 min-w-14 border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${months===m?"border-slate-700 bg-slate-800 text-white":"border-slate-200 bg-white text-slate-700"}`}>{m===12?"1년":`${m}개월`}</button>)}</div>
   <div className="mt-3 h-[120px] min-w-0 sm:h-[140px]" aria-label={`${item.name} 추이, 0~100점`}>
    {history.some(p=>p.score!==null)?<ResponsiveContainer width="100%" height="100%"><LineChart data={history} margin={{top:8,right:12,left:-22,bottom:0}} accessibilityLayer>
      <CartesianGrid stroke="#e2e8f0" vertical={false}/><XAxis type="number" dataKey="time" domain={["dataMin","dataMax"]} tickFormatter={v=>new Date(v).toISOString().slice(5,10)} tick={{fontSize:10}} minTickGap={30}/><YAxis domain={[0,100]} ticks={[0,50,100]} tick={{fontSize:10}}/>
      <Tooltip allowEscapeViewBox={{x:false,y:false}} labelFormatter={v=>new Date(Number(v)).toISOString().slice(0,10)} formatter={v=>[typeof v==="number"?`${v.toFixed(1)}점`:"자료 없음","상대 점수"]} contentStyle={{fontSize:12,maxWidth:220}}/>
      <Line type="linear" dataKey="score" stroke={index===1?"#b45309":"#475569"} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false}/>
    </LineChart></ResponsiveContainer>:<div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">{loading?"차트 준비 중":"표시할 유효 점수가 없습니다"}</div>}
   </div>
   <p className="mt-2 min-h-8 text-xs text-slate-500">{history.length?`제공 구간 ${date(history[0].date)} ~ ${date(history.at(-1)!.date)} · 실제 제공 자료만 표시`:"제공 구간 없음"}</p>
   <details className="mt-2 border-t border-slate-200 pt-2 text-sm"><summary className="min-h-11 cursor-pointer py-3 focus-visible:outline-2 focus-visible:outline-blue-700">계산 방식</summary><div className="space-y-2 pb-2 leading-6 text-slate-600">
     <p>{index===0?"20·60관측 신용융자 변화의 252관측 상대 순위를 기존 0.6/0.4 비중으로 혼합합니다. 높은 점수가 좋은 투자나 수익 가능성을 뜻하지 않습니다.":"최근 3관측 평균 금액의 252관측 상대 순위입니다. 높을수록 반대매매 상대강도가 높습니다. 집계 변경 보도를 고려해 2023-10-25 이전 입력을 제외하고 최소 254관측 준비기간 이후 계산합니다."}</p>
     <p>과거 이력은 현재 확보한 자료로 재계산한 결과입니다. 당시 공개된 신호를 재현한 기록은 아닙니다. 실시간 시세가 아니라 관측 기준일이 있는 통계입니다.</p>
   </div></details>
 </article>;
}
export default function KoreaFunds(){
 const [data,setData]=useState<Indicator[]>([]),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),95000);
   fetch("/api/indicators/korea-funds",{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<{indicators?:Indicator[]}>;}).then(d=>{if(active&&Array.isArray(d.indicators))setData(d.indicators);}).catch(()=>{}).finally(()=>{clearTimeout(timer);if(active)setLoading(false);});
   return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[]);
 return <section className="mt-6 min-w-0" aria-labelledby="korea-funds-title" data-testid="korea-funds">
   <div className="mb-3 flex items-center gap-2"><h2 id="korea-funds-title" className="text-xl font-extrabold text-white">국내 투자자금 지표</h2><span className="border border-slate-500 px-2 py-1 text-xs text-slate-200">베타</span></div>
   <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">{names.map((n,index)=><FundsCard key={n.id} index={index} loading={loading} item={data.find(i=>i.id===n.id)??{id:n.id,name:n.name,briefExplanation:n.description,status:"UNAVAILABLE",score:null,observationDate:null,previousObservationDate:null,changePoints:null,history:[]}}/>)}</div>
   <p className="mt-3 text-xs leading-6 text-slate-300"><a className="underline focus-visible:outline-2" href="https://www.data.go.kr/data/15094809/openapi.do" target="_blank" rel="noreferrer">금융위원회 공공데이터포털의 금융투자협회 통계</a>를 ZGmini가 자체 가공한 보조지표입니다. 공식 공포·탐욕지수나 매매 추천이 아닙니다.</p>
 </section>;
}
