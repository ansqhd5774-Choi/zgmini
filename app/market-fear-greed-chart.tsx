'use client';
import {lazy,Suspense,useContext} from 'react';
import {CircleAlert} from 'lucide-react';
import {useDashboardChartStartup} from '../hooks/use-dashboard-chart-startup';
import {MarketChartAnimationContext} from './market-chart-animation-context';
export {MarketChartAnimationContext} from './market-chart-animation-context';
export type MarketFearGreedChartPoint = {
  date: string;
  score: number | null;
};

export type MarketFearGreedChartValidPoint = {
  date: string;
  score: number;
};


export type MarketFearGreedChartProps = {
  data: MarketFearGreedChartPoint[];
  axisTicks: string[];
  axisLabels: ReadonlyMap<string, string>;
  latestPoint: MarketFearGreedChartValidPoint | null;
  gapGuides?: Array<{from:MarketFearGreedChartValidPoint;to:MarketFearGreedChartValidPoint}>;
  dashed?: boolean;
  instanceKey: string;
  gradientId: string;
  formatTooltipLabel: (value: string) => string;
  emptyLabel?: string;
  compact?: boolean;
  color?: string;
  showExtrema?: boolean;
  axisTickInterval?: 0 | 'preserveStartEnd';
  marketScoreBands?: boolean;
};
const Renderer=lazy(()=>import('./market-fear-greed-chart-renderer'));
export function MarketFearGreedChart(props:MarketFearGreedChartProps){
 const animate=useContext(MarketChartAnimationContext);
 const ready=useDashboardChartStartup(!animate);
 if(props.data.length===0||(!props.compact&&props.data.length===1))return <div className="cnn-chart-empty"><CircleAlert size={18}/><span>{props.emptyLabel??'이력 없음'}</span></div>;
 const placeholder=<div className="cnn-history-chart-hitbox"/>;
 return ready?<Suspense fallback={placeholder}><Renderer {...props}/></Suspense>:placeholder;
}
