"use client";
import {CompositeMarketSection,ScenarioSection} from "./dashboard-ui";
import SectorSentimentChart from '../components/sector-sentiment-chart';
import ThemeSentimentDashboardChart from '../components/theme-sentiment-dashboard-chart';
import OutbreakEvents, {OutbreakSummary} from './outbreak-events';


import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays,
  CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3, Database, Fuel, Gauge, Info,
  LineChart as LineChartIcon, LogOut, Map as MapIcon, Settings2, ShieldCheck,
  Sparkles, Star, TrendingDown, TrendingUp, UserRound, Zap,
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader,
  SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import CountryFearGreed from "./country-fear-greed";
import CorePceRow from "./core-pce-row";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import DashboardSideRails from "@/components/dashboard-side-rails";

type Direction = "up" | "down" | "flat";
type Signal = "positive" | "negative" | "neutral";
type Period = "1일" | "1주일" | "1개월" | "3개월" | "6개월" | "1년";
type CountryCode = "US" | "KR" | "CN" | "JP" | "EU";
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
type SentimentSort = "default" | "high" | "low" | "name";
type SentimentStrength = "all" | "greed" | "neutral" | "fear";
type SentimentView = "strip" | "grid";
type SessionUser = { displayName: string; email: string };
type FavoriteRecord = { itemKey: string; itemType: SentimentKind; itemName: string };
type IndicatorMeta = {
  country: CountryCode;
  currentDate: string;
  previousDate: string;
  releaseCycle: string;
  nextRelease: string;
};
type LiveIndicatorPatch = Pick<Indicator, "current" | "previous" | "direction" | "signal" | "trend" | "chart" | "source"> & {
  currentDate: string;
  previousDate: string;
  sourceUrl: string;
};
type LiveSummaryPatch = { label: string; value: string; score: number; note: string; data: ChartPoint[] };
type MarketDataPayload = {
  status: "live" | "partial" | "fallback";
  updatedAt: string;
  indicators: Record<string, LiveIndicatorPatch>;
  summary: LiveSummaryPatch[];
  warnings?: string[];
};

const indicators: Indicator[] = [
  {
    id: "core-pce", name: "근원 PCE 물가", short: "Core PCE", category: "물가", importance: 5,
    current: "최신 데이터 확인 불가", forecast: "데이터 없음", previous: "—", surprise: "—",
    direction: "flat", signal: "neutral", trend: "확인 불가", release: "공식 일정 확인 중",
    source: "FRED (BEA)", unit: "% YoY", benchmark: 2, benchmarkLabel: "물가 목표 2.0%",
    summary: "최신 데이터 확인 불가", chart: [],
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

const makeSeries = (values: number[]): ChartPoint[] => values.map((value, index) => { const date = new Date(2026, 7 - (values.length - 1 - index), 1); return {label:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`,value}; });

function makeRegionalIndicator(input: Omit<Indicator, "chart"> & { values: number[] }): Indicator {
  const { values, ...indicator } = input;
  void values;
  return { ...indicator, chart: [] };
}

const regionalIndicators: Indicator[] = [
  makeRegionalIndicator({id:"kr-cpi",name:"한국 소비자물가",short:"Korea CPI",category:"물가",importance:5,current:"2.1%",forecast:"2.2%",previous:"2.3%",surprise:"-0.1%p",direction:"down",signal:"positive",trend:"3개월 둔화",release:"10월 2일",source:"통계청",unit:"% YoY",benchmark:2,benchmarkLabel:"물가안정 목표 2%",summary:"물가 상승률이 예상보다 낮아 통화정책 부담이 완화되는 흐름입니다.",values:[2.7,2.6,2.5,2.4,2.3,2.1]}),
  makeRegionalIndicator({id:"kr-unemployment",name:"한국 실업률",short:"Korea Unemployment",category:"고용",importance:4,current:"2.8%",forecast:"2.9%",previous:"2.9%",surprise:"-0.1%p",direction:"down",signal:"positive",trend:"고용 안정",release:"9월 16일",source:"통계청",unit:"%",benchmark:3.5,benchmarkLabel:"주의 기준 3.5%",summary:"실업률이 예상과 이전치보다 낮아 고용시장에는 긍정적인 신호입니다.",values:[3.1,3.0,3.0,2.9,2.9,2.8]}),
  makeRegionalIndicator({id:"kr-exports",name:"한국 수출 증가율",short:"Korea Exports",category:"경기",importance:5,current:"+5.8%",forecast:"+5.0%",previous:"+5.4%",surprise:"+0.8%p",direction:"up",signal:"positive",trend:"반도체 중심 회복",release:"10월 1일",source:"산업통상자원부",unit:"% YoY",benchmark:0,benchmarkLabel:"증가·감소 기준 0%",summary:"수출이 예상보다 강해 제조업과 경기 모멘텀에 긍정적입니다.",values:[-1.2,0.8,2.7,4.1,5.4,5.8]}),
  makeRegionalIndicator({id:"kr-bok-rate",name:"한국 기준금리",short:"BOK Base Rate",category:"금리",importance:5,current:"2.50%",forecast:"2.50%",previous:"2.50%",surprise:"동결",direction:"flat",signal:"neutral",trend:"동결 유지",release:"10월 12일",source:"한국은행",unit:"%",benchmark:3,benchmarkLabel:"부담 기준 3.0%",summary:"기준금리 동결로 금융 여건의 급격한 변화는 제한적입니다.",values:[3.25,3.0,2.75,2.5,2.5,2.5]}),
  makeRegionalIndicator({id:"kr-pmi",name:"한국 제조업 PMI",short:"Korea Manufacturing PMI",category:"경기",importance:4,current:"50.6",forecast:"50.2",previous:"49.8",surprise:"+0.4",direction:"up",signal:"positive",trend:"확장 전환",release:"10월 1일",source:"S&P Global",unit:"지수",benchmark:50,benchmarkLabel:"확장·위축 기준 50",summary:"제조업 지수가 기준선 50을 넘어 완만한 확장 신호를 보입니다.",values:[48.1,48.7,49.2,49.5,49.8,50.6]}),

  makeRegionalIndicator({id:"cn-cpi",name:"중국 소비자물가",short:"China CPI",category:"물가",importance:5,current:"0.5%",forecast:"0.4%",previous:"0.2%",surprise:"+0.1%p",direction:"up",signal:"neutral",trend:"저물가 완화",release:"9월 9일",source:"중국 국가통계국",unit:"% YoY",benchmark:2,benchmarkLabel:"정상화 기준 2%",summary:"물가가 개선됐지만 여전히 낮아 내수 회복 여부를 추가 확인해야 합니다.",values:[-0.2,0,0.1,0.1,0.2,0.5]}),
  makeRegionalIndicator({id:"cn-ppi",name:"중국 생산자물가",short:"China PPI",category:"물가",importance:4,current:"-1.8%",forecast:"-1.9%",previous:"-2.3%",surprise:"+0.1%p",direction:"up",signal:"positive",trend:"디플레 압력 완화",release:"9월 9일",source:"중국 국가통계국",unit:"% YoY",benchmark:0,benchmarkLabel:"물가 회복 기준 0%",summary:"생산자물가 하락폭이 줄어 기업 가격 압력이 개선되는 흐름입니다.",values:[-3.1,-2.9,-2.7,-2.5,-2.3,-1.8]}),
  makeRegionalIndicator({id:"cn-pmi",name:"중국 제조업 PMI",short:"China Manufacturing PMI",category:"경기",importance:5,current:"49.7",forecast:"49.5",previous:"49.3",surprise:"+0.2",direction:"up",signal:"neutral",trend:"위축폭 축소",release:"9월 30일",source:"중국 국가통계국",unit:"지수",benchmark:50,benchmarkLabel:"확장·위축 기준 50",summary:"예상은 웃돌았지만 기준선 50 아래여서 회복 확인이 더 필요합니다.",values:[48.6,48.8,49.0,49.1,49.3,49.7]}),
  makeRegionalIndicator({id:"cn-retail",name:"중국 소매판매",short:"China Retail Sales",category:"경기",importance:4,current:"+4.2%",forecast:"+4.0%",previous:"+3.7%",surprise:"+0.2%p",direction:"up",signal:"positive",trend:"내수 회복",release:"9월 15일",source:"중국 국가통계국",unit:"% YoY",benchmark:0,benchmarkLabel:"증가·감소 기준 0%",summary:"소매판매가 예상보다 강해 내수 회복 신호로 해석합니다.",values:[2.1,2.6,3.0,3.3,3.7,4.2]}),
  makeRegionalIndicator({id:"cn-production",name:"중국 산업생산",short:"China Industrial Production",category:"경기",importance:4,current:"+5.5%",forecast:"+5.4%",previous:"+5.2%",surprise:"+0.1%p",direction:"up",signal:"positive",trend:"생산 개선",release:"9월 15일",source:"중국 국가통계국",unit:"% YoY",benchmark:0,benchmarkLabel:"증가·감소 기준 0%",summary:"산업생산이 예상치를 웃돌아 제조업 활동에 긍정적인 신호입니다.",values:[4.3,4.6,4.8,5.0,5.2,5.5]}),

  makeRegionalIndicator({id:"jp-tokyo-cpi",name:"일본 도쿄 소비자물가",short:"Tokyo CPI",category:"물가",importance:5,current:"2.6%",forecast:"2.7%",previous:"2.9%",surprise:"-0.1%p",direction:"down",signal:"positive",trend:"물가 둔화",release:"9월 25일",source:"일본 총무성",unit:"% YoY",benchmark:2,benchmarkLabel:"물가 목표 2%",summary:"도쿄 물가가 예상보다 낮아 추가 긴축 부담이 완화됐습니다.",values:[3.2,3.1,3.0,2.9,2.9,2.6]}),
  makeRegionalIndicator({id:"jp-unemployment",name:"일본 실업률",short:"Japan Unemployment",category:"고용",importance:4,current:"2.5%",forecast:"2.5%",previous:"2.6%",surprise:"예상 부합",direction:"down",signal:"positive",trend:"고용 안정",release:"10월 1일",source:"일본 총무성",unit:"%",benchmark:3,benchmarkLabel:"주의 기준 3%",summary:"낮은 실업률이 유지돼 고용시장은 안정적인 상태입니다.",values:[2.8,2.7,2.7,2.6,2.6,2.5]}),
  makeRegionalIndicator({id:"jp-production",name:"일본 산업생산",short:"Japan Industrial Production",category:"경기",importance:4,current:"+1.2%",forecast:"+0.8%",previous:"-0.6%",surprise:"+0.4%p",direction:"up",signal:"positive",trend:"생산 반등",release:"9월 30일",source:"일본 경제산업성",unit:"% MoM",benchmark:0,benchmarkLabel:"증가·감소 기준 0%",summary:"산업생산이 감소에서 증가로 전환해 경기에는 긍정적입니다.",values:[-1.1,-0.8,-0.4,0.2,-0.6,1.2]}),
  makeRegionalIndicator({id:"jp-boj-rate",name:"일본 정책금리",short:"BOJ Policy Rate",category:"금리",importance:5,current:"0.50%",forecast:"0.50%",previous:"0.50%",surprise:"동결",direction:"flat",signal:"neutral",trend:"정책 정상화 관찰",release:"9월 18일",source:"일본은행",unit:"%",benchmark:1,benchmarkLabel:"긴축 부담 기준 1%",summary:"정책금리 동결로 단기 금융 여건 변화는 제한적입니다.",values:[0.1,0.25,0.25,0.5,0.5,0.5]}),
  makeRegionalIndicator({id:"jp-tankan",name:"일본 단칸 대기업지수",short:"BOJ Tankan",category:"경기",importance:4,current:"13",forecast:"12",previous:"12",surprise:"+1",direction:"up",signal:"positive",trend:"기업심리 개선",release:"10월 1일",source:"일본은행",unit:"지수",benchmark:0,benchmarkLabel:"낙관·비관 기준 0",summary:"대기업 심리가 예상보다 양호해 설비투자 환경에 긍정적입니다.",values:[8,9,10,11,12,13]}),

  makeRegionalIndicator({id:"eu-cpi",name:"유로존 소비자물가",short:"Eurozone CPI",category:"물가",importance:5,current:"2.1%",forecast:"2.1%",previous:"2.0%",surprise:"예상 부합",direction:"up",signal:"neutral",trend:"목표 부근",release:"9월 17일",source:"Eurostat",unit:"% YoY",benchmark:2,benchmarkLabel:"물가 목표 2%",summary:"물가가 목표 부근에서 움직여 통화정책에는 중립적인 환경입니다.",values:[2.4,2.3,2.2,2.1,2.0,2.1]}),
  makeRegionalIndicator({id:"eu-unemployment",name:"유로존 실업률",short:"Eurozone Unemployment",category:"고용",importance:4,current:"6.2%",forecast:"6.2%",previous:"6.3%",surprise:"예상 부합",direction:"down",signal:"positive",trend:"고용 안정",release:"10월 1일",source:"Eurostat",unit:"%",benchmark:7,benchmarkLabel:"주의 기준 7%",summary:"실업률이 낮아져 유로존 고용시장은 안정적인 흐름입니다.",values:[6.6,6.5,6.4,6.4,6.3,6.2]}),
  makeRegionalIndicator({id:"eu-gdp",name:"유로존 GDP 성장률",short:"Eurozone GDP",category:"경기",importance:5,current:"0.2%",forecast:"0.2%",previous:"0.1%",surprise:"예상 부합",direction:"up",signal:"positive",trend:"저성장 회복",release:"10월 30일",source:"Eurostat",unit:"% QoQ",benchmark:0,benchmarkLabel:"성장·침체 기준 0%",summary:"성장률이 플러스를 유지해 침체 위험이 완만하게 낮아졌습니다.",values:[-0.1,0,0.1,0.1,0.1,0.2]}),
  makeRegionalIndicator({id:"eu-ecb-rate",name:"ECB 예금금리",short:"ECB Deposit Rate",category:"금리",importance:5,current:"2.00%",forecast:"2.00%",previous:"2.00%",surprise:"동결",direction:"flat",signal:"neutral",trend:"완화 이후 동결",release:"9월 10일",source:"ECB",unit:"%",benchmark:3,benchmarkLabel:"긴축 부담 기준 3%",summary:"예금금리 동결로 금융 여건은 이전 회의와 비슷합니다.",values:[3.5,3.25,3.0,2.5,2.0,2.0]}),
  makeRegionalIndicator({id:"eu-pmi",name:"유로존 종합 PMI",short:"Eurozone Composite PMI",category:"경기",importance:4,current:"51.2",forecast:"50.9",previous:"50.7",surprise:"+0.3",direction:"up",signal:"positive",trend:"확장 강화",release:"9월 23일",source:"S&P Global",unit:"지수",benchmark:50,benchmarkLabel:"확장·위축 기준 50",summary:"종합 PMI가 기준선 위에서 개선돼 서비스와 제조업의 완만한 회복을 나타냅니다.",values:[49.4,49.8,50.1,50.4,50.7,51.2]}),
];

const allIndicators = [...indicators, ...regionalIndicators];

const indicatorMeta: Record<string, IndicatorMeta> = {
  "core-pce":{country:"US",currentDate:"",previousDate:"",releaseCycle:"월간",nextRelease:""},
  cpi:{country:"US",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-09-11"},
  ppi:{country:"US",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-09-10"},
  unemployment:{country:"US",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-10-02"},
  payrolls:{country:"US",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-10-02"},
  claims:{country:"US",currentDate:"2026.09.03",previousDate:"2026.08.27",releaseCycle:"주간",nextRelease:"2026-09-10"},
  gdp:{country:"US",currentDate:"2026.06.30",previousDate:"2026.03.31",releaseCycle:"분기",nextRelease:"2026-09-24"},
  ism:{country:"US",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-10-01"},
  retail:{country:"US",currentDate:"2026.07.31",previousDate:"2026.06.30",releaseCycle:"월간",nextRelease:"2026-09-16"},
  "ten-year":{country:"US",currentDate:"2026.09.04",previousDate:"2026.09.03",releaseCycle:"매 거래일",nextRelease:"실시간"},
  "kr-cpi":{country:"KR",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-10-02"},
  "kr-unemployment":{country:"KR",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-09-16"},
  "kr-exports":{country:"KR",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-10-01"},
  "kr-bok-rate":{country:"KR",currentDate:"2026.08.28",previousDate:"2026.07.10",releaseCycle:"연 8회",nextRelease:"2026-10-12"},
  "kr-pmi":{country:"KR",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-10-01"},
  "cn-cpi":{country:"CN",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-09-09"},
  "cn-ppi":{country:"CN",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-09-09"},
  "cn-pmi":{country:"CN",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-09-30"},
  "cn-retail":{country:"CN",currentDate:"2026.07.31",previousDate:"2026.06.30",releaseCycle:"월간",nextRelease:"2026-09-15"},
  "cn-production":{country:"CN",currentDate:"2026.07.31",previousDate:"2026.06.30",releaseCycle:"월간",nextRelease:"2026-09-15"},
  "jp-tokyo-cpi":{country:"JP",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-09-25"},
  "jp-unemployment":{country:"JP",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-10-01"},
  "jp-production":{country:"JP",currentDate:"2026.07.31",previousDate:"2026.06.30",releaseCycle:"월간",nextRelease:"2026-09-30"},
  "jp-boj-rate":{country:"JP",currentDate:"2026.07.31",previousDate:"2026.06.17",releaseCycle:"연 8회",nextRelease:"2026-09-18"},
  "jp-tankan":{country:"JP",currentDate:"2026.06.30",previousDate:"2026.03.31",releaseCycle:"분기",nextRelease:"2026-10-01"},
  "eu-cpi":{country:"EU",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-09-17"},
  "eu-unemployment":{country:"EU",currentDate:"2026.07.31",previousDate:"2026.06.30",releaseCycle:"월간",nextRelease:"2026-10-01"},
  "eu-gdp":{country:"EU",currentDate:"2026.06.30",previousDate:"2026.03.31",releaseCycle:"분기",nextRelease:"2026-10-30"},
  "eu-ecb-rate":{country:"EU",currentDate:"2026.07.23",previousDate:"2026.06.11",releaseCycle:"연 8회",nextRelease:"2026-09-10"},
  "eu-pmi":{country:"EU",currentDate:"2026.08.31",previousDate:"2026.07.31",releaseCycle:"월간",nextRelease:"2026-09-23"},
};


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
  {name:"드론·UAM",score:65,data:makeSeries([38,41,45,48,52,55,58,61,59,62,64,65])},
  {name:"의료기기",score:56,data:makeSeries([48,49,51,50,53,52,54,55,53,54,55,56])},
  {name:"디지털헬스",score:52,data:makeSeries([43,46,49,47,50,53,51,54,52,50,51,52])},
  {name:"K-콘텐츠·드라마",score:47,data:makeSeries([55,53,50,48,45,43,46,49,51,48,46,47])},
  {name:"게임·e스포츠",score:58,data:makeSeries([44,47,49,52,50,54,56,53,55,57,56,58])},
  {name:"방산",score:72,data:makeSeries([39,44,48,52,57,60,63,67,65,69,71,72])},
  {name:"클라우드·SaaS",score:62,data:makeSeries([48,50,53,55,57,59,58,60,61,59,60,62])},
  {name:"핀테크",score:45,data:makeSeries([52,50,47,44,42,45,48,46,43,44,46,45])},
  {name:"블록체인·디지털자산",score:69,data:makeSeries([34,41,38,47,52,49,58,61,57,65,67,69])},
  {name:"AR·VR",score:39,data:makeSeries([54,50,47,43,41,38,36,40,42,38,37,39])},
  {name:"휴머노이드",score:76,data:makeSeries([36,42,48,53,58,62,66,70,68,72,74,76])},
  {name:"핵융합",score:61,data:makeSeries([31,35,39,44,47,51,55,58,56,59,60,61])},
  {name:"탄소포집",score:41,data:makeSeries([52,49,46,44,40,38,42,45,43,40,42,41])},
  {name:"희토류·핵심광물",score:67,data:makeSeries([46,49,52,55,53,58,60,63,61,64,66,67])},
  {name:"데이터센터 액체냉각",score:70,data:makeSeries([41,45,50,54,58,61,64,66,65,68,69,70])},
  {name:"실리콘 포토닉스",score:64,data:makeSeries([37,41,45,49,52,56,59,61,58,62,63,64])},
  {name:"AI 신약개발",score:55,data:makeSeries([46,49,51,48,52,54,50,53,56,54,53,55])},
  {name:"자원 재활용",score:36,data:makeSeries([51,48,45,42,39,36,34,37,40,38,35,36])},
];

const staticSummaryItems = [
  {label:"종합",value:"중립",score:54,note:"물가 부담 ↔ 경기 회복",icon:Gauge,data:[]},
  {label:"물가",value:"주의",score:38,note:"근원 PCE 재상승",icon:CircleAlert,data:[]},
  {label:"고용",value:"둔화",score:46,note:"급격한 침체 신호는 아님",icon:Activity,data:[]},
  {label:"금리",value:"개선",score:68,note:"10년물 금리 하락",icon:CheckCircle2,data:[]},
  {label:"유가",value:"주의",score:42,note:"WTI 변동성 확대",icon:Fuel,data:[]},
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
    "드론·UAM":"베타 1.83","의료기기":"베타 0.86","디지털헬스":"베타 1.24","K-콘텐츠·드라마":"베타 1.07","게임·e스포츠":"베타 1.31","방산":"베타 0.92","클라우드·SaaS":"베타 1.29","핀테크":"베타 1.43","블록체인·디지털자산":"베타 2.04","AR·VR":"베타 1.66","휴머노이드":"베타 1.89","핵융합":"베타 1.77","탄소포집":"베타 1.38","희토류·핵심광물":"베타 1.21","데이터센터 액체냉각":"베타 1.35","실리콘 포토닉스":"베타 1.52","AI 신약개발":"베타 1.47","자원 재활용":"베타 1.09",
  },
};

const categories = ["전체", "물가", "고용", "경기", "금리"] as const;
const periods: Period[] = ["1일", "1주일", "1개월", "3개월", "6개월", "1년"];
const periodPoints: Record<Period, number> = {"1일":2,"1주일":3,"1개월":4,"3개월":5,"6개월":7,"1년":12};
const countryFilters: {code:"ALL" | CountryCode; label:string; flag:string}[] = [
  {code:"ALL",label:"전체",flag:"🌐"},{code:"US",label:"미국",flag:"🇺🇸"},{code:"KR",label:"한국",flag:"🇰🇷"},
  {code:"CN",label:"중국",flag:"🇨🇳"},{code:"JP",label:"일본",flag:"🇯🇵"},{code:"EU",label:"유럽",flag:"🇪🇺"},
];
const countryMap: Record<CountryCode, {label:string;flag:string}> = {
  US:{label:"미국",flag:"🇺🇸"},KR:{label:"한국",flag:"🇰🇷"},CN:{label:"중국",flag:"🇨🇳"},JP:{label:"일본",flag:"🇯🇵"},EU:{label:"유럽",flag:"🇪🇺"},
};

function getSentimentStage(score: number) {
  if (score < 20) return "극단 공포";
  if (score < 40) return "공포";
  if (score < 60) return "중립";
  if (score < 80) return "탐욕";
  return "극단 탐욕";
}

function getSentimentColor(score: number) {
  if (score < 20) return "#b91c1c";
  if (score < 40) return "#ef4444";
  if (score < 60) return "#64748b";
  if (score < 80) return "#16a34a";
  return "#166534";
}

function sentimentKey(kind: SentimentKind, name: string) {
  return `${kind}:${name}`;
}

function getVisibleSeries(data: ChartPoint[], period: Period) {
  const available = data.filter((point) => Number.isFinite(point.value));
  return available.slice(-periodPoints[period]);
}

function formatUpdatedAt(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

function getDDay(value: string) {
  if (value === "실시간") return "실시간";
  const targetDate = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(targetDate.getTime())) return "—";
  const now = new Date();
  const todayKstText = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Seoul", year:"numeric", month:"2-digit", day:"2-digit",
  }).format(now);
  const todayKst = new Date(`${todayKstText}T00:00:00+09:00`);
  const days = Math.ceil((targetDate.getTime() - todayKst.getTime()) / 86_400_000);
  if (days === 0) return "D-DAY";
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}

function displayDate(value: string) {
  if (value === "실시간") return value;
  const [,month,day] = value.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function betaOf(item: SentimentItem) {
  return Number(volatilityByKind.theme[item.name]?.replace("베타 ", "")) || 0;
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
      <div className="relative">
        <Progress value={score} aria-label={`${label} ${score}점`} className="score-progress" />
        <span className="score-dot" style={{left:`${score}%`}} aria-hidden="true" />
      </div>
      {!sentiment && (
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

function SentimentCard({ item, period, kind, favorite, onToggle }: { item: SentimentItem; period: Period; kind: SentimentKind; favorite: boolean; onToggle?: (kind: SentimentKind, item: SentimentItem) => void }) {
  const visible = getVisibleSeries(item.data, period);
  const change = visible.length > 1 ? visible[visible.length - 1].value - visible[0].value : 0;
  const trend: Direction = change > 1 ? "up" : change < -1 ? "down" : "flat";
  const color = getSentimentColor(item.score);
  const stage = getSentimentStage(item.score);
  const volatility = volatilityByKind[kind][item.name];
  return (
    <article className={`sentiment-card group relative ${kind === "global" ? "country-sentiment-card" : ""}`} style={kind === "global" ? {"--sentiment-accent":color} as CSSProperties : undefined}>
      {kind === "global" && <img className="country-flag-backdrop" src={`/flags/${({"미국":"us","한국":"kr","중국":"cn","일본":"jp","유럽":"eu"} as Record<string,string>)[item.name]}.svg`} alt="" aria-hidden="true"/>}
      {onToggle && <button type="button" className={`favorite-action ${favorite ? "is-favorite" : ""}`} onClick={() => onToggle(kind, item)} aria-label={`${item.name} ${favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}`}>
        <Star className={`size-5 ${favorite ? "fill-current" : ""}`}/><span>{favorite ? "즐겨찾기 해제" : "+ 즐겨찾기"}</span>
      </button>}
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-lg font-extrabold text-slate-950">{item.name}</h3>{item.subtitle && <p className="mt-0.5 text-sm text-slate-500">{item.subtitle}</p>}</div>
        <Badge variant="outline" className="stage-badge" style={{color,borderColor:`${color}55`,backgroundColor:`${color}10`}}>{stage}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-[54px_minmax(0,1fr)] items-end gap-3">
        <div className="sentiment-score" aria-label={`${item.name} ${stage} ${item.score}점`}><strong className="block text-3xl font-black text-slate-950">{item.score}</strong></div>
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

function SentimentSection({ title, description, items, period, kind, favorites, onToggle }: { title: string; description: string; items: SentimentItem[]; period: Period; kind: SentimentKind; favorites: Set<string>; onToggle?: (kind: SentimentKind, item: SentimentItem) => void }) {
  const [sort, setSort] = useState<SentimentSort>("default");
  const [strength, setStrength] = useState<SentimentStrength>("all");
  const [view, setView] = useState<SentimentView>("grid");
  const showControls = kind !== "global";
  const filterOptions: readonly (readonly [SentimentStrength,string])[] = [
    ["all","전체"],["greed","탐욕"],["neutral","중립"],["fear","공포"],
  ];
  const visibleItems = useMemo(() => {
    const filteredItems = items.filter((item) => {
      if (strength === "greed") return item.score >= 60;
      if (strength === "neutral") return item.score >= 40 && item.score < 60;
      if (strength === "fear") return item.score < 40;
      return true;
    });
    if (sort === "high") return [...filteredItems].sort((a,b) => b.score - a.score);
    if (sort === "low") return [...filteredItems].sort((a,b) => a.score - b.score);
    if (sort === "name") return [...filteredItems].sort((a,b) => a.name.localeCompare(b.name, "ko"));
    return filteredItems;
  }, [items,sort,strength]);
  return (
    <section className="mt-6" aria-labelledby={`${kind}-title`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div><div className="flex items-center gap-2"><MapIcon className="size-5 text-violet-300"/><h2 id={`${kind}-title`} className="text-xl font-extrabold tracking-[-0.03em] text-white">{title}</h2></div><p className="mt-1 text-sm text-slate-300">{description} · {period}</p></div>
      </div>
      {showControls && (
        <div className="sentiment-controls">
          <div className="sentiment-control-group" role="group" aria-label={`${title} 보기 방식`}>
            <Button size="sm" variant="ghost" aria-pressed={view === "strip"} onClick={() => setView("strip")}>한 줄</Button>
            <Button size="sm" variant="ghost" aria-pressed={view === "grid"} onClick={() => setView("grid")}>전체</Button>
          </div>
          <div className="sentiment-control-group" role="group" aria-label={`${title} 강도 필터`}>
            {filterOptions.map(([value,label]) => <Button key={value} size="sm" variant="ghost" aria-pressed={strength === value} onClick={() => setStrength(value)}>{label}</Button>)}
          </div>
          <Select value={sort} onValueChange={(value) => setSort(value as SentimentSort)}>
            <SelectTrigger size="sm" className="sentiment-sort" aria-label={`${title} 정렬`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">기본순</SelectItem>
              <SelectItem value="high">높은 점수순</SelectItem>
              <SelectItem value="low">낮은 점수순</SelectItem>
              <SelectItem value="name">이름순</SelectItem>
            </SelectContent>
          </Select>
          <span className="sentiment-count">{visibleItems.length}개</span>
        </div>
      )}
      <div className={`sentiment-grid sentiment-grid-${kind} ${view === "strip" && showControls ? "is-strip" : ""}`}>
        {visibleItems.map((item) => <SentimentCard key={item.name} item={item} period={period} kind={kind} favorite={favorites.has(sentimentKey(kind,item.name))} onToggle={onToggle}/>)}
      </div>
    </section>
  );
}

function CompactGauge({ item, selected, onSelect }: { item: SentimentItem; selected: boolean; onSelect: () => void }) {
  const color = getSentimentColor(item.score);
  return (
    <button type="button" className="compact-gauge" data-snapshot-item aria-pressed={selected} onClick={onSelect} title={`${item.name} ${item.score}점${selected ? ", 선택됨" : ""}`}>
      <div className="relative size-12 shrink-0">
        <svg viewBox="0 0 44 44" className="size-12 -rotate-90" aria-hidden="true">
          <circle cx="22" cy="22" r="18" pathLength="100" fill="none" stroke="rgba(100,116,139,.24)" strokeWidth="3.5"/>
          <circle cx="22" cy="22" r="18" pathLength="100" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="butt" strokeDasharray={`${item.score} ${100-item.score}`}/>
        </svg>
        <strong className="absolute inset-0 grid place-items-center text-sm font-black text-slate-100">{item.score}</strong>
      </div>
      <span className="compact-gauge-name">{item.name}</span>
    </button>
  );
}

function SnapshotRow({ label, items, kind, selectedName, onSelect, view = "carousel", onViewChange }: { label: string; items: SentimentItem[]; kind: "sector" | "theme"; selectedName: string | null; onSelect: (item: SentimentItem) => void; view?: "carousel" | "grid"; onViewChange?: (view: "carousel" | "grid") => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef({active:false,startX:0,lastX:0,lastTime:0,scrollLeft:0,velocity:0,moved:false,frame:0});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const selectedItem = items.find((item) => item.name === selectedName);

  function updateOverflow() {
    const element = scroller.current;
    if (!element || view === "grid") {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(element.scrollLeft > 3);
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 3);
  }

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const update = () => updateOverflow();
    update();
    element.addEventListener("scroll", update, {passive:true});
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
      cancelAnimationFrame(drag.current.frame);
    };
  }, [items.length,view]);

  function itemStep(element: HTMLDivElement) {
    const firstItem = element.querySelector<HTMLElement>("[data-snapshot-item]");
    if (!firstItem) return 96;
    const styles = window.getComputedStyle(element);
    return firstItem.offsetWidth + (Number.parseFloat(styles.columnGap || styles.gap) || 0);
  }

  function snapToItem(element: HTMLDivElement) {
    const step = itemStep(element);
    const target = Math.round(element.scrollLeft / step) * step;
    element.classList.remove("is-dragging");
    element.scrollTo({left:target,behavior:"smooth"});
  }

  function scroll(direction: -1 | 1) {
    const element = scroller.current;
    if (!element) return;
    const step = itemStep(element);
    const distance = Math.min(element.clientWidth * 0.78, step * 5);
    const target = Math.round((element.scrollLeft + direction * distance) / step) * step;
    element.scrollTo({left:target,behavior:"smooth"});
  }
  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || view === "grid") return;
    cancelAnimationFrame(drag.current.frame);
    drag.current = {active:true,startX:event.clientX,lastX:event.clientX,lastTime:performance.now(),scrollLeft:event.currentTarget.scrollLeft,velocity:0,moved:false,frame:0};
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("is-dragging");
  }
  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.current.lastTime);
    const delta = event.clientX - drag.current.lastX;
    event.currentTarget.scrollLeft = drag.current.scrollLeft - (event.clientX - drag.current.startX);
    drag.current.velocity = (-delta / elapsed) * 0.78 + drag.current.velocity * 0.22;
    drag.current.lastX = event.clientX;
    drag.current.lastTime = now;
    if (Math.abs(event.clientX - drag.current.startX) > 5) drag.current.moved = true;
    event.preventDefault();
  }
  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const element = event.currentTarget;
    let velocity = drag.current.velocity;
    let previous = performance.now();
    const coast = (time: number) => {
      const elapsed = Math.min(32, time - previous);
      previous = time;
      element.scrollLeft += velocity * elapsed;
      velocity *= Math.pow(0.91, elapsed / 16);
      const reachedEdge = element.scrollLeft <= 0 || element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
      if (Math.abs(velocity) > 0.025 && !reachedEdge) {
        drag.current.frame = requestAnimationFrame(coast);
      } else {
        snapToItem(element);
      }
    };
    if (Math.abs(velocity) > 0.04) drag.current.frame = requestAnimationFrame(coast);
    else snapToItem(element);
  }
  return (
    <div className={`snapshot-line snapshot-line-${kind}`}>
      <div className="snapshot-row-head">
        <strong className="snapshot-label">{label}</strong>
        {kind === "theme" && onViewChange && (
          <div className="snapshot-view-toggle" role="group" aria-label="테마 보기 방식">
            <button type="button" aria-pressed={view === "carousel"} onClick={() => onViewChange("carousel")}>한 줄</button>
            <button type="button" aria-pressed={view === "grid"} onClick={() => onViewChange("grid")}>전체</button>
          </div>
        )}
        <span className="snapshot-selection" aria-live="polite">{selectedItem ? `선택 · ${selectedItem.name} ${selectedItem.score}점` : "항목을 선택하세요"}</span>
      </div>
      <div className="snapshot-track">
        {canScrollLeft && <button type="button" className="snapshot-arrow snapshot-arrow-left" onClick={() => scroll(-1)} aria-label={`${label} 이전 항목`}><ChevronLeft className="size-5"/></button>}
        <div ref={scroller} className={`snapshot-scroll ${view === "grid" ? "is-grid" : ""}`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onClickCapture={(event) => { if (drag.current.moved) { event.preventDefault(); event.stopPropagation(); drag.current.moved = false; } }}>
          {items.map((item) => <CompactGauge key={item.name} item={item} selected={selectedName === item.name} onSelect={() => onSelect(item)}/>)}
        </div>
        {canScrollRight && <button type="button" className="snapshot-arrow snapshot-arrow-right" onClick={() => scroll(1)} aria-label={`${label} 다음 항목`}><ChevronRight className="size-5"/></button>}
      </div>
    </div>
  );
}

function SentimentSnapshot() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [themeView, setThemeView] = useState<"carousel" | "grid">("carousel");
  return (
    <section className="snapshot-panel" aria-labelledby="snapshot-title">
      <div className="snapshot-heading"><Gauge className="size-5 text-amber-300"/><h2 id="snapshot-title">섹터·테마 모아보기</h2></div>
      <p className="mb-3 text-sm text-amber-200">예시 데이터 · 아래 점수와 추세는 실제 공포·탐욕 지수가 아니며 CNN과 무관합니다.</p>
      <SnapshotRow label="섹터" kind="sector" items={sectorSentiment} selectedName={selectedSector} onSelect={(item) => setSelectedSector((current) => current === item.name ? null : item.name)}/>
      <SnapshotRow label="테마" kind="theme" items={themeSentiment} selectedName={selectedTheme} onSelect={(item) => setSelectedTheme((current) => current === item.name ? null : item.name)} view={themeView} onViewChange={setThemeView}/>
    </section>
  );
}

function ThemeAnalysis({ period }: { period: Period }) {
  const ranked = themeSentiment.map((item) => {
    const visible = getVisibleSeries(item.data, period);
    const change = visible.length > 1 ? visible.at(-1)!.value - visible[0].value : 0;
    return {...item,change,beta:betaOf(item)};
  });
  const buy = [...ranked].filter((item) => item.score >= 45 && item.score < 70 && item.change > 0).sort((a,b) => b.change - a.change)[0] ?? ranked[0];
  const sell = [...ranked].sort((a,b) => b.score - a.score)[0];
  const hold = [...ranked].filter((item) => item.score >= 45 && item.score <= 60).sort((a,b) => Math.abs(a.change) - Math.abs(b.change))[0] ?? ranked[0];
  const volatile = [...ranked].sort((a,b) => b.beta - a.beta)[0];
  const surge = [...ranked].filter((item) => item.score < 80).sort((a,b) => (b.change * b.beta) - (a.change * a.beta))[0];
  const safe = [...ranked].filter((item) => item.score >= 40).sort((a,b) => a.beta - b.beta)[0];
  const insights = [
    {title:"매수하기 좋은 테마는?",answer:buy.name,detail:`${period} +${buy.change}점 · ${volatilityByKind.theme[buy.name]}`,icon:TrendingUp,tone:"positive"},
    {title:"매도해야 하는 테마는?",answer:sell.name,detail:`과열 점검 · 탐욕 ${sell.score}점`,icon:TrendingDown,tone:"negative"},
    {title:"일단 보유해야 하는 테마는?",answer:hold.name,detail:`중립권 ${hold.score}점 · 변동 안정`,icon:ShieldCheck,tone:"neutral"},
    {title:"변동성이 가장 심한 테마는?",answer:volatile.name,detail:volatilityByKind.theme[volatile.name],icon:Zap,tone:"warning"},
    {title:"1년 안 급등할 것 같은 테마는?",answer:`관찰 후보 · ${surge.name}`,detail:`모멘텀·베타 결합 샘플, 상승 보장 아님`,icon:Sparkles,tone:"violet"},
    {title:"가장 안전한 테마는?",answer:safe.name,detail:`표본 내 최저 ${volatilityByKind.theme[safe.name]}`,icon:ShieldCheck,tone:"safe"},
  ];
  return (
    <section className="theme-analysis" aria-labelledby="theme-analysis-title">
      <div className="theme-analysis-heading"><div><p className="eyebrow">샘플 모델 분석</p><h2 id="theme-analysis-title">지금 어떤 테마를 봐야 할까?</h2></div><span>공포탐욕·추세·베타를 함께 비교</span></div>
      <div className="theme-analysis-grid">
        {insights.map(({title,answer,detail,icon:Icon,tone}) => (
          <article key={title} className={`insight-card insight-${tone}`}><Icon className="size-5"/><div><p>{title}</p><strong>{answer}</strong><span>{detail}</span></div></article>
        ))}
      </div>
    </section>
  );
}

function IndicatorDetail({ item, period }: { item: Indicator; period: Period }) {
  const history = item.chart.filter((point) => Number.isFinite(point.value));
  const visible = getVisibleSeries(history, period);
  const meta = indicatorMeta[item.id];
  const country = countryMap[meta.country];
  return (
    <div className="indicator-detail">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-5 py-4">
        <div className="flex items-center gap-2"><LineChartIcon className="size-5 text-blue-700"/><span className="text-xl" aria-hidden="true">{country.flag}</span><h3 className="text-lg font-extrabold text-slate-950">{item.name} 과거 흐름</h3><Badge variant="outline" className="rounded-none border-blue-300 bg-blue-50 text-blue-700">{period}</Badge></div>
        <div className="flex items-center gap-2 text-sm text-slate-600"><span className="inline-block w-7 border-t border-dashed border-rose-500"/><span>{item.benchmarkLabel}</span></div>
      </div>
      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.75fr)]">
        <div className="h-72 w-full" aria-label={`${item.name} ${period} 과거 흐름`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visible} margin={{top:18,right:20,left:-12,bottom:0}}>
              <defs><linearGradient id={`macro-${item.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2463eb" stopOpacity={0.28}/><stop offset="100%" stopColor="#2463eb" stopOpacity={0.02}/></linearGradient></defs>
              <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:12}}/>
              <YAxis axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:12}} domain={([min,max]) => [Math.min(Number(min), item.benchmark - Math.max(1, Math.abs(item.benchmark)*0.15)), Math.max(Number(max), item.benchmark + Math.max(1, Math.abs(item.benchmark)*0.15))]}/>
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
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-300 pt-4 text-sm"><div><dt className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="size-3.5"/>다음 발표</dt><dd className="mt-1 font-bold text-slate-700">{displayDate(meta.nextRelease)} · {getDDay(meta.nextRelease)}</dd></div><div><dt className="text-xs text-slate-500">데이터 출처</dt><dd className="mt-1 font-bold text-slate-700">{item.source}</dd></div></dl>
        </div>
      </div>
    </div>
  );
}

function periodTrend(item: Indicator, period: Period): { direction: Direction; label: string } {
  const series = getVisibleSeries(item.chart, period);
  if (series.length < 2) return { direction: "flat", label: `${period} 확인 불가` };
  const first = Number(series[0].value);
  const last = Number(series[series.length - 1].value);
  const delta = last - first;
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.005) return { direction: "flat", label: `${period} 보합` };
  return delta > 0
    ? { direction: "up", label: `${period} 상승` }
    : { direction: "down", label: `${period} 하락` };
}

function SummaryMiniChart({ data, period, score, label }: { data: ChartPoint[]; period: Period; score: number; label: string }) {
  const color = getSentimentColor(score);
  const visible = getVisibleSeries(data, period);
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
  const [view,setView]=useState("dashboard");
  // Deep-link to the outbreak tab from detailed analysis pages.
  useEffect(()=>{
    const sync=()=>setView(new URLSearchParams(window.location.search).get("view")==="scenarios"?"scenarios":"dashboard");
    sync();
    window.addEventListener("popstate",sync);
    return()=>window.removeEventListener("popstate",sync);
  },[]);
  const selectHeaderView=(next:"dashboard"|"scenarios")=>{
    setView(next);
    const url=new URL(window.location.href);
    if(next==="scenarios")url.searchParams.set("view","scenarios");
    else url.searchParams.delete("view");
    window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
  };
  const [outbreakEvent,setOutbreakEvent]=useState('fed');
  const [category, setCategory] = useState<(typeof categories)[number]>("전체");
  const [countryFilter, setCountryFilter] = useState<Set<"ALL" | CountryCode>>(new Set(["ALL"]));
  const [importanceLevels, setImportanceLevels] = useState<Set<number>>(new Set());
  const [importanceFilterOpen, setImportanceFilterOpen] = useState(false);
  const [countryFilterOpen, setCountryFilterOpen] = useState(false);
  const [openIndicator, setOpenIndicator] = useState("");
  const [period, setPeriod] = useState<Period>("1개월");
  const [summaryCharts, setSummaryCharts] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [marketData, setMarketData] = useState<MarketDataPayload | null>(null);
  const [marketDataLoading, setMarketDataLoading] = useState(true);
  const [marketDataError, setMarketDataError] = useState(false);
  const updatedAt = marketData?.updatedAt ?? "";
  const displayIndicators = useMemo(() => allIndicators.map((item) => {
    const patch = marketData?.indicators[item.id];
    if (!patch) return item;
    return {
      ...item,
      ...patch,
      forecast: "미제공",
      surprise: "—",
      currentDate: patch.currentDate,
      previousDate: patch.previousDate,
    };
  }), [marketData]);
  const displaySummaryItems = useMemo(() => {
    const liveSummary = new Map((marketData?.summary ?? []).map((item) => [item.label, item]));
    return staticSummaryItems.map((item) => ({ ...item, ...(liveSummary.get(item.label) ?? {}) }));
  }, [marketData]);
  const filtered = useMemo(() => displayIndicators.filter((item) => {
    const meta = indicatorMeta[item.id];
    const categoryMatch = category === "전체" || item.category === category;
    const countryMatch = countryFilter.has("ALL") || countryFilter.has(meta.country);
    const importanceMatch = importanceLevels.size === 0 || importanceLevels.has(item.importance);
    return categoryMatch && countryMatch && importanceMatch;
  }), [displayIndicators,category,countryFilter,importanceLevels]);
  const catalog = useMemo(() => [
    ...sectorSentiment.map((item) => ({kind:"sector" as const,item})),
    ...themeSentiment.map((item) => ({kind:"theme" as const,item})),
  ], []);
  const favoriteItems = catalog.filter(({kind,item}) => favorites.has(sentimentKey(kind,item.name)));

  useEffect(() => {
    let active = true;
    async function loadMarketData() {
      try {
        const response = await fetch("/api/market-data", { cache: "no-store" });
        if (!response.ok) throw new Error("market data request failed");
        const payload = await response.json() as MarketDataPayload;
        if (active) {
          const hasSuccessfulPayload = Object.keys(payload.indicators).length > 0 || payload.summary.length > 0;
          setMarketData((previous) => ({
            ...payload,
            updatedAt: hasSuccessfulPayload ? payload.updatedAt : (previous?.updatedAt ?? ""),
            indicators: { ...(previous?.indicators ?? {}), ...payload.indicators },
            summary: payload.summary.length > 0 ? payload.summary : (previous?.summary ?? []),
          }));
          setMarketDataError(payload.status === "fallback");
        }
      } catch {
        if (active) setMarketDataError(true);
      } finally {
        if (active) setMarketDataLoading(false);
      }
    }
    void loadMarketData();
    const timer = window.setInterval(() => { void loadMarketData(); }, 15 * 60 * 1000);
    return () => {
      active = false;
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, []);

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
    <main className="zg-app zg-dashboard min-h-screen" data-testid="dashboard-root" data-view={view}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({ "@context": "https://schema.org",        "@type": "WebPage",       "@id": "https://zgmini.kr/#webpage",       url: "https://zgmini.kr/",       name: "ZGmini 지그미니 | 미국·한국 공포탐욕지수와 경제지표",       description: "미국·한국 공포탐욕지수의 최근 점수와 기간별 차트를 확인하세요. 물가·고용·금리 등 주요 경제지표와 데이터 관측일을 함께 제공합니다.",       isPartOf: { "@id": "https://zgmini.kr/#website" },       about: { "@id": "https://zgmini.kr/#organization" },       inLanguage: "ko-KR",      }).replace(/</g, "\\u003c")}}/>
      <SiteHeader activeView={view==="scenarios"?"scenarios":"dashboard"} onSelectView={(next)=>selectHeaderView(next)} accountTools={sessionLoading ? (
                <span className="hidden text-xs text-slate-400 sm:inline">계정 확인 중</span>
              ) : user ? (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button className="rounded-none border border-white/20 bg-white/10 text-white hover:bg-white/20 zg-header-icon-action" aria-label="사용자 설정" title="사용자 설정">
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
                            <div><p className="font-bold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{kind === "sector" ? "섹터" : "테마"} · {getSentimentStage(item.score)} {item.score}점</p></div>
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
              ) : null}/>

      {view==="dashboard"&&<DashboardSideRails accountFavorites={favoriteItems.map(({kind,item})=>({key:sentimentKey(kind,item.name),label:item.name,group:kind==="sector"?"섹터 · 예시":"테마 · 예시",href:kind==="sector"?"/sector-fear-greed/":"/theme-fear-greed/",exampleScore:item.score}))}/>}
      <div className="zg-container">
        {view!=='dashboard'&&<div className="zg-data-notice zg-data-notice-compact" role="status"><Info size={16}/><span>{marketDataLoading?'경제지표를 불러오고 있습니다.':marketData?.status==='live'?'공식 자료와 ZGmini 자체 계산값을 표시합니다.':marketDataError?'데이터 연결 지연 · 마지막 정상 수신값을 표시합니다.':'일부 지표 갱신 지연 · 마지막 정상 수신값을 유지합니다.'}</span></div>}
        {(view==='dashboard'||view==='countries')&&<CountryFearGreed/>}
        {view==='dashboard'&&<>
          <CompositeMarketSection items={displaySummaryItems} points={periodPoints[period]} demo={false} loading={marketDataLoading}/>
          <div className="zg-dashboard-secondary">
            <OutbreakSummary onOpen={id=>{setOutbreakEvent(id);setView('scenarios');}}/>
            <div id="strength" className="zg-strength-grid"><SectorSentimentChart/><ThemeSentimentDashboardChart/></div>
          </div>
        </>}
        {view==='scenarios'&&<OutbreakEvents initialEvent={outbreakEvent}/>}
        {view!=='dashboard' && favoriteItems.length > 0 && (
          <section className="mt-6" aria-labelledby="favorite-title">
            <div className="mb-3 flex items-center gap-2"><Star className="size-5 fill-amber-300 text-amber-300"/><h2 id="favorite-title" className="text-xl font-extrabold tracking-[-0.03em] text-white">내 즐겨찾기</h2></div>
            <div className="sentiment-grid sentiment-grid-favorite">
              {favoriteItems.map(({kind,item}) => <SentimentCard key={sentimentKey(kind,item.name)} item={item} period={period} kind={kind} favorite onToggle={user ? toggleFavorite : undefined}/>) }
            </div>
          </section>
        )}



        {view==='data'&&<section className="indicator-panel mt-6">
          <div className="border-b border-slate-300 px-4 py-4 sm:px-5">
            <div className="text-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-2"><Database className="size-5 text-[#2463eb]"/><h2 className="text-xl font-extrabold tracking-[-0.03em]">핵심 경제지표</h2></div>
              </div>
            </div>
            <div className="indicator-toolbar">
              <Tabs value={category} onValueChange={(value) => { setCategory(value as (typeof categories)[number]); setOpenIndicator(""); }}><TabsList className="h-auto w-full justify-center overflow-x-auto rounded-none bg-slate-200 p-1 sm:w-fit">{categories.map((item) => <TabsTrigger key={item} value={item} className="min-w-14 rounded-none px-3 py-1.5 data-[state=active]:text-[#1749b5]">{item}</TabsTrigger>)}</TabsList></Tabs>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[1320px]">
              <div className="indicator-grid indicator-header px-4">
                <div className="importance-header-wrap"><button type="button" className="importance-header" onClick={() => {setCountryFilterOpen((open) => !open);setImportanceFilterOpen(false)}} title="국가 필터 열기">국가 <span aria-hidden="true">▼</span></button>{countryFilterOpen && <div className="importance-popover country-popover" role="group" aria-label="국가 선택">{countryFilters.map((country) => <label key={country.code}><input type="checkbox" checked={countryFilter.has(country.code)} onChange={() => setCountryFilter((current) => { if (country.code === "ALL") return new Set(["ALL"]); const next = new Set(current); next.delete("ALL"); next.has(country.code) ? next.delete(country.code) : next.add(country.code); return next.size ? next : new Set(["ALL"]); })}/><span className="country-option"><img src={country.code === "ALL" ? "/flags/us.svg" : `/flags/${country.code === "US" ? "us" : country.code === "KR" ? "kr" : country.code === "CN" ? "cn" : country.code === "JP" ? "jp" : "eu"}.svg`} alt=""/>{country.label}</span></label>)}</div>}</div><div className="importance-header-wrap"><button type="button" className="importance-header" onClick={() => {setImportanceFilterOpen((open) => !open);setCountryFilterOpen(false)}} title="중요도 필터 열기">중요도 <span aria-hidden="true">▼</span></button>{importanceFilterOpen && <div className="importance-popover" role="group" aria-label="중요도 선택">{[5,4,3,2,1].map((level) => <label key={level}><input type="checkbox" checked={importanceLevels.has(level)} onChange={() => setImportanceLevels((current) => { const next = new Set(current); next.has(level) ? next.delete(level) : next.add(level); return next; })}/><span>{"★".repeat(level)}{"☆".repeat(5-level)}</span></label>)}</div>}</div><span>지표</span><span>차트</span><span>현재 / 발표일</span><span>예상 / 이전</span><span>추세</span><span>시장 판단</span><span>발표 주기</span><span>다음 발표 (D-day)</span>
              </div>
              <Accordion type="single" collapsible value={openIndicator} onValueChange={setOpenIndicator}>
                {filtered.map((item) => {
                  if (item.id === "core-pce") return <CorePceRow key={item.id} period={period}/>;
                  const meta = indicatorMeta[item.id];
                  const live = marketData?.indicators[item.id];
                  const country = countryMap[meta.country];
                  const selectedTrend = periodTrend(item, period);
                  return (
                  <AccordionItem key={item.id} value={item.id} className="indicator-item">
                    <AccordionTrigger className="indicator-trigger px-4 hover:no-underline">
                      <div className="indicator-grid min-w-0 flex-1">
                        <div className="indicator-country"><img src={`/flags/${meta.country === "US" ? "us" : meta.country === "KR" ? "kr" : meta.country === "JP" ? "jp" : meta.country === "CN" ? "cn" : "eu"}.svg`} alt=""/><small>{country.label}</small></div>
                        <div className="indicator-stars" aria-label={`중요도 ${item.importance}점`}>{[1,2,3,4,5].map((star) => <Star key={star} className={`size-3 ${star <= item.importance ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-300"}`}/>)}</div>
                        <div><p className="text-sm font-bold text-slate-950">{item.name}</p><p className="text-xs font-normal text-slate-500">{item.short}</p></div>
                        <div className="flex flex-col items-center"><MiniIndicatorChart item={item}/><span className="text-[11px] font-normal text-slate-500">{item.benchmarkLabel}</span></div>
                        <div><strong className="text-sm text-slate-950">{item.current}</strong><small>{live?.currentDate ?? meta.currentDate}</small></div>
                        <div><strong className="text-sm text-slate-800">{item.forecast}</strong><small>이전 {item.previous} · {live?.previousDate ?? meta.previousDate}</small></div>
                        <span className={`flex items-center justify-center gap-1 text-xs font-semibold trend-${selectedTrend.direction}`}><DirectionIcon direction={selectedTrend.direction}/>{selectedTrend.label}</span><span><SignalBadge signal={item.signal}/></span>
                        <span className="text-xs font-bold text-slate-600">{meta.releaseCycle}</span>
                        <div><strong className="text-xs text-slate-800">{displayDate(meta.nextRelease)}</strong><small className="d-day">{getDDay(meta.nextRelease)}</small></div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0"><IndicatorDetail item={item} period={period}/></AccordionContent>
                  </AccordionItem>
                )})}
                {filtered.length === 0 && <div className="p-8 text-center text-sm text-slate-500">선택한 국가와 중요도에 해당하는 지표가 없습니다.</div>}
              </Accordion>
            </div>
          </div>
        </section>}
        {view==='strength'&&<><SentimentSection title="섹터별 심리 점수 · 예시" description="실제 지수가 아닌 예시 점수·추세·베타 · CNN 지수와 무관" items={sectorSentiment} period={period} kind="sector" favorites={favorites} onToggle={user ? toggleFavorite : undefined}/>
        <SentimentSection title="테마별 심리 점수 · 예시" description="실제 지수가 아닌 예시 점수·추세·베타 · CNN 지수와 무관" items={themeSentiment} period={period} kind="theme" favorites={favorites} onToggle={user ? toggleFavorite : undefined}/></>}
      </div>
      {view==='dashboard'&&<SiteFooter/>}
      {view!=='dashboard'&&<footer className="zg-footer">ZGmini · 공식 자료와 독자 모델을 연결합니다. 투자 권유가 아니며, 예시 데이터는 별도로 표시합니다.</footer>}
      <Toaster richColors position="bottom-right"/>
    </main>
  );
}
