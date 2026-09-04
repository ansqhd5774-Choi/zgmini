"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays,
  CheckCircle2, CircleAlert, Clock3, Database, Gauge, Info,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Direction = "up" | "down" | "flat";
type Signal = "positive" | "negative" | "neutral";
type Indicator = {
  id: string;
  name: string;
  short: string;
  category: "물가" | "고용" | "경기" | "금리";
  importance: 3 | 4 | 5;
  current: string;
  forecast: string;
  previous: string;
  surprise: string;
  direction: Direction;
  signal: Signal;
  trend: string;
  release: string;
  source: string;
  summary: string;
  unit: string;
  chart: { label: string; value: number }[];
};

const indicators: Indicator[] = [
  {
    id: "core-pce", name: "근원 PCE 물가", short: "Core PCE", category: "물가", importance: 5,
    current: "2.9%", forecast: "2.8%", previous: "2.8%", surprise: "+0.1%p",
    direction: "up", signal: "negative", trend: "3개월 완만한 상승", release: "9월 25일",
    source: "BEA / FRED", unit: "% YoY",
    summary: "시장 예상보다 높은 물가 흐름입니다. 금리 인하 기대를 낮출 수 있어 성장주에는 부담으로 해석합니다.",
    chart: [{label:"2월",value:2.7},{label:"3월",value:2.7},{label:"4월",value:2.8},{label:"5월",value:2.7},{label:"6월",value:2.8},{label:"7월",value:2.9}],
  },
  {
    id: "cpi", name: "소비자물가지수", short: "CPI", category: "물가", importance: 5,
    current: "2.7%", forecast: "2.8%", previous: "2.8%", surprise: "-0.1%p",
    direction: "down", signal: "positive", trend: "3개월 둔화", release: "9월 11일",
    source: "BLS / FRED", unit: "% YoY",
    summary: "예상보다 낮고 최근 흐름도 둔화 중입니다. 물가 부담 완화 측면에서 주식시장에 긍정적인 신호입니다.",
    chart: [{label:"2월",value:3.1},{label:"3월",value:3.0},{label:"4월",value:2.9},{label:"5월",value:2.9},{label:"6월",value:2.8},{label:"7월",value:2.7}],
  },
  {
    id: "ppi", name: "생산자물가지수", short: "PPI", category: "물가", importance: 4,
    current: "3.3%", forecast: "3.1%", previous: "3.0%", surprise: "+0.2%p",
    direction: "up", signal: "negative", trend: "2개월 재상승", release: "9월 10일",
    source: "BLS / FRED", unit: "% YoY",
    summary: "기업의 가격 압력이 예상보다 강합니다. 소비자물가로 전가될 가능성이 있어 단기적으로 부정적입니다.",
    chart: [{label:"2월",value:3.5},{label:"3월",value:3.2},{label:"4월",value:3.1},{label:"5월",value:2.9},{label:"6월",value:3.0},{label:"7월",value:3.3}],
  },
  {
    id: "unemployment", name: "실업률", short: "Unemployment", category: "고용", importance: 5,
    current: "4.2%", forecast: "4.2%", previous: "4.1%", surprise: "예상 부합",
    direction: "up", signal: "neutral", trend: "완만한 고용 냉각", release: "10월 2일",
    source: "BLS / FRED", unit: "%",
    summary: "예상에는 부합했지만 이전보다 높아졌습니다. 급격한 악화는 아니어서 현재는 중립으로 평가합니다.",
    chart: [{label:"3월",value:3.9},{label:"4월",value:4.0},{label:"5월",value:4.0},{label:"6월",value:4.1},{label:"7월",value:4.1},{label:"8월",value:4.2}],
  },
  {
    id: "payrolls", name: "비농업 고용", short: "Nonfarm Payrolls", category: "고용", importance: 5,
    current: "+8.2만", forecast: "+9.0만", previous: "+7.9만", surprise: "-0.8만",
    direction: "flat", signal: "neutral", trend: "저성장 구간", release: "10월 2일",
    source: "BLS / FRED", unit: "천 명",
    summary: "고용 증가폭이 예상에는 못 미쳤지만 급락은 아닙니다. 금리에는 우호적이고 경기에는 부담이라 중립입니다.",
    chart: [{label:"3월",value:146},{label:"4월",value:126},{label:"5월",value:110},{label:"6월",value:93},{label:"7월",value:79},{label:"8월",value:82}],
  },
  {
    id: "claims", name: "신규 실업수당", short: "Jobless Claims", category: "고용", importance: 4,
    current: "23.4만", forecast: "23.0만", previous: "22.8만", surprise: "+0.4만",
    direction: "up", signal: "negative", trend: "4주 평균 상승", release: "매주 목요일",
    source: "DOL / FRED", unit: "천 건",
    summary: "실업수당 청구가 예상보다 많고 4주 평균도 상승했습니다. 고용시장 약화 신호로 평가합니다.",
    chart: [{label:"4주 전",value:219},{label:"3주 전",value:222},{label:"2주 전",value:225},{label:"지난주",value:228},{label:"이번주",value:234}],
  },
  {
    id: "gdp", name: "실질 GDP 성장률", short: "Real GDP", category: "경기", importance: 5,
    current: "2.1%", forecast: "2.0%", previous: "1.8%", surprise: "+0.1%p",
    direction: "up", signal: "positive", trend: "2개 분기 개선", release: "9월 24일",
    source: "BEA / FRED", unit: "% SAAR",
    summary: "성장률이 예상과 이전치를 모두 웃돌았습니다. 침체 위험을 낮추는 경기 개선 신호입니다.",
    chart: [{label:"25 Q1",value:1.4},{label:"25 Q2",value:2.0},{label:"25 Q3",value:2.3},{label:"25 Q4",value:1.9},{label:"26 Q1",value:1.8},{label:"26 Q2",value:2.1}],
  },
  {
    id: "ism", name: "ISM 제조업", short: "ISM Manufacturing", category: "경기", importance: 4,
    current: "49.8", forecast: "49.5", previous: "48.9", surprise: "+0.3",
    direction: "up", signal: "positive", trend: "3개월 회복", release: "10월 1일",
    source: "ISM", unit: "지수",
    summary: "아직 기준선 50 아래지만 예상치를 웃돌고 회복 흐름입니다. 경기 방향은 개선으로 판정합니다.",
    chart: [{label:"3월",value:47.9},{label:"4월",value:48.2},{label:"5월",value:47.8},{label:"6월",value:48.5},{label:"7월",value:48.9},{label:"8월",value:49.8}],
  },
  {
    id: "retail", name: "소매판매", short: "Retail Sales", category: "경기", importance: 4,
    current: "+0.4%", forecast: "+0.3%", previous: "+0.2%", surprise: "+0.1%p",
    direction: "up", signal: "positive", trend: "소비 회복", release: "9월 16일",
    source: "Census / FRED", unit: "% MoM",
    summary: "소비가 예상보다 견조합니다. 과열 수준은 아니어서 경기에는 긍정적으로 해석합니다.",
    chart: [{label:"2월",value:-0.3},{label:"3월",value:0.1},{label:"4월",value:0.0},{label:"5월",value:0.1},{label:"6월",value:0.2},{label:"7월",value:0.4}],
  },
  {
    id: "ten-year", name: "미국 10년물 금리", short: "US 10Y Yield", category: "금리", importance: 5,
    current: "4.18%", forecast: "—", previous: "4.23%", surprise: "-0.05%p",
    direction: "down", signal: "positive", trend: "1개월 하락", release: "실시간",
    source: "U.S. Treasury / FRED", unit: "%",
    summary: "장기금리가 이전보다 낮아져 주식의 할인율 부담이 완화됐습니다. 성장주에는 긍정적인 방향입니다.",
    chart: [{label:"1주",value:4.35},{label:"2주",value:4.31},{label:"3주",value:4.28},{label:"4주",value:4.23},{label:"현재",value:4.18}],
  },
];

const categories = ["전체", "물가", "고용", "경기", "금리"] as const;
const periods = ["1주일", "1개월", "3개월", "6개월", "1년"] as const;

function DirectionIcon({ direction }: { direction: Direction }) {
  if (direction === "up") return <ArrowUpRight className="size-4" />;
  if (direction === "down") return <ArrowDownRight className="size-4" />;
  return <ArrowRight className="size-4" />;
}

function SignalBadge({ signal }: { signal: Signal }) {
  const item = {
    positive: { label: "긍정", className: "signal-positive" },
    negative: { label: "부정", className: "signal-negative" },
    neutral: { label: "중립", className: "signal-neutral" },
  }[signal];
  return <Badge className={item.className}>{item.label}</Badge>;
}

export default function Home() {
  const [category, setCategory] = useState<(typeof categories)[number]>("전체");
  const [selectedId, setSelectedId] = useState("core-pce");
  const [period, setPeriod] = useState<(typeof periods)[number]>("3개월");
  const filtered = useMemo(() => category === "전체" ? indicators : indicators.filter((item) => item.category === category), [category]);
  const selected = indicators.find((item) => item.id === selectedId) ?? indicators[0];
  const visibleChart = useMemo(() => {
    const pointCount = { "1주일": 1, "1개월": 2, "3개월": 3, "6개월": 6, "1년": 12 }[period];
    return selected.chart.slice(-pointCount);
  }, [period, selected]);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#12213a]">
      <header className="border-b border-white/10 bg-[#07162d] text-white">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f5b942] text-[#07162d] shadow-[0_6px_20px_rgba(245,185,66,0.22)]"><Activity className="size-5" strokeWidth={2.4} /></div>
            <div className="min-w-0"><p className="truncate text-lg font-extrabold tracking-[-0.03em]">매크로보드</p><p className="truncate text-xs text-slate-400">경제지표로 시장을 읽다</p></div>
          </div>
          <nav className="hidden items-center gap-1 text-sm font-semibold text-slate-300 lg:flex" aria-label="주요 메뉴">
            {["종합 시황", "물가", "고용", "경기", "금리·유동성", "경제 캘린더"].map((item, index) => <button key={item} className={`rounded-lg px-3 py-2 transition hover:bg-white/10 hover:text-white ${index === 0 ? "bg-white/10 text-white" : ""}`}>{item}</button>)}
          </nav>
          <Badge className="border border-[#f5b942]/30 bg-[#f5b942]/10 px-3 py-1 text-[#ffd474]">1차 시제품</Badge>
        </div>
      </header>

      <div className="border-b border-amber-200 bg-amber-50 text-amber-950">
        <div className="mx-auto flex max-w-[1480px] items-start gap-2 px-4 py-2.5 text-sm sm:px-6 lg:px-8"><Info className="mt-0.5 size-4 shrink-0" /><p>현재 수치는 화면과 판정 방식 확인을 위한 예시 데이터입니다. 투자 판단용 실시간 API는 다음 단계에서 연결합니다.</p></div>
      </div>

      <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="시장 상태 요약">
          {[
            {label:"종합 환경",value:"중립",note:"물가 부담 ↔ 경기 회복",icon:Gauge,tone:"amber"},
            {label:"물가 압력",value:"주의",note:"근원 PCE 재상승",icon:CircleAlert,tone:"red"},
            {label:"고용 상태",value:"둔화",note:"급격한 침체 신호는 아님",icon:Activity,tone:"slate"},
            {label:"금리 환경",value:"개선",note:"10년물 금리 하락",icon:CheckCircle2,tone:"green"},
          ].map(({label,value,note,icon:Icon,tone}) => <article key={label} className={`summary-card summary-${tone}`}><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><Icon className="size-4" /></div><div className="mt-2 flex items-end justify-between gap-3"><strong className="text-2xl font-extrabold tracking-tight">{value}</strong><span className="text-right text-xs text-slate-500">{note}</span></div></article>)}
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.8fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,35,65,0.06)]">
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Database className="size-5 text-[#2463eb]" /><h1 className="text-xl font-extrabold tracking-[-0.03em]">핵심 경제지표</h1></div><p className="mt-1 text-sm text-slate-500">행을 누르면 오른쪽에서 추세와 해석을 확인할 수 있습니다.</p></div><div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="size-3.5" />화면 기준 2026.09.04</div></div>
              <Tabs value={category} onValueChange={(value) => { const next = value as (typeof categories)[number]; setCategory(next); const first = next === "전체" ? indicators[0] : indicators.find((item) => item.category === next); if (first) setSelectedId(first.id); }} className="mt-4"><TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-slate-100 p-1 sm:w-fit">{categories.map((item) => <TabsTrigger key={item} value={item} className="min-w-14 px-3 py-1.5 data-[state=active]:text-[#1749b5]">{item}</TabsTrigger>)}</TabsList></Tabs>
            </div>
            <Table>
              <TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50"><TableHead className="pl-5 text-xs text-slate-500">지표</TableHead><TableHead className="text-xs text-slate-500">중요도</TableHead><TableHead className="text-right text-xs text-slate-500">현재</TableHead><TableHead className="text-right text-xs text-slate-500">예상</TableHead><TableHead className="text-right text-xs text-slate-500">이전</TableHead><TableHead className="text-xs text-slate-500">추세</TableHead><TableHead className="pr-5 text-center text-xs text-slate-500">시장 판정</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((item) => <TableRow key={item.id} tabIndex={0} aria-selected={selected.id === item.id} onClick={() => setSelectedId(item.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedId(item.id); }} className={`cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${selected.id === item.id ? "bg-blue-50/80 hover:bg-blue-50" : "hover:bg-slate-50"}`}>
                <TableCell className="pl-5"><p className="font-bold text-slate-900">{item.name}</p><p className="mt-0.5 text-xs text-slate-400">{item.short}</p></TableCell>
                <TableCell><div className="flex gap-0.5" aria-label={`중요도 ${item.importance}점`}>{[1,2,3,4,5].map((star) => <span key={star} className={star <= item.importance ? "text-amber-400" : "text-slate-200"}>●</span>)}</div></TableCell>
                <TableCell className="text-right font-extrabold text-slate-900">{item.current}</TableCell><TableCell className="text-right text-slate-600">{item.forecast}</TableCell><TableCell className="text-right text-slate-600">{item.previous}</TableCell>
                <TableCell><div className={`flex items-center gap-1 font-semibold trend-${item.direction}`}><DirectionIcon direction={item.direction} /><span>{item.trend}</span></div></TableCell><TableCell className="pr-5 text-center"><SignalBadge signal={item.signal} /></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,35,65,0.06)] sm:p-5 xl:sticky xl:top-5">
            <div className="flex items-start justify-between gap-4"><div><Badge variant="outline" className="mb-2 border-blue-200 bg-blue-50 text-blue-700">{selected.category}</Badge><h2 className="text-xl font-extrabold tracking-[-0.03em] text-slate-950">{selected.name}</h2><p className="mt-1 text-sm text-slate-400">{selected.short}</p></div><SignalBadge signal={selected.signal} /></div>
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3"><div><p className="text-xs text-slate-400">현재</p><p className="mt-1 text-lg font-extrabold text-slate-950">{selected.current}</p></div><div><p className="text-xs text-slate-400">예상</p><p className="mt-1 text-base font-bold text-slate-700">{selected.forecast}</p></div><div><p className="text-xs text-slate-400">예상 차이</p><p className={`mt-1 text-base font-bold ${selected.signal === "negative" ? "text-rose-600" : selected.signal === "positive" ? "text-emerald-600" : "text-slate-600"}`}>{selected.surprise}</p></div></div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><LineChartIcon className="size-4 text-[#2463eb]" /><h3 className="text-sm font-bold">과거 흐름</h3></div><div className="flex rounded-lg bg-slate-100 p-1" aria-label="차트 기간">{periods.map((item) => <Button key={item} size="sm" variant="ghost" onClick={() => setPeriod(item)} className={`h-7 rounded-md px-2 text-xs ${period === item ? "bg-white text-blue-700 shadow-sm hover:bg-white" : "text-slate-500"}`}>{item}</Button>)}</div></div>
            <div className="mt-3 h-56 w-full" aria-label={`${selected.name} ${period} 추이 차트`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={visibleChart} margin={{top:12,right:8,left:-22,bottom:0}}><defs><linearGradient id="macroFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2463eb" stopOpacity={0.28}/><stop offset="100%" stopColor="#2463eb" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#e6ebf2" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:"#8491a5",fontSize:12}}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#8491a5",fontSize:12}} domain={["dataMin - 0.2","dataMax + 0.2"]}/><Tooltip formatter={(value) => [`${value} ${selected.unit}`, selected.name]} contentStyle={{borderRadius:10,border:"1px solid #dce3ed",boxShadow:"0 8px 24px rgba(15,35,65,.1)"}}/><Area type="monotone" dataKey="value" stroke="#2463eb" strokeWidth={2.5} fill="url(#macroFill)" activeDot={{r:5}}/></AreaChart></ResponsiveContainer></div>
            <div className={`analysis-box analysis-${selected.signal}`}><div className="flex items-center gap-2"><Gauge className="size-4" /><p className="text-sm font-extrabold">자동 해석</p></div><p className="mt-2 text-sm leading-6">{selected.summary}</p></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm"><div><dt className="flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays className="size-3.5" />다음 발표</dt><dd className="mt-1 font-bold text-slate-700">{selected.release}</dd></div><div><dt className="text-xs text-slate-400">데이터 출처</dt><dd className="mt-1 font-bold text-slate-700">{selected.source}</dd></div></dl>
          </aside>
        </section>
      </div>
    </main>
  );
}
