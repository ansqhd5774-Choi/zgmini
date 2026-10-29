"use client";

import {useMemo} from 'react';
import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {useStoredIndex} from '../../components/use-stored-index';
import {configuredChartSeries,type ConfiguredHistoryPoint} from '../../lib/theme-configured-series';

type PublicConfiguredTheme={
 id:string;theme:string;etfs:string[];methodologyVersion:string;
 observationDate:string;sourceStoredAt:string;score:number;
 history:ConfiguredHistoryPoint[];
};
type PublicIndex={status:'READY'|'PENDING'|'UNAVAILABLE';themes:PublicConfiguredTheme[]};

function ConfiguredChart({theme}:{theme:PublicConfiguredTheme}){
 const values=useMemo(()=>configuredChartSeries(theme.history),[theme.history]);
 const latest=theme.history.at(-1);
 return <article className="zg-tfg-configured-card" aria-label={`${theme.theme} 공포·탐욕`}>
  <header className="zg-tfg-configured-card-head">
   <div><h3>{theme.theme}</h3><p>{theme.etfs.join(' · ')} + SPY · {theme.observationDate} 관측</p></div>
   <div className="zg-tfg-configured-score"><strong>{theme.score.toFixed(1)}</strong><span>{latest?.status==='R188_COMPATIBLE'?'확정':'잠정'}</span></div>
  </header>
  <div className="zg-tfg-configured-graph" role="img" aria-label={`${theme.theme} 실제 거래일별 점수 그래프, 빈 거래일은 연결하지 않음`}>
   <ResponsiveContainer width="100%" height="100%">
    <LineChart data={values} margin={{top:10,right:12,bottom:0,left:-24}}>
     <CartesianGrid stroke="#25485b" strokeDasharray="2 4" vertical={false}/>
     <XAxis dataKey="date" tickFormatter={value=>String(value).slice(5)} minTickGap={24} tick={{fill:'#8eabbc',fontSize:10}} axisLine={false} tickLine={false}/>
     <YAxis domain={[0,100]} ticks={[0,25,50,75,100]} tick={{fill:'#8eabbc',fontSize:10}} axisLine={false} tickLine={false}/>
     <Tooltip labelFormatter={date=>`거래일 ${date}`} formatter={(value,name)=>[typeof value==='number'?value.toFixed(2):'–',name==='confirmed'?'확정':'잠정']}/>
     <Line name="confirmed" type="linear" dataKey="confirmed" stroke="#33d8c3" strokeWidth={2.2} dot={false} isAnimationActive={false} connectNulls={false}/>
     <Line name="provisional" type="linear" dataKey="provisional" stroke="#e5b869" strokeWidth={2.2} strokeDasharray="5 4" dot={false} isAnimationActive={false} connectNulls={false}/>
    </LineChart>
   </ResponsiveContainer>
  </div>
  <footer className="zg-tfg-configured-foot"><span><i className="zg-tfg-line-confirmed"/>확정</span><span><i className="zg-tfg-line-provisional"/>잠정</span><small>원본 저장 {theme.sourceStoredAt.slice(0,10)} · 실제 결측 미연결</small></footer>
 </article>;
}

export default function ConfiguredThemeSection(){
 const {payload,error}=useStoredIndex<PublicIndex>('/api/theme-configured');
 // Fail closed: never retain old scores when the stored reader reports error.
 const themes=!error&&payload?.status==='READY'&&Array.isArray(payload.themes)?payload.themes:[];
 if(!themes.length)return null;
 return <section className="zg-tfg-configured" aria-labelledby="zg-tfg-configured-heading">
  <header><h2 id="zg-tfg-configured-heading">추가 승인 테마</h2><p>기존 10개 테마와 별도로, 원본·산식·공개 승인이 검증된 테마만 표시됩니다.</p></header>
  <div className="zg-tfg-configured-grid">{themes.map(theme=><ConfiguredChart key={theme.id} theme={theme}/>)}</div>
 </section>;
}
