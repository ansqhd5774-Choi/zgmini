'use client';
import SectorSentimentChart from './sector-sentiment-chart';
import {useStoredIndex} from './use-stored-index';
import {themeEtfDashboardSeries} from '../lib/theme-etf-dashboard.mjs';

type ThemePoint={date:string;score:number};
type ThemeRow={theme:string;score:number;history:ThemePoint[];delayed?:boolean;observationDate?:string};
type ThemeStoredPayload={status:string;observationDate?:string;themes?:ThemeRow[]};

// The chart is read-only: only the published D1 result can supply actual scores.
export default function ThemeSentimentDashboardChart(){
 const {payload,error}=useStoredIndex<ThemeStoredPayload>('/api/theme-fear-greed');
 const {series,data}=themeEtfDashboardSeries(error?null:payload);
 const delayed=payload?.themes?.filter(t=>t.delayed)??[];
 return <div style={{minWidth:0}}><SectorSentimentChart title="테마별 공포·탐욕" draggable themePicker series={series} data={data}/>{delayed.length>0&&<p role="status" style={{margin:'6px 0 0',fontSize:11,color:'#a8bcd0'}}>{delayed.map(t=>`${t.theme} ${t.observationDate}`).join(' · ')} 자료 갱신 지연 · 해당 선은 마지막 관측일까지만 표시합니다.</p>}</div>;
}
