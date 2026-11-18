"use client";
import {useEffect, useState} from "react";
import styles from "./market-breadth-strip.module.css";
import {startStoredRefresh} from "../lib/market-score/live-refresh.mjs";
import {currentUsIexDisplaySession} from "../lib/market-breadth/us-iex-display-session-r69.mjs";
import type {MarketPeriod} from "./market-card-shared";

/** Optional non-US input; US confirmed and provisional are strictly percentage-only public feeds. */
export type MarketBreadthCounts = {
  rising: number;
  unchanged: number;
  falling: number;
};

type MarketBreadthStripProps = {
  market: "usa" | "korea";
  counts?: MarketBreadthCounts | null;
  period?: MarketPeriod | '1D';
};

type UsaIexProvisionalRecord = {
  market: "usa";
  phase: "PROVISIONAL";
  status: "PROVISIONAL";
  source: "ALPACA_IEX_15MIN_SPLIT";
  observationDate: string;
  slotEndUtc: string;
  collectionStatus: "COMPLETE" | "INCOMPLETE_PAGINATION";
  risingPct: number;
  fallingPct: number;
  unchangedPct: number;
  unobservedPct: number;
};

const validPercent = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100;
const near100 = (...parts: number[]) => Math.abs(parts.reduce((sum, n) => sum + n, 0) - 100) <= 0.2;

/** IEX current-only public-percent gate; no confirmed-source coverage or direction requirements. */
function currentIexProvisional(value: unknown): value is UsaIexProvisionalRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as UsaIexProvisionalRecord;
  if (record.market !== "usa" || record.phase !== "PROVISIONAL" || record.status !== "PROVISIONAL" ||
    record.source !== "ALPACA_IEX_15MIN_SPLIT" ||
    ![record.risingPct, record.fallingPct, record.unchangedPct, record.unobservedPct].every(validPercent) ||
    !near100(record.risingPct, record.fallingPct, record.unchangedPct, record.unobservedPct) ||
    !["COMPLETE", "INCOMPLETE_PAGINATION"].includes(record.collectionStatus)) return false;
  const stamp = Date.parse(record.slotEndUtc);
  const age = Date.now() - stamp;
  if (!Number.isFinite(stamp) || age < 0 || age > 30 * 60_000) return false;
  const ny = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return record.observationDate === `${ny.year}-${ny.month}-${ny.day}`
    && currentUsIexDisplaySession(record.observationDate, record.slotEndUtc);
}

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
  const [provisional, setProvisional] = useState<UsaIexProvisionalRecord | null>(null);
  const name = market === "usa" ? "미국" : "한국";

  useEffect(() => {
    if (market !== "usa") return;
    let active = true;
    const stop = startStoredRefresh(async (signal: AbortSignal) => {
      let body: unknown = null;
      try {
        const response = await fetch('/api/market-breadth?market=usa&phase=provisional', {
          cache: "no-store", signal
        });
        if (response.ok) body = await response.json() as unknown;
      } catch {
        body = null;
      }
      if (!active || signal.aborted) return;
      setProvisional(currentIexProvisional(body) ? body : null);
    });
    return () => { active = false; stop(); };
  }, [market]);
  const activeProvisional = market === "usa" && currentIexProvisional(provisional)
    ? provisional : null;
  const data = market === "usa" ? activeProvisional : normalizedCounts(counts);
  const sourceInfo = activeProvisional
    ? `장중 잠정 · Alpaca IEX 15분 · 뉴욕 ${new Intl.DateTimeFormat("ko-KR", {timeZone:"America/New_York", hour:"2-digit", minute:"2-digit", hour12:false}).format(new Date(activeProvisional.slotEndUtc))} 기준 · 미관측 ${activeProvisional.unobservedPct.toFixed(1)}%${activeProvisional.collectionStatus === "INCOMPLETE_PAGINATION" ? " · 페이지 일부 미수집" : ""}`
    : null;
  const sourceBadge = activeProvisional
    ? `IEX·15분·${new Intl.DateTimeFormat("en-US", {timeZone:"America/New_York", hour:"2-digit", minute:"2-digit", hour12:false}).format(new Date(activeProvisional.slotEndUtc))}`
    : null;

  const dominance = !data || Math.abs(data.risingPct - data.fallingPct) < 5
    ? "none"
    : data.risingPct > data.fallingPct ? "up" : "down";

  const columns = [
    { key: "up", label: "상승", symbol: "▲", pct: data?.risingPct },
    { key: "flat", label: "보합", symbol: "―", pct: data?.unchangedPct },
    { key: "down", label: "하락", symbol: "▼", pct: data?.fallingPct },
  ] as const;

  const summary = <>
      <div className={styles.stats} data-provisional={activeProvisional ? "true" : undefined}>
        <div className={styles.heading}>
          <strong>{activeProvisional ? `${name} 잠정` : `${name} 등락 지수`}</strong>
          {sourceBadge && <small className={styles.pending} title={sourceInfo ?? undefined} style={{display:"block",minWidth:0,flex:"1 1 0",overflow:"hidden",textOverflow:"ellipsis"}}>{sourceBadge}</small>}
          {!data && !activeProvisional && <small className={styles.pending}>{market === "usa" ? "미제공" : "연결 예정"}</small>}
        </div>
        {columns.map(({ key, label, symbol, pct }) => (
          <div className={`${styles.stat} ${styles[key]}`} key={key} aria-label={`${label}: ${pct === undefined ? "미제공" : `${pct.toFixed(1)}%`}`}>
            <span className={styles.symbol} aria-hidden="true">{symbol}</span>
            <span className={styles.percent}>{pct === undefined ? "—" : `${pct.toFixed(1)}%`}</span>
          </div>
        ))}
      </div>
      <div
        className={styles.track}
        data-dominance={dominance}
        role="img"
        aria-label={data
          ? `상승 ${data.risingPct.toFixed(1)}%, 보합 ${data.unchangedPct.toFixed(1)}%, 하락 ${data.fallingPct.toFixed(1)}%${activeProvisional ? `, 미관측 ${activeProvisional.unobservedPct.toFixed(1)}%` : ""}`
          : "검증된 등락 비율을 아직 표시할 수 없습니다"}
      >
        {data && <>
          <span className={styles.rising} style={{width:`${data.risingPct}%`}}/>
          <span className={styles.unchanged} style={{width:`${data.unchangedPct}%`}}/>
          <span className={styles.falling} style={{width:`${data.fallingPct}%`}}/>
        </>}
      </div>
  </>;

  return (
    <section className={styles.root}
      aria-label={`${name} 등락 지수${sourceInfo ? `, ${sourceInfo}` : data ? "" : ", 데이터 미제공"}`}
      title={sourceInfo ?? undefined} data-market={market}>
      <div className={styles.summaryStatic}>{summary}</div>
    </section>
  );
}

