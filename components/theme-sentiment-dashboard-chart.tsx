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
 const {series,data,provisionalBySeries}=themeEtfDashboardSeries(error?null:payload);
 return <div style={{minWidth:0}}><SectorSentimentChart title="테마별 공포·탐욕" draggable themePicker dashboardThemeScores series={series} data={data} provisionalBySeries={provisionalBySeries} showProvisionalNotice={false}/></div>;
}
