"use client";

import {useState} from 'react';
import styles from './market-breadth-strip.module.css';
import {getMarketPeriodConfig, getMarketPeriodDays, type MarketPeriod} from './market-card-shared';

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
const dayMs = 86_400_000;

export function MarketBreadthHistoryChart({history, period}: {history: UsBreadthHistory; period: MarketBreadthPeriod}) {
  const [selected, setSelected] = useState<number | null>(null);
  const days = period === '1D' ? 1 : getMarketPeriodDays(period);
  const periodLabel = period === '1D' ? '1일' : getMarketPeriodConfig(period).label;
  const maxTime = dateMs(history.to);
  const minTime = period === '1Y' ? dateMs(history.from) : maxTime - (days - 1) * dayMs;
  const from = period === '1Y' ? history.from : new Date(minTime).toISOString().slice(0, 10);
  const records = history.records.filter(record => {
    const time = dateMs(record.observationDate);
    return time >= minTime && time <= maxTime;
  });
  if (!records.length) return <p className={styles.historyEmpty}>선택한 {periodLabel} 기간에 보관된 확정치 이력이 없습니다.</p>;

  const scaleX = (day: string) => maxTime <= minTime ? (plot.left + plot.right) / 2 : plot.left + (dateMs(day) - minTime) / (maxTime - minTime) * (plot.right - plot.left);
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

  return <div className={styles.historyChart}>
    <div className={styles.historyPlot}>
      <div className={styles.historyPercentAxis} aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div>
      <svg viewBox="0 0 600 160" preserveAspectRatio="none" role="img"
        aria-label={`S&P 500 상승·하락 종목 비율의 ${periodLabel} 이력. 실제 보관된 ${records.length}개 거래일만 표시하며, 누락된 구간은 연결하지 않습니다.`}>
        {[0, 50, 100].map(value => <line key={value} x1={plot.left} x2={plot.right} y1={scaleY(value)} y2={scaleY(value)} className={value === 50 ? styles.historyMidline : styles.historyGridline}/>)}
        <path d={line('rising')} className={styles.historyRisingLine}/>
        {showFlat && <path d={line('unchanged')} className={styles.historyUnchangedLine}/>}
        <path d={line('falling')} className={styles.historyFallingLine}/>
        <line x1={x} x2={x} y1={plot.top} y2={plot.bottom} className={styles.historyCursor}/>
        <circle cx={x} cy={scaleY(asPct(focused, 'rising'))} r="4" className={styles.historyRisingDot}/>
        <circle cx={x} cy={scaleY(asPct(focused, 'falling'))} r="4" className={styles.historyFallingDot}/>
      </svg>
      <div className={styles.historyDates}><time>{dateLabel(from)}</time><time>{dateLabel(history.to)}</time></div>
    </div>
    <input className={styles.historySlider} type="range" min="0" max={Math.max(0, records.length - 1)} step="1" value={at}
      onChange={event => setSelected(Number(event.currentTarget.value))} aria-label="확정치 이력 거래일 선택" disabled={records.length < 2}/>
  </div>;
}
