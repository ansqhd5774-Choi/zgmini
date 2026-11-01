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
  const net = (record: UsBreadthHistoryRecord) => 100 * (record.counts.rising - record.counts.falling) / record.eligibleCount;
  const bound = Math.min(100, Math.max(20, Math.ceil(Math.max(...records.map(record => Math.abs(net(record)))) / 10) * 10));
  const scaleY = (value: number) => plot.top + (bound - value) / (2 * bound) * (plot.bottom - plot.top);
  const baseline = scaleY(0);
  const barWidth = Math.min(8, Math.max(1.25, maxTime > minTime ? 0.7 * (plot.right - plot.left) * dayMs / (maxTime - minTime) : 8));
  const at = Math.min(selected ?? records.length - 1, records.length - 1);
  const focused = records[at];
  const x = scaleX(focused.observationDate);
  const focusedNet = net(focused);
  const latestNet = net(records[records.length - 1]);

  return <div className={styles.historyChart}>
    <div className={styles.historyNetHeading}><strong>일별 상승−하락 우세도</strong>
      <span className={latestNet > 0 ? styles.up : latestNet < 0 ? styles.down : styles.flat}>{latestNet > 0 ? '▲ 상승 우세' : latestNet < 0 ? '▼ 하락 우세' : '― 균형'} {latestNet > 0 ? '+' : ''}{latestNet.toFixed(1)}%p</span>
    </div>
    <div className={styles.historyPlot}>
      <div className={styles.historyPercentAxis} aria-hidden="true"><span>+{bound}</span><span>0%p</span><span>−{bound}</span></div>
      <svg viewBox="0 0 600 160" preserveAspectRatio="none" role="img"
        aria-label={`S&P 500 일별 상승·하락 우세도 ${periodLabel} 이력. 저장된 ${records.length}개 거래일. 0%p 위는 상승 우세, 아래는 하락 우세이며 보합 종목도 분모에 포함됩니다.`}>
        {[-bound, 0, bound].map(value => <line key={value} x1={plot.left} x2={plot.right} y1={scaleY(value)} y2={scaleY(value)} className={value === 0 ? styles.historyMidline : styles.historyGridline}/>)}
        {records.map(record => {
          const value = net(record);
          const y = scaleY(value);
          return <rect key={record.observationDate} x={scaleX(record.observationDate) - barWidth / 2} y={Math.min(y, baseline)} width={barWidth}
            height={Math.max(1, Math.abs(y - baseline))} className={value > 0 ? styles.historyNetPositiveBar : value < 0 ? styles.historyNetNegativeBar : styles.historyNetNeutralBar}/>;
        })}
        <line x1={x} x2={x} y1={plot.top} y2={plot.bottom} className={styles.historyCursor}/>
        <circle cx={x} cy={scaleY(focusedNet)} r="4" className={focusedNet > 0 ? styles.historyRisingDot : focusedNet < 0 ? styles.historyFallingDot : styles.historyNetNeutralDot}/>
      </svg>
      <div className={styles.historyDates}><time>{dateLabel(from)}</time><time>{dateLabel(history.to)}</time></div>
    </div>
    <input className={styles.historySlider} type="range" min="0" max={Math.max(0, records.length - 1)} step="1" value={at}
      onChange={event => setSelected(Number(event.currentTarget.value))} aria-label="확정치 이력 거래일 선택" disabled={records.length < 2}/>
  </div>;
}
