"use client";

import {useId, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent} from 'react';
import styles from './market-breadth-strip.module.css';

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

export function MarketBreadthHistoryChart({history}: {history: UsBreadthHistory}) {
  const [selected, setSelected] = useState<number | null>(null);
  const tooltipId = useId();
  const records = history.records;
  if (!records.length) return <p className={styles.historyEmpty}>아직 보관된 확정치 이력이 없습니다. 데이터가 게시되면 실제 거래일별로 누적됩니다.</p>;

  const minTime = dateMs(history.from);
  const maxTime = dateMs(history.to);
  const scaleX = (day: string) => plot.left + (dateMs(day) - minTime) / Math.max(1, maxTime - minTime) * (plot.right - plot.left);
  const scaleY = (percentage: number) => plot.bottom - percentage / 100 * (plot.bottom - plot.top);
  const asPct = (record: UsBreadthHistoryRecord, key: keyof UsBreadthHistoryRecord['counts']) => 100 * record.counts[key] / record.eligibleCount;
  const line = (key: keyof UsBreadthHistoryRecord['counts']) => records.map((record, i) => {
    const previous = records[i - 1];
    const dayGap = previous ? (dateMs(record.observationDate) - dateMs(previous.observationDate)) / 86_400_000 : Infinity;
    return `${dayGap > 5 ? 'M' : 'L'}${scaleX(record.observationDate).toFixed(2)},${scaleY(asPct(record, key)).toFixed(2)}`;
  }).join(' ');
  const at = Math.min(selected ?? records.length - 1, records.length - 1);
  const focused = records[at];
  const x = scaleX(focused.observationDate);
  const showFlat = records.some(record => record.counts.unchanged > 0);

  const selectAtPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
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
  };

  return <div className={styles.historyChart}>
    <div className={styles.historyPlot}>
      <div className={styles.historyPercentAxis} aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div>
      <div className={styles.historySvgWrap}>
        <svg viewBox="0 0 600 160" preserveAspectRatio="none" role="img" tabIndex={0}
          aria-label={`S&P 500 상승·하락 종목 비율 1년 이력. 저장된 ${records.length}개 거래일. 마우스 또는 터치로 날짜별 수치를 확인하고, 키보드 좌우 방향키로 이동할 수 있습니다.`}
          aria-describedby={selected !== null ? tooltipId : undefined}
          onPointerEnter={selectAtPointer}
          onPointerMove={selectAtPointer}
          onPointerDown={selectAtPointer}
          onPointerLeave={event => {if (event.pointerType !== 'touch') setSelected(null);}}
          onFocus={() => setSelected(value => value ?? records.length - 1)}
          onBlur={() => setSelected(null)}
          onKeyDown={selectAtKeyboard}>
          {[0, 50, 100].map(value => <line key={value} x1={plot.left} x2={plot.right} y1={scaleY(value)} y2={scaleY(value)} className={value === 50 ? styles.historyMidline : styles.historyGridline}/>)}
          <rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} fill="transparent" pointerEvents="all"/>
          <path d={line('rising')} className={styles.historyRisingLine}/>
          {showFlat && <path d={line('unchanged')} className={styles.historyUnchangedLine}/>}
          <path d={line('falling')} className={styles.historyFallingLine}/>
          <line x1={x} x2={x} y1={plot.top} y2={plot.bottom} className={styles.historyCursor}/>
          <circle cx={x} cy={scaleY(asPct(focused, 'rising'))} r="4" className={styles.historyRisingDot}/>
          <circle cx={x} cy={scaleY(asPct(focused, 'falling'))} r="4" className={styles.historyFallingDot}/>
        </svg>
        {selected !== null && <div id={tooltipId} className={styles.historyTooltip} role="status">
          <time dateTime={focused.observationDate}>{dateLabel(focused.observationDate)}</time>
          <div><span className={styles.up}>▲ 상승</span><strong>{countLabel.format(focused.counts.rising)}개 ({asPct(focused, 'rising').toFixed(1)}%)</strong></div>
          <div><span className={styles.flat}>― 보합</span><strong>{countLabel.format(focused.counts.unchanged)}개 ({asPct(focused, 'unchanged').toFixed(1)}%)</strong></div>
          <div><span className={styles.down}>▼ 하락</span><strong>{countLabel.format(focused.counts.falling)}개 ({asPct(focused, 'falling').toFixed(1)}%)</strong></div>
        </div>}
      </div>
      <div className={styles.historyDates}><time>{dateLabel(history.from)}</time><time>{dateLabel(history.to)}</time></div>
    </div>
  </div>;
}
