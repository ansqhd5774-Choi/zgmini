"use client";
import styles from "./market-breadth-strip.module.css";
import {useStoredIndex} from "../components/use-stored-index";
import {validUsBreadthRecord} from "../lib/market-breadth/us-public-r1.mjs";

/** Verified issue-direction counts; only the US stored-output route is enabled. */
export type MarketBreadthCounts = {
  rising: number;
  unchanged: number;
  falling: number;
};

type MarketBreadthStripProps = {
  market: "usa" | "korea";
  counts?: MarketBreadthCounts | null;
};

type UsaBreadthRecord = {
  market: "usa";
  observationDate: string;
  counts: MarketBreadthCounts;
};

const numberFormat = new Intl.NumberFormat("ko-KR");

function normalizedCounts(counts?: MarketBreadthCounts | null) {
  if (!counts) return null;
  const values = [counts.rising, counts.unchanged, counts.falling];
  if (!values.every((value) => Number.isSafeInteger(value) && value >= 0)) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return null;
  return {
    total,
    rising: counts.rising,
    unchanged: counts.unchanged,
    falling: counts.falling,
    risingPct: (counts.rising / total) * 100,
    unchangedPct: (counts.unchanged / total) * 100,
    fallingPct: (counts.falling / total) * 100,
  };
}

export function MarketBreadthStrip({ market, counts }: MarketBreadthStripProps) {
  const name = market === "usa" ? "미국" : "한국";
  const {payload} = useStoredIndex<UsaBreadthRecord>(
    "/api/market-breadth?market=usa", null, market === "usa" && counts === undefined
  );
  const stored = market === "usa" && validUsBreadthRecord(payload) ? payload : null;
  const data = normalizedCounts(counts === undefined ? stored?.counts : counts);
  const sourceInfo = stored && counts === undefined ? `S&P 500 · ${stored.observationDate} 기준` : null;
  const dominance = !data || Math.abs(data.risingPct - data.fallingPct) < 5
    ? "none"
    : data.risingPct > data.fallingPct ? "up" : "down";

  const columns = [
    { key: "up", label: "상승", symbol: "▲", count: data?.rising, pct: data?.risingPct },
    { key: "flat", label: "보합", symbol: "―", count: data?.unchanged, pct: data?.unchangedPct },
    { key: "down", label: "하락", symbol: "▼", count: data?.falling, pct: data?.fallingPct },
  ] as const;

  return (
    <section className={styles.root} aria-label={`${name} 등락 지수${sourceInfo ? `, ${sourceInfo}` : data ? "" : ", 데이터 연결 예정"}`} title={sourceInfo ?? undefined} data-market={market}>
      <div className={styles.stats}>
        <div className={styles.heading}>
          <strong>{name} 등락 지수</strong>
          {data && sourceInfo && <small className={styles.pending}>{stored!.observationDate.slice(5).replace('-', '.')}</small>}
          {!data && <small className={styles.pending}>연결 예정</small>}
        </div>
        {columns.map(({ key, label, symbol, count, pct }) => (
          <div className={`${styles.stat} ${styles[key]}`} key={key} aria-label={`${label}: ${count === undefined ? "미제공" : `${numberFormat.format(count)}개, ${pct!.toFixed(1)}%`}`}>
            <span className={styles.symbol} aria-hidden="true">{symbol}</span>
            <span className={styles.count}>{count === undefined ? "—" : numberFormat.format(count)}</span>
            <span className={styles.percent}>({pct === undefined ? "—" : `${pct.toFixed(1)}%`})</span>
          </div>
        ))}
      </div>
      <div
        className={styles.track}
        data-dominance={dominance}
        role="img"
        aria-label={data
          ? `상승 ${data.risingPct.toFixed(1)}%, 보합 ${data.unchangedPct.toFixed(1)}%, 하락 ${data.fallingPct.toFixed(1)}%`
          : "실제 등락 종목 데이터는 아직 연결되지 않았습니다"}
      >
        {data && <>
          <span className={styles.rising} style={{width:`${data.risingPct}%`}}/>
          <span className={styles.unchanged} style={{width:`${data.unchangedPct}%`}}/>
          <span className={styles.falling} style={{width:`${data.fallingPct}%`}}/>
        </>}
      </div>
    </section>
  );
}
