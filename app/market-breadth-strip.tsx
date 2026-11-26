"use client";
import {useEffect, useId, useState} from "react";
import styles from "./market-breadth-strip.module.css";
import {startStoredRefresh} from "../lib/market-score/live-refresh.mjs";
import {newestUsIexPercentPublication} from "../lib/market-breadth/us-provisional-ui-r4.mjs";
import type {MarketPeriod} from "./market-card-shared";
import {MarketBreadthHistoryChart, type UsBreadthHistory} from "./market-breadth-history-chart";

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
  /** Presentation-only restoration: no legacy IEX polling; the data owner supplies verified counts. */
  displayOnly?: boolean;
  /** Optional owner-provided verified public daily history; never collected by the UI. */
  history?: UsBreadthHistory | null;
};

type UsaIexProvisionalRecord = {
  market: "usa";
  phase: "PROVISIONAL";
  status: "PROVISIONAL";
  source: "ALPACA_IEX_15MIN_SPLIT";
  observationDate: string;
  slotEndUtc: string;
  collectedAt: string;
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
  // A stored row with 100% unobserved members is not a genuine 0% breadth reading.
  // Preserve real 0% categories only when at least one member was observed.
  if (record.risingPct + record.fallingPct + record.unchangedPct <= 0) return false;
  const stamp = Date.parse(record.slotEndUtc);
  const collected = Date.parse(record.collectedAt);
  const age = Date.now() - stamp;
  if (!Number.isFinite(stamp) || !Number.isFinite(collected) || collected < stamp ||
    collected > Date.now() + 60_000 || age < 0 || age > 30 * 60_000) return false;
  const nyFormat = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"
  });
  const nyDay = (date: Date) => {
    const parts = Object.fromEntries(nyFormat.formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  // A previous NY day's stored slot must never masquerade as today's session
  // at the local midnight rollover, even if it was collected <30m ago.
  return record.observationDate === nyDay(new Date()) &&
    record.observationDate === nyDay(new Date(stamp));
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

export function MarketBreadthStrip({ market, counts, period = "1Y", displayOnly = false, history = null }: MarketBreadthStripProps) {
  const [provisional, setProvisional] = useState<UsaIexProvisionalRecord | null>(null);
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const hasHistoryToggle = displayOnly && market === "usa";
  const name = market === "usa" ? "미국" : "한국";

  useEffect(() => {
    if (market !== "usa" || displayOnly) return;
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
      const incoming = currentIexProvisional(body) ? body : null;
      setProvisional(previous => newestUsIexPercentPublication(
        currentIexProvisional(previous) ? previous : null, incoming));
    });
    return () => { active = false; stop(); };
  }, [market, displayOnly]);
  const activeProvisional = !displayOnly && market === "usa" && currentIexProvisional(provisional)
    ? provisional : null;
  const data = displayOnly ? normalizedCounts(counts) : market === "usa" ? activeProvisional : normalizedCounts(counts);
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
          {!data && !activeProvisional && <small className={styles.pending}>{displayOnly ? "연결 예정" : market === "usa" ? "미제공" : "연결 예정"}</small>}
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
      title={sourceInfo ?? undefined} data-market={market} data-expanded={expanded && hasHistoryToggle}>
      {hasHistoryToggle ? <button type="button" className={styles.summaryButton} aria-expanded={expanded}
        aria-controls={panelId} aria-label={`미국 등락 지수 확정 이력 ${expanded ? "접기" : "펼치기"}`}
        onClick={()=>setExpanded(value=>!value)}>{summary}</button>
        : <div className={styles.summaryStatic}>{summary}</div>}
      {hasHistoryToggle && <div id={panelId} className={styles.details} role="region"
        aria-label="미국 등락 지수 확정 이력 차트" hidden={!expanded}>
        {history ? <MarketBreadthHistoryChart history={history} period={period}/> :
          <p className={styles.historyEmpty} role="status">확정 이력 데이터 연결 예정</p>}
      </div>}
    </section>
  );
}

