"use client";
import {useState} from "react";
import {LineChart,Line,ResponsiveContainer,CartesianGrid,XAxis,YAxis,Tooltip} from "recharts";
import {useKoreaFunds,type Indicator} from './korea-funds-store';

const ORDER=["momentum","strength","breadth","putCall","volatility","safeHaven","junkBond"];
const date=(s:string|null)=>s?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:"—";
const stamp=(s:string)=>Date.parse(`${date(s)}T00:00:00Z`);
const notices={WARMUP:"계산 준비 중",UNAVAILABLE:"현재 Revision 7 자료를 확인할 수 없습니다",STALE:"자료 갱신이 지연되고 있습니다",READY:"Revision 7 공포·탐욕 방향 점수"};

function Card({item,index}:{item:Indicator;index:number}){
 const [months,setMonths]=useState(3);
 const end=item.observationDate,cutoff=end?new Date(stamp(end)):null;
 cutoff?.setUTCMonth(cutoff.getUTCMonth()-months);
 const history=item.history.filter(p=>cutoff&&stamp(p.date)>=cutoff.getTime()).map(p=>({...p,time:stamp(p.date)}));
 return <article className="min-w-0 border border-slate-300 bg-white p-4 text-slate-900 sm:p-5">
  <h3 className="text-lg font-extrabold">{item.name}</h3>
  <div className="mt-3 text-3xl font-bold tabular-nums">{typeof item.score==='number'?item.score.toFixed(1):'—'}<span className="ml-1 text-sm font-normal text-slate-500">점 / 100</span></div>
  <p className="mt-2 text-sm">{item.changePoints!==null?`이전 관측 대비 ${item.changePoints>=0?'+':''}${item.changePoints.toFixed(1)}점`:'이전 비교 자료 없음'}</p>
  <p className="mt-1 text-xs text-slate-500">관측 기준일 {date(end)}</p>
  <p role="status" className="mt-2 min-h-6 text-sm text-slate-600">{notices[item.status]}</p>
  <div role="group" aria-label={`${item.name} 차트 기간`} className="mt-3 flex gap-1">{[1,3,12].map(m=><button key={m} type="button" aria-pressed={months===m} onClick={()=>setMonths(m)} className={`min-h-11 min-w-14 border px-3 text-sm ${months===m?"border-slate-700 bg-slate-800 text-white":"border-slate-200 bg-white text-slate-700"}`}>{m===12?"1년":`${m}개월`}</button>)}</div>
  <div className="mt-3 h-[120px] min-w-0 sm:h-[140px]">
   {history.some(p=>p.score!==null)?<ResponsiveContainer width="100%" height="100%"><LineChart data={history} accessibilityLayer margin={{top:8,right:12,left:-22,bottom:0}}>
    <CartesianGrid stroke="#e2e8f0" vertical={false}/><XAxis type="number" dataKey="time" domain={["dataMin","dataMax"]} tickFormatter={v=>new Date(v).toISOString().slice(5,10)} tick={{fontSize:10}} minTickGap={30}/><YAxis domain={[0,100]} ticks={[0,50,100]} tick={{fontSize:10}}/>
    <Tooltip labelFormatter={v=>new Date(Number(v)).toISOString().slice(0,10)} formatter={v=>[typeof v==="number"?`${v.toFixed(1)}점`:"자료 없음","공포·탐욕 방향 점수"]}/>
    <Line type="linear" dataKey="score" stroke={index%2?"#b45309":"#475569"} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false}/>
   </LineChart></ResponsiveContainer>:<div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">표시할 유효 이력이 없습니다</div>}
  </div>

 </article>;
}
export default function KoreaFunds(){
 const {indicators,loading}=useKoreaFunds();
 const ordered=ORDER.map(id=>indicators.find(item=>item.id===id)).filter((x):x is Indicator=>Boolean(x));
 return <section className="mt-6 min-w-0" aria-labelledby="korea-funds-title" data-testid="korea-funds">
  <div className="mb-3 flex items-center gap-2"><h2 id="korea-funds-title" className="text-xl font-extrabold text-white">한국 공탐 구성지표 · Revision 7</h2><span className="border border-slate-500 px-2 py-1 text-xs text-slate-200">연구용 베타</span></div>
  {!loading&&ordered.length===0?<p className="border border-slate-600 p-4 text-sm text-slate-300">Revision 7 구성지표를 확인할 수 없습니다.</p>:<div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">{ordered.map((item,index)=><Card key={item.id} item={item} index={index}/>)}</div>}
  <p className="mt-3 text-xs leading-6 text-slate-300">한국거래소 통계정보와 한국은행 ECOS 원자료를 ZGmini가 Revision 7 산식으로 자체 가공한 연구용 베타입니다. 원자료를 그대로 재배포하지 않으며 공식기관의 공포·탐욕지수 또는 매매 추천이 아닙니다.</p>
 </section>;
}
