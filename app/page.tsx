"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays,
  CheckCircle2, CircleAlert, Database, Fuel, Gauge, Info,
  LineChart as LineChartIcon, LogIn, LogOut, Map, Settings2, Star, UserRound,
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
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader,
  SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

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

type SentimentItem = {
  name: string;
  subtitle?: string;
  score: number;
  data: ChartPoint[];
};

type SentimentKind = "global" | "sector" | "theme";
type SessionUser = { displayName: string; email: string };
type FavoriteRecord = { itemKey: string; itemType: SentimentKind; itemName: string };

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

const makeSeries = (values: number[]): ChartPoint[] => values.map((value, index) => ({label:`${index + 1}월`,value}));

const countrySentiment: SentimentItem[] = [
  { name: "미국", subtitle: "S&P 500", score: 71, data: makeSeries([44,47,49,53,57,55,59,63,61,66,69,71]) },
  { name: "한국", subtitle: "KOSPI", score: 46, data: makeSeries([58,54,51,48,43,40,42,39,44,47,45,46]) },
  { name: "중국", subtitle: "CSI 300", score: 38, data: makeSeries([51,49,45,42,39,35,32,36,40,37,36,38]) },
  { name: "일본", subtitle: "Nikkei 225", score: 64, data: makeSeries([48,52,55,51,54,58,61,59,62,65,63,64]) },
  { name: "유럽", subtitle: "STOXX Europe 600", score: 55, data: makeSeries([43,46,50,52,49,51,54,56,53,52,54,55]) },
];

const sectorSentiment: SentimentItem[] = [
  {name:"정보기술",score:74,data:makeSeries([45,48,52,56,59,61,64,67,66,70,72,74])},
  {name:"커뮤니케이션",score:66,data:makeSeries([42,46,49,53,51,55,58,61,59,63,65,66])},
  {name:"임의소비재",score:61,data:makeSeries([55,52,49,53,56,54,57,58,60,59,62,61])},
  {name:"산업재",score:58,data:makeSeries([44,47,50,49,52,54,53,56,55,57,59,58])},
  {name:"금융",score:56,data:makeSeries([48,51,53,50,52,55,57,54,56,58,55,56])},
  {name:"유틸리티",score:53,data:makeSeries([61,58,55,52,49,47,50,52,54,51,52,53])},
  {name:"헬스케어",score:48,data:makeSeries([52,50,47,45,49,51,48,46,47,49,50,48])},
  {name:"소재",score:47,data:makeSeries([57,54,50,48,45,43,46,49,48,46,45,47])},
  {name:"에너지",score:44,data:makeSeries([63,60,56,52,49,46,42,45,47,43,42,44])},
  {name:"필수소비재",score:42,data:makeSeries([54,52,50,47,45,44,46,43,41,40,43,42])},
  {name:"부동산",score:37,data:makeSeries([50,48,45,42,39,36,34,38,40,36,35,37])},
];

const themeSentiment: SentimentItem[] = [
  {name:"AI 반도체",score:78,data:makeSeries([40,45,50,56,61,64,68,71,69,73,76,78])},
  {name:"데이터센터 전력",score:73,data:makeSeries([46,49,53,58,62,65,63,67,70,72,71,73])},
  {name:"양자컴퓨팅",score:68,data:makeSeries([35,39,45,51,48,55,60,58,63,66,65,68])},
  {name:"로봇·자동화",score:63,data:makeSeries([44,47,50,54,57,55,58,60,59,61,62,63])},
  {name:"우주·위성",score:59,data:makeSeries([39,43,47,45,49,52,55,53,57,58,56,59])},
  {name:"사이버보안",score:57,data:makeSeries([52,50,53,55,54,56,58,59,57,55,56,57])},
  {name:"원전·SMR",score:54,data:makeSeries([61,58,55,51,48,52,56,53,55,57,52,54])},
  {name:"자율주행",score:49,data:makeSeries([57,54,51,48,52,50,46,49,51,47,48,49])},
  {name:"전고체 배터리",score:46,data:makeSeries([55,51,48,45,42,44,47,49,45,43,44,46])},
  {name:"바이오테크",score:43,data:makeSeries([49,47,45,42,40,43,46,44,41,42,45,43])},
  {name:"수소",score:34,data:makeSeries([52,48,44,41,38,35,32,36,39,35,33,34])},
  {name:"태양광",score:31,data:makeSeries([47,44,41,38,35,32,29,33,36,32,30,31])},
];

const summaryItems = [
  {label:"종합",value:"중립",score:54,note:"물가 부담 ↔ 경기 회복",icon:Gauge,tone:"amber",data:makeSeries([49,51,50,53,55,52,54,56,53,55,54,54])},
  {label:"물가",value:"주의",score:38,note:"근원 PCE 재상승",icon:CircleAlert,tone:"red",data:makeSeries([55,52,49,46,43,41,39,42,40,37,39,38])},
  {label:"고용",value:"둔화",score:46,note:"급격한 침체 신호는 아님",icon:Activity,tone:"slate",data:makeSeries([57,55,53,51,49,47,45,48,46,44,45,46])},
  {label:"금리",value:"개선",score:68,note:"10년물 금리 하락",icon:CheckCircle2,tone:"green",data:makeSeries([42,45,49,52,55,58,61,63,65,64,67,68])},
  {label:"유가",value:"주의",score:42,note:"WTI 변동성 확대",icon:Fuel,tone:"orange",data:makeSeries([59,56,52,48,45,41,44,47,43,40,45,42])},
];

const volatilityByKind: Record<SentimentKind, Record<string, string>> = {
  global: {
    "미국":"VIX 18.6","한국":"VKOSPI 21.4","중국":"iVX 24.7","일본":"Nikkei VI 20.9","유럽":"VSTOXX 19.8",
  },
  sector: {
    "정보기술":"베타 1.28","커뮤니케이션":"베타 1.16","임의소비재":"베타 1.14","산업재":"베타 1.05","금융":"베타 1.02","유틸리티":"베타 0.63","헬스케어":"베타 0.78","소재":"베타 1.03","에너지":"베타 1.12","필수소비재":"베타 0.58","부동산":"베타 0.91",
  },
  theme: {
    "AI 반도체":"베타 1.62","데이터센터 전력":"베타 1.41","양자컴퓨팅":"베타 2.18","로봇·자동화":"베타 1.37","우주·위성":"베타 1.74","사이버보안":"베타 1.19","원전·SMR":"베타 1.46","자율주행":"베타 1.71","전고체 배터리":"베타 1.58","바이오테크":"베타 1.32","수소":"베타 1.69","태양광":"베타 1.54",
  },
};

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

function getSentimentColor(score: number) {
  if (score < 20) return "#991b1b";
  if (score < 40) return "#f87171";
  if (score < 60) return "#737373";
  if (score < 80) return "#84cc16";
  return "#166534";
}

function sentimentKey(kind: SentimentKind, name: string) {
  return `${kind}:${name}`;
}

function expandIndicatorHistory(data: ChartPoint[], seed: number) {
  if (data.length >= 12) return data;
  const first = data[0]?.value ?? 0;
  const range = Math.max(...data.map((point) => point.value)) - Math.min(...data.map((point) => point.value));
  const amplitude = Math.max(Math.abs(first) * 0.06, range * 0.45, 0.08);
  const missing = 12 - data.length;
  const prefix = Array.from({length:missing}, (_, index) => ({
    label: `${12 - index}기 전`,
    value: Number((first + Math.sin((index + seed) * 1.17) * amplitude - (missing - index) * amplitude * 0.08).toFixed(2)),
  }));
  return [...prefix, ...data];
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
  const style = sentiment ? ({ "--score-color": getSentimentColor(score) } as CSSProperties) : undefined;
  return (
    <div className={`score-rail ${sentiment ? "score-rail-sentiment" : ""}`} style={style}>
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
    <div className="flex rounded-none bg-[#202020] p-1" aria-label="조회 기간">
      {periods.map((item) => (
        <Button key={item} size="sm" variant="ghost" onClick={() => onChange(item)}
          className={`h-8 rounded-none px-3 text-xs sm:text-sm ${period === item ? "bg-white text-blue-700 shadow-sm hover:bg-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
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

function SentimentCard({ item, period, kind, favorite, onToggle }: { item: SentimentItem; period: Period; kind: SentimentKind; favorite: boolean; onToggle: (kind: SentimentKind, item: SentimentItem) => void }) {
  const visible = item.data.slice(-periodPoints[period]);
  const change = visible.length > 1 ? visible[visible.length - 1].value - visible[0].value : 0;
  const trend: Direction = change > 1 ? "up" : change < -1 ? "down" : "flat";
  const color = getSentimentColor(item.score);
  const stage = getSentimentStage(item.score);
  const volatility = volatilityByKind[kind][item.name];
  return (
    <article className="sentiment-card group relative">
      <button type="button" className={`favorite-action ${favorite ? "is-favorite" : ""}`} onClick={() => onToggle(kind, item)} aria-label={`${item.name} ${favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}`}>
        <Star className={`size-5 ${favorite ? "fill-current" : ""}`}/><span>{favorite ? "즐겨찾기 해제" : "+ 즐겨찾기"}</span>
      </button>
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-lg font-extrabold text-slate-950">{item.name}</h3>{item.subtitle && <p className="mt-0.5 text-sm text-slate-500">{item.subtitle}</p>}</div>
        <Badge variant="outline" className="stage-badge" style={{color,borderColor:`${color}55`,backgroundColor:`${color}10`}}>{stage}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_112px] items-end gap-4">
        <div><p className="text-xs text-slate-400">공포·탐욕 점수</p><strong className="mt-1 block text-3xl font-black text-slate-950">{item.score}</strong></div>
        <div className="h-14" aria-label={`${item.name} ${period} 공포 탐욕 추세`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visible} margin={{top:5,right:2,left:2,bottom:3}}>
              <defs><linearGradient id={`sentiment-${kind}-${item.name.replace(/[^a-zA-Z0-9가-힣]/g, "")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.28}/><stop offset="100%" stopColor={color} stopOpacity={0.02}/></linearGradient></defs>
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.2} fill={`url(#sentiment-${kind}-${item.name.replace(/[^a-zA-Z0-9가-힣]/g, "")})`} dot={false} isAnimationActive={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <ScoreRail score={item.score} sentiment label={`${item.name} 공포 탐욕 지수`} />
      <div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-500">변동성</span><strong style={{color}}>{volatility}</strong></div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm"><span className="text-slate-400">{period} 추세</span><span className={`flex items-center gap-1 font-bold trend-${trend}`}><DirectionIcon direction={trend}/>{change > 0 ? "+" : ""}{change}점</span></div>
    </article>
  );
}

function SentimentSection({ title, description, items, period, kind, favorites, onToggle }: { title: string; description: string; items: SentimentItem[]; period: Period; kind: SentimentKind; favorites: Set<string>; onToggle: (kind: SentimentKind, item: SentimentItem) => void }) {
  return (
    <section className="mt-6" aria-labelledby={`${kind}-title`}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div><div className="flex items-center gap-2"><Map className="size-5 text-violet-300"/><h2 id={`${kind}-title`} className="text-xl font-extrabold tracking-[-0.03em] text-white">{title}</h2></div><p className="mt-1 text-sm text-slate-300">{description} · {period}</p></div>
        <span className="hidden text-xs text-slate-300 sm:block">0 극단 공포 · 50 중립 · 100 극단 탐욕</span>
      </div>
      <div className={`sentiment-grid sentiment-grid-${kind}`}>
        {items.map((item) => <SentimentCard key={item.name} item={item} period={period} kind={kind} favorite={favorites.has(sentimentKey(kind,item.name))} onToggle={onToggle}/>)}
      </div>
    </section>
  );
}

function IndicatorDetail({ item, period }: { item: Indicator; period: Period }) {
  const history = expandIndicatorHistory(item.chart, item.id.length);
  const visible = history.slice(-periodPoints[period]);
  return (
    <div className="indicator-detail">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-5 py-4">
        <div className="flex items-center gap-2"><LineChartIcon className="size-5 text-blue-700"/><h3 className="text-lg font-extrabold text-slate-950">과거 흐름</h3><Badge variant="outline" className="rounded-none border-blue-300 bg-blue-50 text-blue-700">{period}</Badge></div>
        <div className="flex items-center gap-2 text-sm text-slate-600"><span className="inline-block w-7 border-t border-dashed border-rose-500"/><span>{item.benchmarkLabel}</span></div>
      </div>
      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.75fr)]">
        <div className="h-72 w-full" aria-label={`${item.name} ${period} 과거 흐름`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visible} margin={{top:18,right:20,left:-12,bottom:0}}>
              <defs><linearGradient id={`macro-${item.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2463eb" stopOpacity={0.28}/><stop offset="100%" stopColor="#2463eb" stopOpacity={0.02}/></linearGradient></defs>
              <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:12}}/>
              <YAxis axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:12}} domain={["auto","auto"]}/>
              <ReferenceLine y={item.benchmark} stroke="#e11d48" strokeWidth={1.5} strokeDasharray="5 4" ifOverflow="extendDomain" label={{value:`기준 ${item.benchmark}`,position:"insideTopRight",fill:"#be123c",fontSize:12}}/>
              <Tooltip formatter={(value) => [`${value} ${item.unit}`, item.name]} contentStyle={{borderRadius:0,border:"1px solid #94a3b8",boxShadow:"0 8px 24px rgba(15,35,65,.12)"}}/>
              <Area type="monotone" dataKey="value" stroke="#2463eb" strokeWidth={2.8} fill={`url(#macro-${item.id})`} activeDot={{r:5}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="grid grid-cols-3 gap-px border border-slate-300 bg-slate-300">
            <div className="bg-slate-100 p-4"><p className="text-xs text-slate-500">현재</p><p className="mt-1 text-xl font-extrabold text-slate-950">{item.current}</p></div>
            <div className="bg-slate-100 p-4"><p className="text-xs text-slate-500">예상</p><p className="mt-1 text-lg font-bold text-slate-700">{item.forecast}</p></div>
            <div className="bg-slate-100 p-4"><p className="text-xs text-slate-500">예상 차이</p><p className={`mt-1 text-lg font-bold ${item.signal === "negative" ? "text-rose-600" : item.signal === "positive" ? "text-emerald-700" : "text-slate-600"}`}>{item.surprise}</p></div>
          </div>
          <div className={`analysis-box analysis-${item.signal}`}><div className="flex items-center gap-2"><Gauge className="size-4"/><p className="text-sm font-extrabold">자동 해석</p></div><p className="mt-2 text-sm leading-6">{item.summary}</p></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-300 pt-4 text-sm"><div><dt className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="size-3.5"/>다음 발표</dt><dd className="mt-1 font-bold text-slate-700">{item.release}</dd></div><div><dt className="text-xs text-slate-500">데이터 출처</dt><dd className="mt-1 font-bold text-slate-700">{item.source}</dd></div></dl>
        </div>
      </div>
    </div>
  );
}

function SummaryMiniChart({ data, period, tone, label }: { data: ChartPoint[]; period: Period; tone: string; label: string }) {
  const color = {amber:"#d97706",red:"#dc2626",slate:"#475569",green:"#059669",orange:"#ea580c"}[tone] ?? "#475569";
  const visible = data.slice(-periodPoints[period]);
  return (
    <div className="mt-3 h-12 w-full" aria-label={`${label} ${period} 미니 차트`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={visible} margin={{top:4,right:1,left:1,bottom:2}}>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.4} fill={color} fillOpacity={0.1} dot={false} isAnimationActive={false}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Home() {
  const [category, setCategory] = useState<(typeof categories)[number]>("전체");
  const [openIndicator, setOpenIndicator] = useState("");
  const [period, setPeriod] = useState<Period>("3개월");
  const [summaryCharts, setSummaryCharts] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const filtered = useMemo(() => category === "전체" ? indicators : indicators.filter((item) => item.category === category), [category]);
  const catalog = useMemo(() => [
    ...countrySentiment.map((item) => ({kind:"global" as const,item})),
    ...sectorSentiment.map((item) => ({kind:"sector" as const,item})),
    ...themeSentiment.map((item) => ({kind:"theme" as const,item})),
  ], []);
  const favoriteItems = catalog.filter(({kind,item}) => favorites.has(sentimentKey(kind,item.name)));

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      try {
        const sessionResponse = await fetch("/api/session", {cache:"no-store"});
        const sessionPayload = await sessionResponse.json() as { user: SessionUser | null };
        if (!active) return;
        setUser(sessionPayload.user);
        if (sessionPayload.user) {
          const favoriteResponse = await fetch("/api/favorites", {cache:"no-store"});
          if (favoriteResponse.ok) {
            const favoritePayload = await favoriteResponse.json() as { favorites: FavoriteRecord[] };
            if (active) setFavorites(new Set(favoritePayload.favorites.map((favorite) => favorite.itemKey)));
          }
        }
      } catch {
        if (active) toast.error("사용자 설정을 불러오지 못했습니다.");
      } finally {
        if (active) setSessionLoading(false);
      }
    }
    loadAccount();
    return () => { active = false; };
  }, []);

  function toggleSummaryChart(label: string) {
    setSummaryCharts((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function toggleFavorite(kind: SentimentKind, item: SentimentItem) {
    if (!user) {
      window.location.assign("/signin-with-chatgpt?return_to=%2F");
      return;
    }
    const itemKey = sentimentKey(kind,item.name);
    const removing = favorites.has(itemKey);
    setFavorites((current) => {
      const next = new Set(current);
      if (removing) next.delete(itemKey);
      else next.add(itemKey);
      return next;
    });
    try {
      const response = removing
        ? await fetch(`/api/favorites?itemKey=${encodeURIComponent(itemKey)}`, {method:"DELETE"})
        : await fetch("/api/favorites", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({itemKey,itemType:kind,itemName:item.name})});
      if (!response.ok) {
        const payload = await response.json() as {error?:string};
        throw new Error(payload.error ?? "즐겨찾기를 저장하지 못했습니다.");
      }
      toast.success(removing ? "즐겨찾기에서 삭제했습니다." : "즐겨찾기에 추가했습니다.");
    } catch (error) {
      setFavorites((current) => {
        const next = new Set(current);
        if (removing) next.add(itemKey);
        else next.delete(itemKey);
        return next;
      });
      toast.error(error instanceof Error ? error.message : "즐겨찾기를 처리하지 못했습니다.");
    }
  }

  return (
    <main className="min-h-screen bg-[#363636] text-[#12213a]">
      <header className="border-b border-white/10 bg-[#07162d] text-white">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f5b942] text-[#07162d] shadow-[0_6px_20px_rgba(245,185,66,0.22)]"><Activity className="size-5" strokeWidth={2.4} /></div>
            <div className="min-w-0"><p className="truncate text-lg font-extrabold tracking-[-0.03em]">매크로보드</p><p className="truncate text-xs text-slate-400">경제지표로 시장을 읽다</p></div>
          </div>
          <nav className="hidden items-center gap-1 text-sm font-semibold text-slate-300 lg:flex" aria-label="주요 메뉴">
            {["종합 시황", "물가", "고용", "경기", "금리·유동성", "경제 캘린더"].map((item, index) => <button key={item} className={`rounded-lg px-3 py-2 transition hover:bg-white/10 hover:text-white ${index === 0 ? "bg-white/10 text-white" : ""}`}>{item}</button>)}
          </nav>
          <div className="flex items-center gap-2">
            {sessionLoading ? (
              <span className="hidden text-xs text-slate-400 sm:inline">계정 확인 중</span>
            ) : user ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="rounded-none border border-white/20 bg-white/10 text-white hover:bg-white/20">
                    <Settings2 className="size-4"/><span className="hidden sm:inline">사용자 설정</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="border-l-0 bg-white sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2"><UserRound className="size-5"/>사용자 설정</SheetTitle>
                    <SheetDescription>{user.displayName} · {user.email}</SheetDescription>
                  </SheetHeader>
                  <div className="px-4">
                    <h3 className="text-sm font-extrabold text-slate-950">내 즐겨찾기 {favoriteItems.length}개</h3>
                    <div className="mt-3 space-y-2">
                      {favoriteItems.length === 0 ? (
                        <p className="bg-slate-100 p-4 text-sm leading-6 text-slate-600">글로벌·섹터·테마 박스에 마우스를 올려 즐겨찾기를 추가할 수 있습니다.</p>
                      ) : favoriteItems.map(({kind,item}) => (
                        <div key={sentimentKey(kind,item.name)} className="flex items-center justify-between gap-3 bg-slate-100 px-3 py-2.5">
                          <div><p className="font-bold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{kind === "global" ? "글로벌" : kind === "sector" ? "섹터" : "테마"} · {getSentimentStage(item.score)} {item.score}점</p></div>
                          <Button size="sm" variant="ghost" onClick={() => toggleFavorite(kind,item)} className="rounded-none text-rose-600 hover:bg-rose-50 hover:text-rose-700">삭제</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <SheetFooter>
                    <Button asChild variant="outline" className="w-full rounded-none">
                      <a href="/signout-with-chatgpt?return_to=%2F" target="_top"><LogOut className="size-4"/>로그아웃</a>
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            ) : (
              <Button asChild className="rounded-none bg-[#f5b942] text-[#07162d] hover:bg-[#ffd474]">
                <a href="/signin-with-chatgpt?return_to=%2F" target="_top"><LogIn className="size-4"/>회원가입 / 로그인</a>
              </Button>
            )}
            <Badge className="hidden border border-[#f5b942]/30 bg-[#f5b942]/10 px-3 py-1 text-[#ffd474] sm:inline-flex">4차 시제품</Badge>
          </div>
        </div>
      </header>

      <div className="border-b border-amber-200 bg-amber-50 text-amber-950">
        <div className="mx-auto flex max-w-[1480px] items-start gap-2 px-4 py-2.5 text-sm sm:px-6 lg:px-8"><Info className="mt-0.5 size-4 shrink-0" /><p>현재 수치·점수·공포탐욕 지수는 화면과 판정 방식 확인을 위한 예시 데이터입니다. 실시간 API는 다음 단계에서 연결합니다.</p></div>
      </div>

      <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="sticky-summary">
          <div className="sticky-period overflow-x-auto pb-2"><PeriodSelector period={period} onChange={setPeriod}/></div>
          <section className="summary-grid" aria-label="시장 상태 요약">
            {summaryItems.map(({label,value,score,note,icon:Icon,tone,data}) => (
              <button type="button" key={label} aria-pressed={summaryCharts.has(label)} onClick={() => toggleSummaryChart(label)} className={`summary-card summary-${tone} text-left`}>
                <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-600">{label}</span><Icon className="size-4" /></div>
                <div className="mt-2 flex items-end justify-between gap-3"><div className="flex items-baseline gap-2"><strong className="text-2xl font-extrabold tracking-tight">{value}</strong><span className="text-lg font-black text-slate-900">{score}점</span></div><span className="max-w-32 text-right text-xs leading-5 text-slate-600">{note}</span></div>
                {summaryCharts.has(label) ? <SummaryMiniChart data={data} period={period} tone={tone} label={label}/> : <ScoreRail score={score} label={label}/>}
              </button>
            ))}
          </section>
        </div>

        {favoriteItems.length > 0 && (
          <section className="mt-6" aria-labelledby="favorite-title">
            <div className="mb-3 flex items-center gap-2"><Star className="size-5 fill-amber-300 text-amber-300"/><h2 id="favorite-title" className="text-xl font-extrabold tracking-[-0.03em] text-white">내 즐겨찾기</h2></div>
            <div className="sentiment-grid sentiment-grid-favorite">
              {favoriteItems.map(({kind,item}) => <SentimentCard key={sentimentKey(kind,item.name)} item={item} period={period} kind={kind} favorite onToggle={toggleFavorite}/>) }
            </div>
          </section>
        )}

        <SentimentSection title="글로벌 공포 탐욕" description="국가별 대표지수의 심리 점수와 지역 변동성 지수" items={countrySentiment} period={period} kind="global" favorites={favorites} onToggle={toggleFavorite}/>

        <section className="indicator-panel mt-6">
          <div className="border-b border-slate-300 px-4 py-5 sm:px-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div><div className="flex items-center gap-2"><Database className="size-5 text-[#2463eb]"/><h2 className="text-xl font-extrabold tracking-[-0.03em]">핵심 경제지표</h2></div><p className="mt-1 text-sm text-slate-600">지표를 누르면 바로 아래에 {period} 과거 흐름과 자동 해석이 열립니다.</p></div>
              <Tabs value={category} onValueChange={(value) => { setCategory(value as (typeof categories)[number]); setOpenIndicator(""); }}><TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none bg-slate-200 p-1 sm:w-fit">{categories.map((item) => <TabsTrigger key={item} value={item} className="min-w-14 rounded-none px-3 py-1.5 data-[state=active]:text-[#1749b5]">{item}</TabsTrigger>)}</TabsList></Tabs>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[1080px]">
              <div className="indicator-grid indicator-header px-5">
                <span>지표</span><span className="text-center">미니 흐름 / 기준선</span><span>중요도</span><span className="text-right">현재</span><span className="text-right">예상</span><span className="text-right">이전</span><span>추세</span><span className="text-center">시장 판정</span>
              </div>
              <Accordion type="single" collapsible value={openIndicator} onValueChange={setOpenIndicator}>
                {filtered.map((item) => (
                  <AccordionItem key={item.id} value={item.id} className="indicator-item">
                    <AccordionTrigger className="indicator-trigger px-5 hover:no-underline">
                      <div className="indicator-grid min-w-0 flex-1">
                        <div><p className="text-base font-bold text-slate-950">{item.name}</p><p className="mt-1 text-xs font-normal text-slate-500">{item.short}</p></div>
                        <div className="flex flex-col items-center"><MiniIndicatorChart item={item}/><span className="mt-0.5 text-[11px] font-normal text-slate-500">{item.benchmarkLabel}</span></div>
                        <div className="flex gap-1" aria-label={`중요도 ${item.importance}점`}>{[1,2,3,4,5].map((star) => <span key={star} className={`size-2.5 rounded-full ${star <= item.importance ? "bg-amber-400" : "bg-slate-300"}`}/>)}</div>
                        <strong className="text-right text-base text-slate-950">{item.current}</strong><span className="text-right font-medium text-slate-700">{item.forecast}</span><span className="text-right font-medium text-slate-700">{item.previous}</span>
                        <span className={`flex items-center gap-1 font-semibold trend-${item.direction}`}><DirectionIcon direction={item.direction}/>{item.trend}</span><span className="text-center"><SignalBadge signal={item.signal}/></span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0"><IndicatorDetail item={item} period={period}/></AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <SentimentSection title="섹터별 공포 탐욕" description="GICS 11개 섹터의 심리 점수와 시장 대비 베타" items={sectorSentiment} period={period} kind="sector" favorites={favorites} onToggle={toggleFavorite}/>
        <SentimentSection title="테마별 공포 탐욕" description="주요 성장 테마의 심리 점수와 시장 대비 베타" items={themeSentiment} period={period} kind="theme" favorites={favorites} onToggle={toggleFavorite}/>
      </div>
      <Toaster richColors position="bottom-right"/>
    </main>
  );
}
