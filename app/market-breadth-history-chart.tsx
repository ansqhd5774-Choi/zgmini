"use client";

import {useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent} from 'react';
import styles from './market-breadth-strip.module.css';
import {getMarketPeriodConfig, getMarketPeriodDays, type MarketPeriod} from './market-card-shared';
import {trailingFiveSessionBreadthMean} from './market-breadth-trend';

export type MarketBreadthPeriod = MarketPeriod | '1D';

export type UsBreadthHistoryRecord = {
  observationDate: string;
  eligibleCount: number;
  counts: {rising: number; unchanged: number; falling: number};
};

export type UsBreadthHistory = {
  market: 'usa';
  universe: 'SP500';
  window: '1Y';
  from: string;
  to: string;
  records: UsBreadthHistoryRecord[];
};

const plot = {left: 8, right: 592, top: 12, bottom: 146};
const dateMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
const dateLabel = (day: string) => day.replaceAll('-', '.');
const countLabel = new Intl.NumberFormat('ko-KR');
const dayMs = 86_400_000;

export function MarketBreadthHistoryChart({history, period}: {history: UsBreadthHistory; period: MarketBreadthPeriod}) {
  const [selected, setSelected] = useState<number | null>(null);
  const tooltipId = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef<{clientX: number; clientY: number} | null>(null);
  const days = period === '1D' ? 1 : getMarketPeriodDays(period);
  const periodLabel = period === '1D' ? '1일' : getMarketPeriodConfig(period).label;
  const maxTime = dateMs(history.to);
  const minTime = period === '1Y' ? dateMs(history.from) : maxTime - (days - 1) * dayMs;
  const from = period === '1Y' ? history.from : new Date(minTime).toISOString().slice(0, 10);
  const records = history.records.filter(record => {
    const time = dateMs(record.observationDate);
    return time >= minTime && time <= maxTime;
  });

  // Resolve the floating box against real DOM rectangles, not image pixels or assumed widths.
  const positionTooltip = (clientX: number, clientY: number) => {
    const plot = plotRef.current;
    const tip = tooltipRef.current;
    if (!plot || !tip) return;
    const bounds = plot.getBoundingClientRect();
    const tipBounds = tip.getBoundingClientRect();
    const margin = 6;
    const pointerGap = 12;
    const pointerX = clientX - bounds.left;
    const pointerY = clientY - bounds.top;
    const rightSide = pointerX + pointerGap;
    const leftSide = pointerX - tipBounds.width - pointerGap;
    const preferredLeft = rightSide + tipBounds.width + margin <= bounds.width
      ? rightSide : leftSide >= margin ? leftSide : rightSide;
    const maxLeft = Math.max(margin, bounds.width - tipBounds.width - margin);
    const maxTop = Math.max(margin, bounds.height - tipBounds.height - margin);
    tip.style.left = `${Math.min(maxLeft, Math.max(margin, preferredLeft))}px`;
    tip.style.top = `${Math.min(maxTop, Math.max(margin, pointerY - tipBounds.height / 2))}px`;
    tip.style.visibility = 'visible';
  };

  // The first pointer event mounts the tooltip; measure and position it before paint.
  useLayoutEffect(() => {
    if (selected !== null && lastPointerRef.current) {
      positionTooltip(lastPointerRef.current.clientX, lastPointerRef.current.clientY);
    }
  }, [selected]);
  if (!records.length) return <p className={styles.historyEmpty}>선택한 {periodLabel} 기간에 보관된 확정치 이력이 없습니다.</p>;

  // Filter by calendar period, but give each real trading session equal X-axis spacing.
  const indexByDate = new Map(records.map((record, index) => [record.observationDate, index]));
  const scaleX = (day: string) => records.length <= 1 ? (plot.left + plot.right) / 2
    : plot.left + (indexByDate.get(day) ?? 0) / (records.length - 1) * (plot.right - plot.left);
  const net = (record: UsBreadthHistoryRecord) => 100 * (record.counts.rising - record.counts.falling) / record.eligibleCount;
  // The rolling value is derived from full history before filtering the viewed period.
  const fiveSessionMean = trailingFiveSessionBreadthMean(history.records.map(record => ({date: record.observationDate, value: net(record)})));
  const trendPoints = records.flatMap(record => {
    const value = fiveSessionMean.get(record.observationDate);
    return value === undefined ? [] : [{date: record.observationDate, value}];
  });
  const bound = Math.min(100, Math.max(20, Math.ceil(Math.max(...records.map(record => Math.abs(net(record))), ...trendPoints.map(point => Math.abs(point.value))) / 10) * 10));
  const scaleY = (value: number) => plot.top + (bound - value) / (2 * bound) * (plot.bottom - plot.top);
  const trendPaths: string[] = [];
  let previousTrendDate: string | null = null;
  for (const point of trendPoints) {
    const command = previousTrendDate !== null && dateMs(point.date) - dateMs(previousTrendDate) <= 4 * dayMs ? 'L' : 'M';
    if (command === 'M') trendPaths.push('');
    trendPaths[trendPaths.length - 1] += `${command}${scaleX(point.date).toFixed(2)},${scaleY(point.value).toFixed(2)} `;
    previousTrendDate = point.date;
  }
  const baseline = scaleY(0);
  const barWidth = Math.min(8, Math.max(1.25, records.length > 1 ? 0.7 * (plot.right - plot.left) / (records.length - 1) : 8));
  const at = Math.min(selected ?? records.length - 1, records.length - 1);
  const focused = records[at];
  const x = scaleX(focused.observationDate);
  const focusedNet = net(focused);
  const focusedMean = fiveSessionMean.get(focused.observationDate);
  const latestNet = net(records[records.length - 1]);
  const asPct = (record: UsBreadthHistoryRecord, key: keyof UsBreadthHistoryRecord['counts']) => 100 * record.counts[key] / record.eligibleCount;

  const setPointer = (clientX: number, clientY: number) => {
    lastPointerRef.current = {clientX, clientY};
    positionTooltip(clientX, clientY);
  };
  const setKeyboardPointer = (svg: SVGSVGElement, index: number) => {
    const bounds = svg.getBoundingClientRect();
    const record = records[index];
    if (!record) return;
    setPointer(
      bounds.left + scaleX(record.observationDate) / 600 * bounds.width,
      bounds.top + scaleY(net(record)) / 160 * bounds.height
    );
  };
  const selectAtPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    setPointer(event.clientX, event.clientY);
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width) return;
    // Map browser CSS pixels through the actual rendered SVG width, never a screenshot.
    const svgX = Math.max(0, Math.min(600, (event.clientX - bounds.left) / bounds.width * 600));
    let nearest = 0;
    let distance = Infinity;
    for (let i = 0; i < records.length; i++) {
      const current = Math.abs(scaleX(records[i].observationDate) - svgX);
      if (current < distance) {
        distance = current;
        nearest = i;
      }
    }
    // Always select an actual stored trading day; missing dates are not synthesized.
    setSelected(nearest);
  };
  const selectAtKeyboard = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    let next: number;
    switch (event.key) {
      case 'ArrowLeft': next = Math.max(0, at - 1); break;
      case 'ArrowRight': next = Math.min(records.length - 1, at + 1); break;
      case 'Home': next = 0; break;
      case 'End': next = records.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setSelected(next);
    setKeyboardPointer(event.currentTarget, next);
  };

  return <div className={styles.historyChart}>
    <div className={styles.historyNetHeading}><strong>일별 상승−하락 우세도</strong>
      <span className={latestNet > 0 ? styles.up : latestNet < 0 ? styles.down : styles.flat}>{latestNet > 0 ? '▲ 상승 우세' : latestNet < 0 ? '▼ 하락 우세' : '― 균형'} {latestNet > 0 ? '+' : ''}{latestNet.toFixed(1)}%p</span>
    </div>
    <div className={styles.historyTrendLegend}><span aria-hidden="true"/>5거래일 평균 · 후행 SMA</div>
    <div className={styles.historyPlot}>
      <div className={styles.historyPercentAxis} aria-hidden="true"><span>+{bound}</span><span>0%p</span><span>−{bound}</span></div>
      <div className={styles.historySvgWrap} ref={plotRef}>
        <svg viewBox="0 0 600 160" preserveAspectRatio="none" role="img" tabIndex={0}
          aria-label={`S&P 500 일별 상승·하락 우세도 ${periodLabel} 이력과 5거래일 후행 단순이동평균. 저장된 ${records.length}개 거래일. 0%p 위는 상승 우세, 아래는 하락 우세입니다. 마우스 또는 터치로 날짜별 수치를 확인하고, 키보드 좌우 방향키로 이동할 수 있습니다.`}
          aria-describedby={selected !== null ? tooltipId : undefined}
          onPointerEnter={selectAtPointer}
          onPointerMove={selectAtPointer}
          onPointerDown={selectAtPointer}
          onPointerLeave={event => {if (event.pointerType !== 'touch') {lastPointerRef.current = null; setSelected(null);}}}
          onFocus={event => {
            const index = Math.min(selected ?? records.length - 1, records.length - 1);
            setSelected(index);
            setKeyboardPointer(event.currentTarget, index);
          }}
          onBlur={() => {lastPointerRef.current = null; setSelected(null);}}
          onKeyDown={selectAtKeyboard}>
          {[-bound, 0, bound].map(value => <line key={value} x1={plot.left} x2={plot.right} y1={scaleY(value)} y2={scaleY(value)} className={value === 0 ? styles.historyMidline : styles.historyGridline}/>)}
          <rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} fill="transparent" pointerEvents="all"/>
          {records.map(record => {
            const value = net(record);
            const y = scaleY(value);
            return <rect key={record.observationDate} x={scaleX(record.observationDate) - barWidth / 2} y={Math.min(y, baseline)} width={barWidth}
              height={Math.max(1, Math.abs(y - baseline))} className={value > 0 ? styles.historyNetPositiveBar : value < 0 ? styles.historyNetNegativeBar : styles.historyNetNeutralBar}/>;
          })}
          {trendPaths.map((path, index) => <path key={index} d={path.trim()} className={styles.historyTrendLine} pointerEvents="none"/>)}
          {trendPoints.length === 1 && <circle cx={scaleX(trendPoints[0].date)} cy={scaleY(trendPoints[0].value)} r="3" className={styles.historyTrendDot} pointerEvents="none"/>}
          <line x1={x} x2={x} y1={plot.top} y2={plot.bottom} className={styles.historyCursor}/>
          <circle cx={x} cy={scaleY(focusedNet)} r="4" className={focusedNet > 0 ? styles.historyRisingDot : focusedNet < 0 ? styles.historyFallingDot : styles.historyNetNeutralDot}/>
        </svg>
        {selected !== null && <div id={tooltipId} ref={tooltipRef} className={styles.historyTooltip} role="status">
          <time dateTime={focused.observationDate}>{dateLabel(focused.observationDate)}</time>
          <div><span className={focusedNet > 0 ? styles.up : focusedNet < 0 ? styles.down : styles.flat}>{focusedNet > 0 ? '▲ 상승 우세' : focusedNet < 0 ? '▼ 하락 우세' : '― 균형'}</span><strong>{focusedNet > 0 ? '+' : ''}{focusedNet.toFixed(1)}%p</strong></div>
          <div><span className={styles.historyTrendValue}>5거래일 평균</span><strong>{focusedMean === undefined ? '자료 부족' : `${focusedMean > 0 ? '+' : ''}${focusedMean.toFixed(1)}%p`}</strong></div>
          <div><span className={styles.up}>▲ 상승</span><strong>{countLabel.format(focused.counts.rising)}개 ({asPct(focused, 'rising').toFixed(1)}%)</strong></div>
          <div><span className={styles.flat}>― 보합</span><strong>{countLabel.format(focused.counts.unchanged)}개 ({asPct(focused, 'unchanged').toFixed(1)}%)</strong></div>
          <div><span className={styles.down}>▼ 하락</span><strong>{countLabel.format(focused.counts.falling)}개 ({asPct(focused, 'falling').toFixed(1)}%)</strong></div>
        </div>}
      </div>
      <div className={styles.historyDates}><time>{dateLabel(from)}</time><time>{dateLabel(history.to)}</time></div>
    </div>
  </div>;
}
