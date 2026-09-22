import { useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
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

export type MarketFearGreedChartPoint = {
  date: string;
  score: number | null;
};

export type MarketFearGreedChartValidPoint = {
  date: string;
  score: number;
};

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
  instanceKey,
  gradientId,
  formatTooltipLabel,
  emptyLabel = '이력 없음',
  compact = false,
}: {
  data: MarketFearGreedChartPoint[];
  axisTicks: string[];
  axisLabels: ReadonlyMap<string, string>;
  latestPoint: MarketFearGreedChartValidPoint | null;
  instanceKey: string;
  gradientId: string;
  formatTooltipLabel: (value: string) => string;
  emptyLabel?: string;
  compact?: boolean;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (data.length === 0 || (!compact && data.length === 1)) {
    return <div className="cnn-chart-empty"><CircleAlert size={18}/><span>{emptyLabel}</span></div>;
  }

  return <ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}>
    <AreaChart data={data} accessibilityLayer margin={compact ? {top:6,right:6,left:6,bottom:6} : { top: 6, right: 14, left: 0, bottom: 4 }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff626b" stopOpacity=".6"/>
          <stop offset="100%" stopColor="#ff626b" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <XAxis
        hide={compact}
        dataKey="date"
        ticks={axisTicks}
        interval={0}
        axisLine={false}
        tickLine={false}
        tickMargin={5}
        tickFormatter={(value) => axisLabels.get(String(value)) ?? ''}
        tick={{ fill: 'var(--zg-text-meta,#a8bcd0)', fontSize: 9 }}
      />
      <YAxis
        hide={compact}
        domain={[0, 100]}
        ticks={[0, 50, 75, 100]}
        axisLine={false}
        tickLine={false}
        width={28}
        tick={{ fill: 'var(--zg-text-meta,#a8bcd0)', fontSize: 9 }}
      />
      <ReferenceArea y1={0} y2={25} fill="#8f1f2f" fillOpacity={0.055} ifOverflow="hidden"/>
      <ReferenceArea y1={25} y2={45} fill="#f2555a" fillOpacity={0.035} ifOverflow="hidden"/>
      <ReferenceArea y1={45} y2={55} fill="#9aa8b6" fillOpacity={0.045} ifOverflow="hidden"/>
      <ReferenceArea y1={55} y2={75} fill="#58c88a" fillOpacity={0.03} ifOverflow="hidden"/>
      <ReferenceArea y1={75} y2={100} fill="#15865e" fillOpacity={0.04} ifOverflow="hidden"/>
      <ReferenceLine y={25} stroke="rgba(255,98,107,.40)" strokeDasharray="3 5" strokeWidth={1}/>
      <ReferenceLine y={45} stroke="rgba(240,163,74,.34)" strokeDasharray="3 5" strokeWidth={1}/>
      <ReferenceLine y={55} stroke="rgba(168,188,208,.40)" strokeDasharray="3 5" strokeWidth={1}/>
      <ReferenceLine y={75} stroke="rgba(35,201,143,.40)" strokeDasharray="3 5" strokeWidth={1}/>
      {latestPoint ? <ReferenceDot
        key={`latest-${instanceKey}-${latestPoint.date}-${latestPoint.score}`}
        className="cnn-latest-point"
        x={latestPoint.date}
        y={latestPoint.score}
        r={compact ? 3 : 4.4}
        fill="#ff7076"
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
            <strong>{tooltipValue === null ? '—' : tooltipValue.toFixed(1)}</strong>
          </div>;
        }}
      />
      <Area
        type="monotone"
        dataKey="score"
        stroke="#ff7076"
        fill={`url(#${gradientId})`}
        strokeWidth={2.2}
        dot={false}
        connectNulls={false}
        activeDot={{ r: 3.5, strokeWidth: 0, fill: '#ffd1d4' }}
        isAnimationActive={!compact && !prefersReducedMotion}
        animationBegin={120}
        animationDuration={950}
        animationEasing="ease-out"
      />
    </AreaChart>
  </ResponsiveContainer>;
}
