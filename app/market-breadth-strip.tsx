"use client";
import {useEffect, useId, useState} from "react";
import styles from "./market-breadth-strip.module.css";
import {startStoredRefresh} from "../lib/market-score/live-refresh.mjs";
import {MarketBreadthHistoryChart, type MarketBreadthPeriod, type UsBreadthHistory} from "./market-breadth-r2-history-chart";
import {getMarketPeriodConfig} from "./market-card-shared";

/** Optional non-US input; US confirmed and provisional are strictly percentage-only public feeds. */
export type MarketBreadthCounts = {
  rising: number;
  unchanged: number;
  falling: number;
};

type MarketBreadthStripProps = {
  market: "usa" | "korea";
  counts?: MarketBreadthCounts | null;
  period?: MarketBreadthPeriod;
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

type UsaConfirmedR2Record = {
  market: "usa";
  phase: "CONFIRMED";
  status: "READY";
  publicationStage: "PUBLIC_FINAL";
  source: "MARKETPARQUET_STOCK_DAILY";
  universe: "US_MARKETPARQUET_ACTIVE_STOCKS";
  observationDate: string;
  previousDate: string;
  risingPct: number;
  fallingPct: number;
  unchangedPct: number;
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
  return record.observationDate === `${ny.year}-${ny.month}-${ny.day}`;
}

/** An independently published MarketParquet current; never accept legacy R1 counts. */
function validConfirmedCurrent(value: unknown): value is UsaConfirmedR2Record {
  if (!value || typeof value !== "object") return false;
  const record = value as UsaConfirmedR2Record;
  return record.market === "usa" && record.phase === "CONFIRMED" &&
    record.status === "READY" && record.publicationStage === "PUBLIC_FINAL" &&
    record.source === "MARKETPARQUET_STOCK_DAILY" &&
    record.universe === "US_MARKETPARQUET_ACTIVE_STOCKS" &&
    /^\d{4}-\d{2}-\d{2}$/.test(record.observationDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(record.previousDate) &&
    record.previousDate < record.observationDate &&
    [record.risingPct, record.fallingPct, record.unchangedPct].every(validPercent) &&
    near100(record.risingPct, record.fallingPct, record.unchangedPct);
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

function validConfirmedHistory(value: unknown): value is UsBreadthHistory {
  if (!value || typeof value !== "object") return false;
  const body = value as UsBreadthHistory;
  if (body.version !== 2 || body.market !== "usa" || body.phase !== "CONFIRMED" ||
    body.status !== "READY" || body.publicationStage !== "PUBLIC_FINAL" ||
    body.source !== "MARKETPARQUET_STOCK_DAILY" || body.universe !== "US_MARKETPARQUET_ACTIVE_STOCKS" ||
    !Array.isArray(body.points) || body.points.length < 249 || body.points.length > 250 ||
    typeof body.firstDate !== "string" || typeof body.lastDate !== "string") return false;
  return body.points.every((point, i) => point !== null && typeof point === "object" && /^\d{4}-\d{2}-\d{2}$/.test(point.date) &&
    (!i || body.points[i - 1].date < point.date) &&
    [point.risingPct, point.fallingPct, point.unchangedPct].every(validPercent) &&
    near100(point.risingPct, point.fallingPct, point.unchangedPct)) &&
    body.firstDate === body.points[0].date && body.lastDate === body.points[body.points.length - 1].date;
}

export function MarketBreadthStrip({ market, counts, period = '1Y' }: MarketBreadthStripProps) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<UsBreadthHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [provisional, setProvisional] = useState<UsaIexProvisionalRecord | null>(null);
  const [confirmed, setConfirmed] = useState<UsaConfirmedR2Record | null>(null);
  const name = market === "usa" ? "미국" : "한국";
  const periodLabel = period === '1D' ? '1일' : getMarketPeriodConfig(period).label;

  useEffect(() => {
    if (market !== "usa") return;
    let active = true;
    const readPercent = async (phase: "provisional" | "confirmed-r2", signal: AbortSignal): Promise<unknown> => {
      try {
        const response = await fetch(`/api/market-breadth?market=usa&phase=${phase}`, {
          cache: "no-store", signal
        });
        return response.ok ? await response.json() as unknown : null;
      } catch {
        return null;
      }
    };
    const stop = startStoredRefresh(async (signal: AbortSignal) => {
      // Independent read-only API requests; one failed phase must not hide the other.
      const [iexBody, currentBody] = await Promise.all([
        readPercent("provisional", signal), readPercent("confirmed-r2", signal)
      ]);
      if (!active || signal.aborted) return;
      setProvisional(currentIexProvisional(iexBody) ? iexBody : null);
      setConfirmed(validConfirmedCurrent(currentBody) ? currentBody : null);
    });
    return () => { active = false; stop(); };
  }, [market]);
  const activeProvisional = market === "usa" && currentIexProvisional(provisional)
    ? provisional : null;
  const activeConfirmed = market === "usa" && validConfirmedCurrent(confirmed)
    ? confirmed : null;
  const lastHistory = market === "usa" && history ? history.points[history.points.length - 1] : null;
  const data = market === "usa"
    ? activeProvisional ?? activeConfirmed ?? lastHistory ?? null
    : normalizedCounts(counts);
  const sourceInfo = activeProvisional
    ? `장중 잠정 · Alpaca IEX 15분 · 뉴욕 ${new Intl.DateTimeFormat("ko-KR", {timeZone:"America/New_York", hour:"2-digit", minute:"2-digit", hour12:false}).format(new Date(activeProvisional.slotEndUtc))} 기준 · 미관측 ${activeProvisional.unobservedPct.toFixed(1)}%${activeProvisional.collectionStatus === "INCOMPLETE_PAGINATION" ? " · 페이지 일부 미수집" : ""}`
    : activeConfirmed ? `MarketParquet R2 마감 확정 · ${activeConfirmed.observationDate} 기준 (현재 장중 수치 아님)`
    : lastHistory ? `MarketParquet R2 확정 이력 · ${history!.lastDate} 기준 (현재 장중 수치 아님)` : null;
  const sourceBadge = activeProvisional
    ? `IEX·15분·${new Intl.DateTimeFormat("en-US", {timeZone:"America/New_York", hour:"2-digit", minute:"2-digit", hour12:false}).format(new Date(activeProvisional.slotEndUtc))}`
    : activeConfirmed ? `R2 확정 · ${activeConfirmed.observationDate.slice(5).replace("-", ".")}`
    : lastHistory ? `R2 이력 · ${history!.lastDate.slice(5).replace("-", ".")}` : null;
  const canExpand = market === "usa";

  useEffect(() => {
    if (!canExpand) return;
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError(false);
    fetch('/api/market-breadth-r2-history?market=usa', {cache: 'no-store', signal: controller.signal})
      .then(async response => {
        if (!response.ok) throw new Error('HISTORY_UNAVAILABLE');
        const body: unknown = await response.json();
        if (!validConfirmedHistory(body))
          throw new Error('INVALID_HISTORY_RESPONSE');
        return body;
      })
      .then(body => { if (!controller.signal.aborted) setHistory(body); })
      .catch(() => { if (!controller.signal.aborted) setHistoryError(true); })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [canExpand]);
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
          {!data && !activeProvisional && <small className={styles.pending}>연결 예정</small>}
          {canExpand && <span className={styles.toggleArrow} aria-hidden="true">{expanded ? '▴' : '▾'}</span>}
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
    <section className={styles.root} data-expanded={expanded && canExpand} aria-label={`${name} 등락 지수${sourceInfo ? `, ${sourceInfo}` : data ? "" : ", 데이터 연결 예정"}`} title={sourceInfo ?? undefined} data-market={market}>
      {canExpand ? <button type="button" className={styles.summaryButton}
        aria-expanded={expanded} aria-controls={panelId}
        aria-label={`MarketParquet R2 확정 비율 ${periodLabel} 이력 ${expanded ? '접기' : '펼치기'}`}
        onClick={() => setExpanded(value => !value)}>{summary}</button>
        : <div className={styles.summaryStatic}>{summary}</div>}
      {canExpand && <div id={panelId} className={styles.details} role="region" aria-label={`MarketParquet R2 확정 비율 ${periodLabel} 차트`} hidden={!expanded}>
        {historyLoading && <p className={styles.historyEmpty} role="status">확정치 이력을 불러오는 중입니다.</p>}
        {!historyLoading && historyError && <p className={styles.historyEmpty} role="alert">저장된 이력을 불러오지 못했습니다. 접었다 다시 펼쳐 재시도할 수 있습니다.</p>}
        {!historyLoading && !historyError && history && <MarketBreadthHistoryChart key={period} history={history} period={period}/>}
      </div>}
    </section>
  );
}

