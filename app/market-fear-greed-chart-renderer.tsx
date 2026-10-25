import {useDashboardMobileAxis} from '../hooks/use-dashboard-mobile-axis';
import { useContext, useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import {fearGreedStateColor} from '../lib/fear-greed-state-color.mjs';
import {chartExtrema} from '../lib/chart-extrema.mjs';
import ChartExtremumPoint from '../components/chart-extremum-point';
import {
  Area,
  AreaChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {MarketChartAnimationContext} from './market-chart-animation-context';
import type {MarketFearGreedChartPoint,MarketFearGreedChartValidPoint} from './market-fear-greed-chart';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;

    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener?.('change', sync);

    return () => media.removeEventListener?.('change', sync);
  }, []);

  return reduced;
}

export function MarketFearGreedChart({
  data,
  axisTicks,
  axisLabels,
  latestPoint,
  gapGuides = [],
  dashed = false,
  instanceKey,
  gradientId,
  formatTooltipLabel,
  emptyLabel = '이력 없음',
  compact = false,
  color = '#ff7076',
  showExtrema = false,
  axisTickInterval = 0,
  marketScoreBands = false,
}: {
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
}) {
  const mobileAxisRight=useDashboardMobileAxis();
  const animate=useContext(MarketChartAnimationContext);
  const prefersReducedMotion = usePrefersReducedMotion();
  const extrema=compact||!showExtrema?[]:chartExtrema(data.map(p=>({date:/^\d{8}$/.test(p.date)?`${p.date.slice(0,4)}-${p.date.slice(4,6)}-${p.date.slice(6,8)}`:p.date.slice(0,10),value:p.score})));

  if (data.length === 0 || (!compact && data.length === 1)) {
    return <div className="cnn-chart-empty"><CircleAlert size={18}/><span>{emptyLabel}</span></div>;
  }

  return <div
    className="cnn-history-chart-hitbox"
    onMouseDown={event=>event.preventDefault()}
  >
    <ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}>
    <AreaChart data={data} accessibilityLayer={false} tabIndex={-1} margin={compact ? {top:6,right:6,left:6,bottom:6} : mobileAxisRight ? {top:10,right:6,left:8,bottom:0} : { top: 6, right: 14, left: 0, bottom: 4 }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".6"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <XAxis
        hide={compact}
        dataKey="date"
        ticks={axisTicks}
        interval={axisTickInterval}
        axisLine={false}
        tickLine={false}
        tickMargin={5}
        tickFormatter={(value) => axisLabels.get(String(value)) ?? ''}
        tick={{ fill: 'var(--zg-text-meta,#a8bcd0)', fontSize: 9 }}
      />
      <YAxis orientation={mobileAxisRight?"right":"left"}
        hide={compact}
        domain={[0, 100]}
        ticks={[0, 25, 50, 75, 100]}
        axisLine={false}
        tickLine={false}
        width={28}
        tick={{ fill: 'var(--zg-text-meta,#a8bcd0)', fontSize: 9 }}
      />
      {marketScoreBands?<>
        <ReferenceArea y1={0} y2={25} fill="#ef4444" fillOpacity={0.055} ifOverflow="hidden"/>
        <ReferenceArea y1={25} y2={40} fill="#f59e0b" fillOpacity={0.04} ifOverflow="hidden"/>
        <ReferenceArea y1={40} y2={60} fill="#94a3b8" fillOpacity={0.04} ifOverflow="hidden"/>
        <ReferenceArea y1={60} y2={75} fill="#22c55e" fillOpacity={0.04} ifOverflow="hidden"/>
        <ReferenceArea y1={75} y2={100} fill="#10b981" fillOpacity={0.045} ifOverflow="hidden"/>
        <ReferenceLine y={25} stroke="rgba(239,68,68,.45)" strokeDasharray="3 5" strokeWidth={1}/>
        <ReferenceLine y={40} stroke="rgba(245,158,11,.7)" strokeDasharray="3 5" strokeWidth={1}/>
        <ReferenceLine y={60} stroke="rgba(148,163,184,.7)" strokeDasharray="3 5" strokeWidth={1}/>
        <ReferenceLine y={75} stroke="rgba(34,197,94,.45)" strokeDasharray="3 5" strokeWidth={1}/>
      </>:<>
        <ReferenceArea y1={0} y2={25} fill="#8f1f2f" fillOpacity={0.055} ifOverflow="hidden"/>
        <ReferenceArea y1={25} y2={45} fill="#f2555a" fillOpacity={0.035} ifOverflow="hidden"/>
        <ReferenceArea y1={45} y2={55} fill="#9aa8b6" fillOpacity={0.045} ifOverflow="hidden"/>
        <ReferenceArea y1={55} y2={75} fill="#58c88a" fillOpacity={0.03} ifOverflow="hidden"/>
        <ReferenceArea y1={75} y2={100} fill="#15865e" fillOpacity={0.04} ifOverflow="hidden"/>
        <ReferenceLine y={25} stroke="rgba(255,98,107,.40)" strokeDasharray="3 5" strokeWidth={1}/>
        <ReferenceLine y={45} stroke="rgba(240,163,74,.80)" strokeDasharray="3 5" strokeWidth={1}/>
        <ReferenceLine y={55} stroke="rgba(168,188,208,.80)" strokeDasharray="3 5" strokeWidth={1}/>
        <ReferenceLine y={75} stroke="rgba(35,201,143,.40)" strokeDasharray="3 5" strokeWidth={1}/>
      </>}
      {latestPoint ? <ReferenceDot
        key={`latest-${instanceKey}-${latestPoint.date}-${latestPoint.score}`}
        className="cnn-latest-point"
        x={latestPoint.date}
        y={latestPoint.score}
        r={compact ? 3 : 4.4}
        fill={color}
        stroke="#fff7f7"
        strokeWidth={2}
        ifOverflow="visible"
      /> : null}
      <Tooltip
        isAnimationActive="auto"
        cursor={{ stroke: 'var(--zg-chart-crosshair,#aab2bc)', strokeDasharray: '3 4' }}
        content={({ active, payload: tooltipPayload, label: tooltipLabel }) => {
          if (!active || !tooltipPayload?.length) return null;
          const rawTooltipValue = tooltipPayload[0]?.value;
          const tooltipValue = typeof rawTooltipValue === 'number' && Number.isFinite(rawTooltipValue)
            ? rawTooltipValue
            : null;
          return <div className="cnn-history-tooltip">
            <span>{formatTooltipLabel(String(tooltipLabel))}</span>
            <strong style={{color:marketScoreBands?(tooltipValue===null?'#94a3b8':tooltipValue<25?'#ef4444':tooltipValue<40?'#f59e0b':tooltipValue<60?'#94a3b8':tooltipValue<75?'#22c55e':'#10b981'):fearGreedStateColor(tooltipValue===null?'확인 불가':tooltipValue<45?'공포':tooltipValue<=55?'중립':'탐욕')}}>{tooltipValue === null ? '—' : tooltipValue.toFixed(1)}</strong>
          </div>;
        }}
      />
      <Area
        type="monotone"
        dataKey="score"
        stroke={color}
        strokeDasharray={dashed ? '5 5' : undefined}
        fill={`url(#${gradientId})`}
        strokeWidth={2.2}
        dot={false}
        connectNulls={false}
        activeDot={{ r: 3.5, strokeWidth: 0, fill: color }}
        isAnimationActive={animate && !compact && !prefersReducedMotion}
        animationBegin={120}
        animationDuration={950}
        animationEasing="ease-out"
      />
      {gapGuides.map(guide=><ReferenceLine key={`missing-guide-${guide.from.date}-${guide.to.date}`} segment={[{x:guide.from.date,y:guide.from.score},{x:guide.to.date,y:guide.to.score}]} stroke={color} strokeWidth={1.6} strokeDasharray="4 5" strokeOpacity={0.65} ifOverflow="hidden"/>)}
      {extrema.map(point=><ReferenceDot key={'extreme-'+point.kind} x={data[point.index].date} y={point.value} ifOverflow="visible" shape={<ChartExtremumPoint point={point} peerIndex={extrema.find(p=>p.kind!==point.kind)?.index} samples={data.map(p=>({x:p.date,value:p.score}))} count={data.length} color={color}/>}/>)}
    </AreaChart>
    </ResponsiveContainer>
  </div>;
}

export default MarketFearGreedChart;
