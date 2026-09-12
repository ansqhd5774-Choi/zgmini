import { env } from "cloudflare:workers";
import { payrollChanges } from "../../../lib/market-data/semantics.mjs";
import { fetchBls, fetchFred } from "../../../lib/market-data/providers.mjs";
type Point = { date: string; value: number };
type ChartPoint = { label: string; value: number };
type Direction = "up" | "down" | "flat";
type Signal = "positive" | "negative" | "neutral";

type LiveIndicator = {
  current: string;
  previous: string;
  direction: Direction;
  signal: Signal;
  trend: string;
  chart: ChartPoint[];
  source: string;
  sourceUrl: string;
  currentDate: string;
  previousDate: string;
};

const BLS_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv";
const BLS_SOURCE_URL = "https://www.bls.gov/developers/api_signature_v2.htm";
const FRED_SOURCE_URL = "https://fred.stlouisfed.org/docs/api/series_api/fred_series_observations.html";

const BLS_SERIES = {
  cpi: "CUUR0000SA0",
  ppi: "WPSFD4",
  unemployment: "LNS14000000",
  payrolls: "CES0000000001",
} as const;

const FRED_SERIES = {
  corePce: "PCEPILFE",
  tenYear: "DGS10",
  oil: "DCOILWTICO",
} as const;

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function formatNumber(value: number, digits = 1, signed = false) {
  const formatted = value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  return signed && value > 0 ? `+${formatted}` : formatted;
}

function formatPercent(value: number) {
  return `${formatNumber(value)}%`;
}

function formatPayrolls(value: number) {
  return `${formatNumber(value / 10, 1, true)}만`;
}

function toChart(points: Point[], digits = 2): ChartPoint[] {
  return points.slice(-12).map((point) => ({
    label: point.date.slice(5).replace("-", "/"),
    value: round(point.value, digits),
  }));
}

function sortPoints(points: Point[]) {
  return points
    .filter((point) => point.date && Number.isFinite(point.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function findYearAgo(points: Point[], point: Point) {
  const yearAgo = new Date(`${point.date}T00:00:00Z`);
  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
  const key = yearAgo.toISOString().slice(0, 7);
  return points.find((candidate) => candidate.date.startsWith(key));
}

function latestPair(points: Point[]) {
  const latest = points.at(-1);
  const previous = points.at(-2);
  if (!latest || !previous) throw new Error("데이터 포인트가 부족합니다.");
  return { latest, previous };
}

function makeDirection(delta: number, lowerIsBetter: boolean): { direction: Direction; signal: Signal; trend: string } {
  if (Math.abs(delta) < 0.005) return { direction: "flat", signal: "neutral", trend: "전월 대비 보합" };
  const direction = delta > 0 ? "up" : "down";
  const favorable = lowerIsBetter ? delta < 0 : delta > 0;
  return {
    direction,
    signal: favorable ? "positive" : "negative",
    trend: lowerIsBetter
      ? (delta < 0 ? "최근 둔화" : "최근 상승")
      : (delta > 0 ? "최근 개선" : "최근 둔화"),
  };
}

function makeYoyIndicator(points: Point[], options: { source: string; sourceUrl: string; lowerIsBetter: boolean }) {
  const yoyPoints: Point[] = [];
  for (const point of points) {
    const comparison = findYearAgo(points, point);
    if (comparison && comparison.value !== 0) {
      yoyPoints.push({ date: point.date, value: ((point.value / comparison.value) - 1) * 100 });
    }
  }
  const { latest, previous } = latestPair(yoyPoints);
  const movement = makeDirection(latest.value - previous.value, options.lowerIsBetter);
  return {
    current: formatPercent(latest.value),
    previous: formatPercent(previous.value),
    ...movement,
    chart: toChart(yoyPoints, 2),
    source: options.source,
    sourceUrl: options.sourceUrl,
    currentDate: latest.date,
    previousDate: previous.date,
    currentValue: latest.value,
    previousValue: previous.value,
  };
}

function makeDirectIndicator(points: Point[], options: { source: string; sourceUrl: string; suffix: string; digits?: number; lowerIsBetter: boolean; signed?: boolean }) {
  const { latest, previous } = latestPair(points);
  const movement = makeDirection(latest.value - previous.value, options.lowerIsBetter);
  const digits = options.digits ?? 2;
  const formatter = (value: number) => `${formatNumber(value, digits, options.signed)}${options.suffix}`;
  return {
    current: formatter(latest.value),
    previous: formatter(previous.value),
    ...movement,
    chart: toChart(points, digits),
    source: options.source,
    sourceUrl: options.sourceUrl,
    currentDate: latest.date,
    previousDate: previous.date,
    currentValue: latest.value,
    previousValue: previous.value,
  };
}

function scoreLabel(score: number, labels: [string, string, string, string]) {
  if (score >= 65) return labels[0];
  if (score >= 50) return labels[1];
  if (score >= 35) return labels[2];
  return labels[3];
}

function summaryChart(points: Point[], transform: (value: number) => number) {
  return points.slice(-12).map((point) => ({ label: point.date.slice(5).replace("-", "/"), value: clamp(transform(point.value)) }));
}

function buildSummary(indicators: Record<string, ReturnType<typeof makeDirectIndicator> | ReturnType<typeof makeYoyIndicator>>) {
  const corePce = indicators.corePce;
  const cpi = indicators.cpi;
  const ppi = indicators.ppi;
  const unemployment = indicators.unemployment;
  const payrolls = indicators.payrolls;
  const tenYear = indicators.tenYear;
  const oil = indicators.oil;

  const inflationScore = clamp(72 - ((((corePce.currentValue + cpi.currentValue + ppi.currentValue) / 3) - 2) * 27));
  const employmentScore = clamp(65 - ((unemployment.currentValue - 4) * 22) + ((payrolls.currentValue - 150) * 0.08));
  const rateScore = clamp(72 - ((tenYear.currentValue - 3.5) * 28));
  const oilScore = clamp(70 - ((oil.currentValue - 70) * 1.2) - (Math.abs(oil.currentValue - oil.previousValue) * 1.5));
  const overallScore = clamp((inflationScore * 0.3) + (employmentScore * 0.3) + (rateScore * 0.25) + (oilScore * 0.15));

  return [
    { label: "종합", value: scoreLabel(overallScore, ["양호", "중립", "주의", "위험"]), score: overallScore, note: `물가 ${formatNumber((corePce.currentValue + cpi.currentValue) / 2)}% · 고용 ${formatNumber(unemployment.currentValue)}%`, data: corePce.chart.map((point) => ({ ...point, value: clamp((point.value + 10) * 4) })) },
    { label: "물가", value: scoreLabel(inflationScore, ["안정", "중립", "주의", "부담"]), score: inflationScore, note: `Core PCE ${formatPercent(corePce.currentValue)} · CPI ${formatPercent(cpi.currentValue)}`, data: corePce.chart.map((point) => ({ ...point, value: clamp(72 - ((point.value - 2) * 27)) })) },
    { label: "고용", value: scoreLabel(employmentScore, ["견조", "중립", "둔화", "위험"]), score: employmentScore, note: `실업률 ${formatPercent(unemployment.currentValue)} · 비농업 ${formatPayrolls(payrolls.currentValue)}`, data: unemployment.chart.map((point) => ({ ...point, value: clamp(65 - ((point.value - 4) * 22)) })) },
    { label: "금리", value: scoreLabel(rateScore, ["우호", "중립", "주의", "부담"]), score: rateScore, note: `미국 10년물 ${formatPercent(tenYear.currentValue)}`, data: tenYear.chart.map((point) => ({ ...point, value: clamp(72 - ((point.value - 3.5) * 28)) })) },
    { label: "유가", value: scoreLabel(oilScore, ["안정", "중립", "변동", "주의"]), score: oilScore, note: `WTI ${formatNumber(oil.currentValue)}달러 · 최근 거래일 기준`, data: oil.chart.map((point) => ({ ...point, value: clamp(70 - ((point.value - 70) * 1.2)) })) },
  ];
}

export async function GET() {
  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];
  const indicators: Record<string, LiveIndicator & { currentValue: number; previousValue: number }> = {};

  const started = Date.now();
  const bindings = env as { BLS_API_KEY?: string; BLS_REGISTRATION_KEY?: string };
  const key = bindings.BLS_API_KEY?.trim() || bindings.BLS_REGISTRATION_KEY?.trim();
  const [blsResult, fredResults] = await Promise.all([
    fetchBls({ key }),
    Promise.all(Object.entries(FRED_SERIES).map(async ([name, id]) => ({ name, id, ...await fetchFred(id) }))),
  ]);
  const bls = blsResult.data;
  if (blsResult.status !== "SUCCESS") warnings.push("BLS");
  const fred = new Map<string, Point[]>(fredResults.filter(r => r.status === "SUCCESS").map(r => [r.name, r.data]));
  if (fredResults.some(r => r.status !== "SUCCESS")) warnings.push("FRED");
  console.info("MARKET_DATA_PROVIDERS", JSON.stringify({
    durationMs: Date.now()-started,
    bls: { status: blsResult.status, series: blsResult.statuses, durationMs: blsResult.durationMs, requestCount: blsResult.requestCount, keyPresent: blsResult.registered },
    fred: fredResults.map(r => ({ series:r.id, status:r.status, durationMs:r.durationMs, timings:r.timings })),
  }));

  const create = (id: string, value: LiveIndicator & { currentValue: number; previousValue: number } | null) => {
    if (value) indicators[id] = value;
  };

  if (bls) {
    try { create("cpi", makeYoyIndicator(bls.get(BLS_SERIES.cpi) ?? [], { source: "BLS Public Data API", sourceUrl: BLS_SOURCE_URL, lowerIsBetter: true })); } catch { warnings.push("CPI"); }
    try { create("ppi", makeYoyIndicator(bls.get(BLS_SERIES.ppi) ?? [], { source: "BLS Public Data API", sourceUrl: BLS_SOURCE_URL, lowerIsBetter: true })); } catch { warnings.push("PPI"); }
    try { create("unemployment", makeDirectIndicator(bls.get(BLS_SERIES.unemployment) ?? [], { source: "BLS Public Data API", sourceUrl: BLS_SOURCE_URL, suffix: "%", digits: 1, lowerIsBetter: true })); } catch { warnings.push("실업률"); }
    try { create("payrolls", makeDirectIndicator(payrollChanges(bls.get(BLS_SERIES.payrolls) ?? []), { source: "BLS Public Data API", sourceUrl: BLS_SOURCE_URL, suffix: "천 명", digits: 1, lowerIsBetter: false, signed: true })); } catch { warnings.push("비농업 고용"); }
  }

  try { create("corePce", makeYoyIndicator(fred.get("corePce") ?? [], { source: "FRED 공개 데이터 피드", sourceUrl: FRED_SOURCE_URL, lowerIsBetter: true })); } catch { warnings.push("Core PCE"); }
  try { create("tenYear", makeDirectIndicator(fred.get("tenYear") ?? [], { source: "FRED 공개 데이터 피드", sourceUrl: FRED_SOURCE_URL, suffix: "%", digits: 2, lowerIsBetter: true })); } catch { warnings.push("10년물"); }
  try { create("oil", makeDirectIndicator(fred.get("oil") ?? [], { source: "FRED 공개 데이터 피드", sourceUrl: FRED_SOURCE_URL, suffix: "달러", digits: 2, lowerIsBetter: true })); } catch { warnings.push("WTI"); }

  const required = ["corePce", "cpi", "ppi", "unemployment", "payrolls", "tenYear", "oil"];
  const liveCount = required.filter((id) => indicators[id]).length;
  const status = liveCount === required.length ? "live" : liveCount > 0 ? "partial" : "fallback";
  const summary = liveCount === required.length ? buildSummary(indicators) : [];

  return Response.json({
    status,
    updatedAt: fetchedAt,
    indicators,
    summary,
    sources: [
      { name: "BLS Public Data API", url: BLS_SOURCE_URL },
      { name: "FRED", url: FRED_SOURCE_URL },
    ],
    warnings: [...new Set(warnings)],
  }, {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
