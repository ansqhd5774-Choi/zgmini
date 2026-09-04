"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays,
  CheckCircle2, CircleAlert, Clock3, Database, Gauge, Info,
  LineChart as LineChartIcon, Map,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Direction = "up" | "down" | "flat";
type Signal = "positive" | "negative" | "neutral";
type Period = "1주일" | "1개월" | "3개월" | "6개월" | "1년";
type ChartPoint = { label: string; value: number };
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
  benchmark: number;
  benchmarkLabel: string;
  chart: ChartPoint[];
};

type CountrySentiment = {
  country: string;
  index: string;
  score: number;
  data: ChartPoint[];
};

const indicators: Indicator[] = [
  {
    id: "core-pce", name: "근원 PCE 물가", short: "Core PCE", category: "물가", importance: 5,
    current: "2.9%", forecast: "2.8%", previous: "2.8%", surprise: "+0.1%p",
    direction: "up", signal: "negative", trend: "3개월 완만한 상승", release: "9월 25일",
    source: "BEA / FRED", unit: "% YoY", benchmark: 2.0, benchmarkLabel: "물가 목표 2.0%",
    summary: "시장 예상보다 높은 물가 흐름입니다. 금리 인하 기대를 낮출 수 있어 성장주에는 부담으로 해석합니다.",
    chart: [{label:"2월",value:2.7},{label:"3월",value:2.7},{label:"4월",value:2.8},{label:"5월",value:2.7},{label:"6월",value:2.8},{label:"7월",value:2.9}],
  },
  {
    id: "cpi", name: "소비자물가지수", short: "CPI", category: "물가", importance: 5,
    current: "2.7%", forecast: "2.8%", previous: "2.8%", surprise: "-0.1%p",
    direction: "down", signal: "positive", trend: "3개월 둔화", release: "9월 11일",
    source: "BLS / FRED", unit: "% YoY", benchmark: 2.0, benchmarkLabel: "물가 목표 2.0%",
    summary: "예상보다 낮고 최근 흐름도 둔화 중입니다. 물가 부담 완화 측면에서 주식시장에 긍정적인 신호입니다.",
    chart: [{label:"2월",value:3.1},{label:"3월",value:3.0},{label:"4월",value:2.9},{label:"5월",value:2.9},{label:"6월",value:2.8},{label:"7월",value:2.7}],
  },
  {
    id: "ppi", name: "생산자물가지수", short: "PPI", category: "물가", importance: 4,
    current: "3.3%", forecast: "3.1%", previous: "3.0%", surprise: "+0.2%p",
    direction: "up", signal: "negative", trend: "2개월 재상승", release: "9월 10일",
    source: "BLS / FRED", unit: "% YoY", benchmark: 2.0, benchmarkLabel: "안정 기준 2.0%",
    summary: "기업의 가격 압력이 예상보다 강합니다. 소비자물가로 전가될 가능성이 있어 단기적으로 부정적입니다.",
    chart: [{label:"2월",value:3.5},{label:"3월",value:3.2},{label:"4월",value:3.1},{label:"5월",value:2.9},{label:"6월",value:3.0},{label:"7월",value:3.3}],
  },
  {
    id: "unemployment", name: "실업률", short: "Unemployment", category: "고용", importance: 5,
    current: "4.2%", forecast: "4.2%", previous: "4.1%", surprise: "예상 부합",
    direction: "up", signal: "neutral", trend: "완만한 고용 냉각", release: "10월 2일",
    source: "BLS / FRED", unit: "%", benchmark: 4.5, benchmarkLabel: "주의 기준 4.5%",
    summary: "예상에는 부합했지만 이전보다 높아졌습니다. 급격한 악화는 아니어서 현재는 중립으로 평가합니다.",
    chart: [{label:"3월",value:3.9},{label:"4월",value:4.0},{label:"5월",value:4.0},{label:"6월",value:4.1},{label:"7월",value:4.1},{label:"8월",value:4.2}],
  },
  {
    id: "payrolls", name: "비농업 고용", short: "Nonfarm Payrolls", category: "고용", importance: 5,
    current: "+8.2만", forecast: "+9.0만", previous: "+7.9만", surprise: "-0.8만",
    direction: "flat", signal: "neutral", trend: "저성장 구간", release: "10월 2일",
    source: "BLS / FRED", unit: "천 명", benchmark: 100, benchmarkLabel: "고용 유지 기준 10만",
    summary: "고용 증가폭이 예상에는 못 미쳤지만 급락은 아닙니다. 금리에는 우호적이고 경기에는 부담이라 중립입니다.",
    chart: [{label:"3월",value:146},{label:"4월",value:126},{label:"5월",value:110},{label:"6월",value:93},{label:"7월",value:79},{label:"8월",value:82}],
  },
  {
    id: "claims", name: "신규 실업수당", short: "Jobless Claims", category: "고용", importance: 4,
    current: "23.4만", forecast: "23.0만", previous: "22.8만", surprise: "+0.4만",
    direction: "up", signal: "negative", trend: "4주 평균 상승", release: "매주 목요일",
    source: "DOL / FRED", unit: "천 건", benchmark: 250, benchmarkLabel: "경계 기준 25만",
    summary: "실업수당 청구가 예상보다 많고 4주 평균도 상승했습니다. 고용시장 약화 신호로 평가합니다.",
    chart: [{label:"4주 전",value:219},{label:"3주 전",value:222},{label:"2주 전",value:225},{label:"지난주",value:228},{label:"이번주",value:234}],
  },
  {
    id: "gdp", name: "실질 GDP 성장률", short: "Real GDP", category: "경기", importance: 5,
    current: "2.1%", forecast: "2.0%", previous: "1.8%", surprise: "+0.1%p",
    direction: "up", signal: "positive", trend: "2개 분기 개선", release: "9월 24일",
    source: "BEA / FRED", unit: "% SAAR", benchmark: 0, benchmarkLabel: "성장·침체 기준 0%",
    summary: "성장률이 예상과 이전치를 모두 웃돌았습니다. 침체 위험을 낮추는 경기 개선 신호입니다.",
    chart: [{label:"25 Q1",value:1.4},{label:"25 Q2",value:2.0},{label:"25 Q3",value:2.3},{label:"25 Q4",value:1.9},{label:"26 Q1",value:1.8},{label:"26 Q2",value:2.1}],
  },
  {
    id: "ism", name: "ISM 제조업", short: "ISM Manufacturing", category: "경기", importance: 4,
    current: "49.8", forecast: "49.5", previous: "48.9", surprise: "+0.3",
    direction: "up", signal: "positive", trend: "3개월 회복", release: "10월 1일",
    source: "ISM", unit: "지수", benchmark: 50, benchmarkLabel: "확장·위축 기준 50",
    summary: "아직 기준선 50 아래지만 예상치를 웃돌고 회복 흐름입니다. 경기 방향은 개선으로 판정합니다.",
    chart: [{label:"3월",value:47.9},{label:"4월",value:48.2},{label:"5월",value:47.8},{label:"6월",value:48.5},{label:"7월",value:48.9},{label:"8월",value:49.8}],
  },
  {
    id: "retail", name: "소매판매", short: "Retail Sales", category: "경기", importance: 4,
    current: "+0.4%", forecast: "+0.3%", previous: "+0.2%", surprise: "+0.1%p",
    direction: "up", signal: "positive", trend: "소비 회복", release: "9월 16일",
    source: "Census / FRED", unit: "% MoM", benchmark: 0, benchmarkLabel: "증가·감소 기준 0%",
    summary: "소비가 예상보다 견조합니다. 과열 수준은 아니어서 경기에는 긍정적으로 해석합니다.",
    chart: [{label:"2월",value:-0.3},{label:"3월",value:0.1},{label:"4월",value:0.0},{label:"5월",value:0.1},{label:"6월",value:0.2},{label:"7월",value:0.4}],
  },
  {
    id: "ten-year", name: "미국 10년물 금리", short: "US 10Y Yield", category: "금리", importance: 5,
    current: "4.18%", forecast: "—", previous: "4.23%", surprise: "-0.05%p",
    direction: "down", signal: "positive", trend: "1개월 하락", release: "실시간",
    source: "U.S. Treasury / FRED", unit: "%", benchmark: 4.5, benchmarkLabel: "부담 기준 4.5%",
    summary: "장기금리가 이전보다 낮아져 주식의 할인율 부담이 완화됐습니다. 성장주에는 긍정적인 방향입니다.",
    chart: [{label:"1주",value:4.35},{label:"2주",value:4.31},{label:"3주",value:4.28},{label:"4주",value:4.23},{label:"현재",value:4.18}],
  },
];

const countrySentiment: CountrySentiment[] = [
  { country: "미국", index: "S&P 500", score: 71, data: [44,47,49,53,57,55,59,63,61,66,69,71].map((value, index) => ({label:`${index + 1}월`,value})) },
  { country: "한국", index: "KOSPI", score: 46, data: [58,54,51,48,43,40,42,39,44,47,45,46].map((value, index) => ({label:`${index + 1}월`,value})) },
  { country: "중국", index: "CSI 300", score: 38, data: [51,49,45,42,39,35,32,36,40,37,36,38].map((value, index) => ({label:`${index + 1}월`,value})) },
  { country: "일본", index: "Nikkei 225", score: 64, data: [48,52,55,51,54,58,61,59,62,65,63,64].map((value, index) => ({label:`${index + 1}월`,value})) },
  { country: "유럽", index: "STOXX Europe 600", score: 55, data: [43,46,50,52,49,51,54,56,53,52,54,55].map((value, index) => ({label:`${index + 1}월`,value})) },
];

const summaryItems = [
  {label:"종합 환경",value:"중립",score:54,note:"물가 부담 ↔ 경기 회복",icon:Gauge,tone:"amber"},
  {label:"물가 압력",value:"주의",score:38,note:"근원 PCE 재상승",icon:CircleAlert,tone:"red"},
  {label:"고용 상태",value:"둔화",score:46,note:"급격한 침체 신호는 아님",icon:Activity,tone:"slate"},
  {label:"금리 환경",value:"개선",score:68,note:"10년물 금리 하락",icon:CheckCircle2,tone:"green"},
];

const categories = ["전체", "물가", "고용", "경기", "금리"] as const;
const periods: Period[] = ["1주일", "1개월", "3개월", "6개월", "1년"];
const periodPoints: Record<Period, number> = {"1주일":2,"1개월":3,"3개월":4,"6개월":6,"1년":12};

function getSentimentStage(score: number) {
  if (score < 20) return "극단 공포";
  if (score < 40) return "공포";
  if (score < 60) return "중립";
  if (score < 80) return "탐욕";
  return "극단 탐욕";
}

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

function ScoreRail({ score, sentiment = false, label }: { score: number; sentiment?: boolean; label: string }) {
  return (
    <div className={`score-rail ${sentiment ? "score-rail-sentiment" : ""}`}>
      <div className="relative pt-5">
        <span className="score-bubble" style={{left:`${score}%`}}>{score}</span>
        <Progress value={score} aria-label={`${label} ${score}점`} className="score-progress" />
        <span className="score-dot" style={{left:`${score}%`}} aria-hidden="true" />
      </div>
      {sentiment ? (
        <div className="score-steps"><span>극단 공포</span><span>중립</span><span>극단 탐욕</span></div>
      ) : (
        <div className="score-steps"><span>위험</span><span>중립</span><span>긍정</span></div>
      )}
    </div>
  );
}

function PeriodSelector({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1" aria-label="조회 기간">
      {periods.map((item) => (
        <Button key={item} size="sm" variant="ghost" onClick={() => onChange(item)}
          className={`h-8 rounded-lg px-3 text-xs sm:text-sm ${period === item ? "bg-white text-blue-700 shadow-sm hover:bg-white" : "text-slate-500"}`}>
          {item}
        </Button>
      ))}
    </div>
  );
}

function MiniIndicatorChart({ item }: { item: Indicator }) {
  const color = item.signal === "positive" ? "#059669" : item.signal === "negative" ? "#e11d48" : "#64748b";
  return (
    <div className="h-12 w-28" aria-label={`${item.name} 미니 추이, ${item.benchmarkLabel}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={item.chart} margin={{top:5,right:3,bottom:5,left:3}}>
          <ReferenceLine y={item.benchmark} stroke="#94a3b8" strokeDasharray="3 3" ifOverflow="extendDomain" />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CountryCard({ item, period }: { item: CountrySentiment; period: Period }) {
  const visible = item.data.slice(-periodPoints[period]);
  const change = visible.length > 1 ? visible[visible.length - 1].value - visible[0].value : 0;
  const trend: Direction = change > 1 ? "up" : change < -1 ? "down" : "flat";
  const color = item.score >= 60 ? "#7c3aed" : item.score < 40 ? "#ef4444" : "#0f9f78";
  return (
    <article className="country-card">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-lg font-extrabold text-slate-950">{item.country}</h3><p className="mt-0.5 text-sm text-slate-500">{item.index}</p></div>
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">샘플</Badge>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_112px] items-end gap-4">
        <div><p className="text-xs text-slate-400">공포·탐욕 점수</p><div className="mt-1 flex items-baseline gap-2"><strong className="text-3xl font-black text-slate-950">{item.score}</strong><span className="text-sm font-bold" style={{color}}>{getSentimentStage(item.score)}</span></div></div>
        <div className="h-14" aria-label={`${item.country} ${period} 공포 탐욕 추세`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visible} margin={{top:5,right:2,left:2,bottom:3}}>
              <defs><linearGradient id={`country-${item.country}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.28}/><stop offset="100%" stopColor={color} stopOpacity={0.02}/></linearGradient></defs>
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.2} fill={`url(#country-${item.country})`} dot={false} isAnimationActive={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <ScoreRail score={item.score} sentiment label={`${item.country} 공포 탐욕 지수`} />
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm"><span className="text-slate-400">{period} 추세</span><span className={`flex items-center gap-1 font-bold trend-${trend}`}><DirectionIcon direction={trend}/>{change > 0 ? "+" : ""}{change}점</span></div>
    </article>
  );
}

export default function Home() {
  const [category, setCategory] = useState<(typeof categories)[number]>("전체");
  const [selectedId, setSelectedId] = useState("core-pce");
  const [period, setPeriod] = useState<Period>("3개월");
  const filtered = useMemo(() => category === "전체" ? indicators : indicators.filter((item) => item.category === category), [category]);
  const selected = indicators.find((item) => item.id === selectedId) ?? indicators[0];
  const visibleChart = useMemo(() => selected.chart.slice(-periodPoints[period]), [period, selected]);

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
          <Badge className="border border-[#f5b942]/30 bg-[#f5b942]/10 px-3 py-1 text-[#ffd474]">2차 시제품</Badge>
        </div>
      </header>

      <div className="border-b border-amber-200 bg-amber-50 text-amber-950">
        <div className="mx-auto flex max-w-[1480px] items-start gap-2 px-4 py-2.5 text-sm sm:px-6 lg:px-8"><Info className="mt-0.5 size-4 shrink-0" /><p>현재 수치·점수·공포탐욕 지수는 화면과 판정 방식 확인을 위한 예시 데이터입니다. 실시간 API는 다음 단계에서 연결합니다.</p></div>
      </div>

      <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-slate-950">전체 조회 기간</p><p className="mt-0.5 text-xs text-slate-500">과거 흐름과 국가별 미니 그래프에 함께 적용됩니다.</p></div>
          <div className="overflow-x-auto pb-1"><PeriodSelector period={period} onChange={setPeriod}/></div>
        </div>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="시장 상태 요약">
          {summaryItems.map(({label,value,score,note,icon:Icon,tone}) => (
            <article key={label} className={`summary-card summary-${tone}`}>
              <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">{label}</span><Icon className="size-4" /></div>
              <div className="mt-2 flex items-end justify-between gap-3"><div className="flex items-baseline gap-2"><strong className="text-2xl font-extrabold tracking-tight">{value}</strong><span className="text-lg font-black text-slate-900">{score}점</span></div><span className="max-w-32 text-right text-xs leading-5 text-slate-500">{note}</span></div>
              <ScoreRail score={score} label={label}/>
            </article>
          ))}
        </section>

        <section className="overview-card" aria-label="선택 지표 과거 흐름">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><LineChartIcon className="size-5"/></div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-extrabold tracking-[-0.03em] text-slate-950">과거 흐름</h1><Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{selected.category}</Badge><SignalBadge signal={selected.signal}/></div><p className="mt-1 text-sm text-slate-500">{selected.name} · {selected.short} · {period}</p></div></div>
            <div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="size-3.5"/>화면 기준 2026.09.04</div>
          </div>
          <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.75fr)]">
            <div>
              <div className="h-72 w-full" aria-label={`${selected.name} ${period} 추이 차트`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={visibleChart} margin={{top:18,right:18,left:-12,bottom:0}}>
                    <defs><linearGradient id="macroFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2463eb" stopOpacity={0.28}/><stop offset="100%" stopColor="#2463eb" stopOpacity={0.02}/></linearGradient></defs>
                    <CartesianGrid stroke="#e6ebf2" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:"#8491a5",fontSize:12}}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#8491a5",fontSize:12}} domain={["auto","auto"]}/>
                    <ReferenceLine y={selected.benchmark} stroke="#e11d48" strokeWidth={1.5} strokeDasharray="5 4" ifOverflow="extendDomain" label={{value:`기준 ${selected.benchmark}`,position:"insideTopRight",fill:"#be123c",fontSize:12}}/>
                    <Tooltip formatter={(value) => [`${value} ${selected.unit}`, selected.name]} contentStyle={{borderRadius:10,border:"1px solid #dce3ed",boxShadow:"0 8px 24px rgba(15,35,65,.1)"}}/>
                    <Area type="monotone" dataKey="value" stroke="#2463eb" strokeWidth={2.8} fill="url(#macroFill)" activeDot={{r:5}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex items-center justify-end gap-2 text-xs text-slate-500"><span className="inline-block w-7 border-t border-dashed border-rose-500"/><span>{selected.benchmarkLabel}</span></div>
            </div>
            <div>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-4"><div><p className="text-xs text-slate-400">현재</p><p className="mt-1 text-xl font-extrabold text-slate-950">{selected.current}</p></div><div><p className="text-xs text-slate-400">예상</p><p className="mt-1 text-lg font-bold text-slate-700">{selected.forecast}</p></div><div><p className="text-xs text-slate-400">예상 차이</p><p className={`mt-1 text-lg font-bold ${selected.signal === "negative" ? "text-rose-600" : selected.signal === "positive" ? "text-emerald-600" : "text-slate-600"}`}>{selected.surprise}</p></div></div>
              <div className={`analysis-box analysis-${selected.signal}`}><div className="flex items-center gap-2"><Gauge className="size-4"/><p className="text-sm font-extrabold">자동 해석</p></div><p className="mt-2 text-sm leading-6">{selected.summary}</p></div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm"><div><dt className="flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays className="size-3.5"/>다음 발표</dt><dd className="mt-1 font-bold text-slate-700">{selected.release}</dd></div><div><dt className="text-xs text-slate-400">데이터 출처</dt><dd className="mt-1 font-bold text-slate-700">{selected.source}</dd></div></dl>
            </div>
          </div>
        </section>

        <section className="mt-5" aria-labelledby="sentiment-title">
          <div className="mb-3 flex items-end justify-between gap-4"><div><div className="flex items-center gap-2"><Map className="size-5 text-violet-600"/><h2 id="sentiment-title" className="text-xl font-extrabold tracking-[-0.03em] text-slate-950">글로벌 공포·탐욕 지도</h2></div><p className="mt-1 text-sm text-slate-500">국가별 대표지수의 심리 점수와 {period} 흐름</p></div><span className="hidden text-xs text-slate-400 sm:block">0 극단 공포 · 50 중립 · 100 극단 탐욕</span></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{countrySentiment.map((item) => <CountryCard key={item.country} item={item} period={period}/>)}</div>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,35,65,0.06)]">
          <div className="border-b border-slate-200 px-4 py-5 sm:px-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Database className="size-5 text-[#2463eb]"/><h2 className="text-xl font-extrabold tracking-[-0.03em]">핵심 경제지표</h2></div><p className="mt-1 text-sm text-slate-500">행을 누르면 상단 과거 흐름과 기준선·자동 해석이 바뀝니다.</p></div><Tabs value={category} onValueChange={(value) => { const next = value as (typeof categories)[number]; setCategory(next); const first = next === "전체" ? indicators[0] : indicators.find((item) => item.category === next); if (first) setSelectedId(first.id); }}><TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-slate-100 p-1 sm:w-fit">{categories.map((item) => <TabsTrigger key={item} value={item} className="min-w-14 px-3 py-1.5 data-[state=active]:text-[#1749b5]">{item}</TabsTrigger>)}</TabsList></Tabs></div>
          </div>
          <Table className="min-w-[1040px]">
            <TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50"><TableHead className="pl-5 text-xs text-slate-500">지표</TableHead><TableHead className="text-center text-xs text-slate-500">미니 흐름 / 기준선</TableHead><TableHead className="text-xs text-slate-500">중요도</TableHead><TableHead className="text-right text-xs text-slate-500">현재</TableHead><TableHead className="text-right text-xs text-slate-500">예상</TableHead><TableHead className="text-right text-xs text-slate-500">이전</TableHead><TableHead className="text-xs text-slate-500">추세</TableHead><TableHead className="pr-5 text-center text-xs text-slate-500">시장 판정</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((item) => <TableRow key={item.id} tabIndex={0} aria-selected={selected.id === item.id} onClick={() => setSelectedId(item.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedId(item.id); }} className={`indicator-row cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${selected.id === item.id ? "bg-blue-50/80 hover:bg-blue-50" : "hover:bg-slate-50"}`}>
              <TableCell className="pl-5"><p className="text-base font-bold text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-400">{item.short}</p></TableCell>
              <TableCell><div className="flex flex-col items-center"><MiniIndicatorChart item={item}/><span className="mt-0.5 text-[11px] text-slate-400">{item.benchmarkLabel}</span></div></TableCell>
              <TableCell><div className="flex gap-1" aria-label={`중요도 ${item.importance}점`}>{[1,2,3,4,5].map((star) => <span key={star} className={`size-2.5 rounded-full ${star <= item.importance ? "bg-amber-400" : "bg-slate-200"}`}/>)}</div></TableCell>
              <TableCell className="text-right text-base font-extrabold text-slate-900">{item.current}</TableCell><TableCell className="text-right text-slate-600">{item.forecast}</TableCell><TableCell className="text-right text-slate-600">{item.previous}</TableCell>
              <TableCell><div className={`flex items-center gap-1 font-semibold trend-${item.direction}`}><DirectionIcon direction={item.direction}/><span>{item.trend}</span></div></TableCell><TableCell className="pr-5 text-center"><SignalBadge signal={item.signal}/></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </section>
      </div>
    </main>
  );
}
