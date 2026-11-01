'use client';
import {LineChart,Line,ResponsiveContainer,Tooltip,XAxis,YAxis,CartesianGrid} from 'recharts';
import type {Composite} from '../app/korea-funds-store';
type Row=Composite['history'][number]&{time:number};
export default function KoreaCompositePlot({rows,mini,color}:{rows:Row[];mini:boolean;color:string}){
 const formatDate=(s:string|null)=>s?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:'—';
 return (<ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}><LineChart data={rows} accessibilityLayer margin={{top:8,right:8,left:mini?0:-20,bottom:4}}>
   {!mini&&<CartesianGrid vertical={false} stroke="var(--zg-chart-grid,#365269)" strokeDasharray="3 5" strokeWidth={1}/>}<XAxis hide={mini} type="number" dataKey="time" domain={['dataMin','dataMax']} tickFormatter={v=>new Date(v).toISOString().slice(0,10)} minTickGap={40} axisLine={{stroke:'var(--zg-chart-axis,#60798d)',strokeWidth:1}} tickLine={false} tick={{fontSize:11,fill:"var(--zg-text-meta,#8fa8bb)"}}/><YAxis hide={mini} axisLine={false} tickLine={false} domain={[0,100]} ticks={[0,50,100]} tick={{fontSize:11,fill:"var(--zg-text-meta,#8fa8bb)"}}/>
   <Tooltip content={({active,payload})=>{const p=payload?.[0]?.payload;return active&&p?<div className="rounded border bg-white p-2 text-sm text-slate-900">{formatDate(p.date)}<br/>{p.displayScore===null?'자료 없음':`${p.displayScore.toFixed(1)}점 · ${p.stageLabel}`}</div>:null;}}/>
   <Line type="linear" dataKey="score" stroke={color} dot={false} connectNulls={false} isAnimationActive={false}/>
  </LineChart></ResponsiveContainer>);
}
