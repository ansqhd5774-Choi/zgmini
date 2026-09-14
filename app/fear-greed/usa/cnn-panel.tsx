"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, CircleAlert, Gauge, ShieldCheck } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type HistoryPoint = { date?: string; timestamp?: string; score?: number; value?: number };
type IndexPayload = {
  status?: string;
  score?: number | null;
  rating?: string;
  observedAt?: string;
  updatedAt?: string;
  history?: HistoryPoint[];
};

const periods = [
  { key: "1w", label: "1주", days: 7 },
  { key: "1m", label: "1개월", days: 31 },
  { key: "3m", label: "3개월", days: 93 },
  { key: "6m", label: "6개월", days: 186 },
  { key: "1y", label: "1년", days: 366 },
] as const;

const label = (rating = "") => rating || "확인 불가";
const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(value)) : "—";
const tone = (score: number | null) => score === null ? "neutral" : score < 45 ? "fear" : score > 55 ? "greed" : "neutral";

function normalizeHistory(history: HistoryPoint[] = []) {
  return history.flatMap((point) => {
    const date = point.date ?? point.timestamp;
    const score = typeof point.score === "number" ? point.score : point.value;
    if (!date || typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) return [];
    const time = Date.parse(date);
    return Number.isFinite(time) ? [{ date, time, score }] : [];
  }).sort((a, b) => a.time - b.time);
}

export default function CnnPanel() {
  const [payload, setPayload] = useState<IndexPayload | null>(null);
  const [period, setPeriod] = useState<(typeof periods)[number]["key"]>("1m");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/fear-greed", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json() as Promise<IndexPayload>)
      .then(setPayload)
      .catch(() => setPayload(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const score = typeof payload?.score === "number" && Number.isFinite(payload.score) ? payload.score : null;
  const history = useMemo(() => {
    const selected = periods.find((item) => item.key === period) ?? periods[1];
    const points = normalizeHistory(payload?.history);
    const end = points.at(-1)?.time;
    return end ? points.filter((point) => point.time >= end - selected.days * 86400000) : points;
  }, [payload?.history, period]);
  const stage = label(payload?.rating);
  const status = payload?.status === "verified" && score !== null ? "검증된 CNN 원본" : "원본 확인 필요";
  const currentTone = tone(score);

  return <section className="cnn-reference-panel" aria-labelledby="cnn-panel-title" data-testid="cnn-reference-panel" data-market-state={loading?'loading':score===null?'unavailable':history.length>1?'ready':'empty'} aria-busy={loading}>
    <div className="cnn-panel-heading">
      <div className="cnn-market-title">
        <img src="/flags/us.svg" alt="" aria-hidden="true" />
        <div><p className="cnn-eyebrow">CNN FEAR &amp; GREED INDEX</p><h2 id="cnn-panel-title">미국 시장</h2><p>S&amp;P 500 · NASDAQ</p></div>
      </div>
      <div className="cnn-source" aria-live="polite"><span>데이터 기준일</span><strong>{dateLabel(payload?.observedAt ?? payload?.updatedAt)}</strong><small role="status">{loading ? "확인 중" : status}</small></div>
    </div>
    <div className="cnn-panel-main">
      <div className={`cnn-score-orb is-${currentTone}`}>
        <Gauge size={26} aria-hidden="true" />
        <strong>{loading ? "—" : score === null ? "—" : Math.round(score)}</strong>
        <span>{loading ? "확인 중" : stage}</span>
        <small>공포 ↔ 탐욕</small>
      </div>
      <div className="cnn-trend-block">
        <div className="cnn-trend-toolbar"><div role="group" aria-label="CNN 지수 기간 선택">{periods.map((item) => <button key={item.key} type="button" aria-pressed={period === item.key} onClick={() => setPeriod(item.key)}>{item.label}</button>)}</div><span>0 — 100</span></div>
        <div className={`cnn-chart${history.length > 1 ? "" : " is-empty"}`} aria-label="CNN Fear and Greed 지수 추이">
          {history.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><defs><linearGradient id="cnn-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff626b" stopOpacity=".6"/><stop offset="100%" stopColor="#ff626b" stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--zg-chart-grid,#365269)" strokeDasharray="3 5" strokeWidth={1}/><XAxis dataKey="date" hide/><YAxis domain={[0, 100]} ticks={[0, 50, 100]} axisLine={false} tickLine={false} tick={{ fill: "var(--zg-text-meta,#a8bcd0)", fontSize: 10 }}/><Tooltip labelFormatter={(value) => dateLabel(String(value))} formatter={(value) => [`${Number(value).toFixed(0)}점`, "지수"]} contentStyle={{ background: "#081d2c", border: "1px solid #1d3b51", color: "#f4f7fb" }}/><Area type="monotone" dataKey="score" stroke="#ff7076" fill="url(#cnn-fill)" strokeWidth={2} dot={false} isAnimationActive={false}/></AreaChart></ResponsiveContainer> : <div className="cnn-chart-empty"><CircleAlert size={18}/><span>기간별 원자료 미제공 · 현재값만 표시합니다.</span></div>}
        </div>
      </div>
    </div>
    <div className="cnn-panel-note"><ShieldCheck size={17}/><span>원본 응답이 검증되지 않으면 이전값이나 임의값으로 대체하지 않습니다.</span><a href="/fear-greed/usa/">세부 지표 보기 <ArrowRight size={14}/></a></div>
  </section>;
}
