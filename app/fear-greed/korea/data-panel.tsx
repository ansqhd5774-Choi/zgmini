"use client";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export type Snapshot = { status: string; score: number | null; rating?: string; updatedAt?: string };
type Point = { date: string; score: number };
const stages: Record<string,string> = { "Extreme Fear":"극단적 공포", Fear:"공포", Neutral:"중립", Greed:"탐욕", "Extreme Greed":"극단적 탐욕" };
export default function DataPanel({ initial }: { initial: Snapshot }) {
  const [snapshot,setSnapshot] = useState(initial);
  const [rows,setRows] = useState<Point[]>([]);
  const [loading,setLoading] = useState(true);
  const [days,setDays] = useState(30);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try { const r = await fetch("/api/kospi-fear-greed", { cache:"no-store", signal:controller.signal }); setSnapshot(r.ok ? await r.json() as Snapshot : { status:"unavailable",score:null }); } catch { if (!controller.signal.aborted) setSnapshot({status:"unavailable",score:null}); }
    };
    fetch("/api/kospi-history", { signal:controller.signal }).then(async r => { if(r.ok) setRows((await r.json() as {rows:Point[]}).rows); }).catch(() => {}).finally(() => setLoading(false));
    const timer = setInterval(refresh,300000);
    if(initial.status !== "verified") void refresh();
    return () => { controller.abort(); clearInterval(timer); };
  }, [initial.status]);
  const valid = snapshot.status === "verified" && typeof snapshot.score === "number" && Number.isFinite(snapshot.score) && snapshot.score >= 0 && snapshot.score <= 100;
  const previous = rows.filter(r => snapshot.updatedAt && r.date < snapshot.updatedAt.slice(0,10)).at(-1);
  const change = valid && previous ? Number((snapshot.score! - previous.score).toFixed(2)) : null;
  const end = rows.at(-1)?.date;
  const cutoff = end ? new Date(Date.parse(end) - days * 86400000).toISOString().slice(0,10) : "";
  const visible = rows.filter(r => r.date >= cutoff);
  return <section className="mt-6 rounded-xl bg-slate-50 p-4 text-slate-950 sm:p-6" aria-label="현재 한국 시장 투자심리">
    <div className="grid gap-5 sm:grid-cols-3" aria-live="polite">
      <div><p className="text-sm text-slate-600">현재 공포탐욕 점수</p><p className="mt-2 text-4xl font-black">{valid ? Math.round(snapshot.score!) : "—"}<span className="ml-2 text-base font-bold">{valid ? stages[snapshot.rating ?? ""] ?? snapshot.rating ?? "단계 없음" : "업데이트 대기"}</span></p></div>
      <div><p className="text-sm text-slate-600">업데이트 기준</p><p className="mt-2 font-bold">{valid ? snapshot.updatedAt : "데이터 없음"}</p><p className="mt-1 text-xs text-slate-500">제공처 기준일 · 시각 미제공</p></div>
      <div><p className="text-sm text-slate-600">직전 관측값 대비</p><p className="mt-2 text-xl font-bold">{change === null ? "데이터 없음" : `${change > 0 ? "+" : ""}${change}점`}</p>{previous && <p className="text-xs text-slate-500">비교 기준: {previous.date}</p>}</div>
    </div>
    <h2 className="mt-8 font-bold">기간별 투자심리 흐름</h2>
    <div className="my-3 flex flex-wrap gap-2">{[[7,"1주"],[30,"1개월"],[90,"3개월"],[180,"6개월"],[365,"1년"]].map(([value,label]) => <button key={value} type="button" aria-pressed={days === value} onClick={() => setDays(Number(value))} className={`min-h-11 rounded px-3 text-sm ${days === value ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-700"}`}>{label}</button>)}</div>
    {visible.length > 1 ? <div className="h-64 w-full min-w-0 sm:h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={visible} margin={{top:16,right:12,left:-20,bottom:8}}><CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" minTickGap={28} tick={{fontSize:11}} tickFormatter={date => date.slice(5).replace("-","/")}/><YAxis domain={[0,100]} tick={{fontSize:11}}/><ReferenceLine y={50} stroke="#64748b" strokeDasharray="4 4"/><Tooltip labelFormatter={label => String(label)} formatter={value => [`${value}점`,"공포탐욕지수"]}/><Area type="linear" dataKey="score" stroke="#2463eb" fill="#2463eb" fillOpacity={0.15} connectNulls={false}/></AreaChart></ResponsiveContainer><p className="text-xs text-slate-500">{visible[0].date} ~ {visible.at(-1)?.date} · 제공된 관측값만 표시</p></div> : <p className="py-14 text-center text-sm text-slate-500">{loading ? "기간별 데이터 확인 중" : "표시할 기간별 데이터가 없습니다. 업데이트를 기다리고 있습니다."}</p>}
    <p className="mt-8 text-xs leading-6 text-slate-500">현재 점수와 이력은 제공처의 갱신 시점이 다를 수 있습니다. 조회 실패 시 예시 점수나 추정 차트를 표시하지 않습니다.</p>
  </section>;
}
