"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_MARKET_PERIOD, getMarketPeriodConfig, type MarketPeriod } from "../../market-card-shared";
import { MarketPeriodControls } from "../../market-period-controls";
import { FearGreedCardShell } from "../../fear-greed-card-shell";
import { MarketCardInsight } from "../../market-card-insight";
import { MarketFearGreedChart } from "../../market-fear-greed-chart";

type HistoryPoint = {
  date?: string;
  timestamp?: string;
  score?: number;
  value?: number;
  rating?: string;
};

type IndexPayload = {
  status?: string;
  score?: number | null;
  rating?: string;
  observedAt?: string;
  history?: HistoryPoint[];
};

const label = (rating = "") => rating || "확인 불가";
const dateLabel = (value?: string) => value
  ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(value))
  : "—";

function chartDateParts(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const monthText = parts.find((part) => part.type === "month")?.value;
  const dayText = parts.find((part) => part.type === "day")?.value;

  if (!year || !monthText || !dayText) return null;
  return {
    year,
    month: Number(monthText),
    monthText,
    dayText,
  };
}

function samplePoints<T>(points: T[], count: number) {
  if (points.length <= count) return points;
  if (count <= 1) return [points[points.length - 1]];

  const selected: T[] = [];
  const seen = new Set<number>();

  for (let index = 0; index < count; index += 1) {
    const pointIndex = Math.round((index * (points.length - 1)) / (count - 1));
    if (seen.has(pointIndex)) continue;
    seen.add(pointIndex);
    selected.push(points[pointIndex]);
  }

  return selected;
}

function buildChartAxisTicks(
  points: ReturnType<typeof normalizeHistory>,
  period: MarketPeriod,
) {
  const labels = new Map<string, string>();
  if (points.length === 0) return { ticks: [] as string[], labels };

  const add = (point: (typeof points)[number], label: string) => {
    labels.set(point.date, label);
  };

  if (period === "1W" || period === "1M") {
    const count = period === "1W" ? 4 : 5;
    for (const point of samplePoints(points, count)) {
      const parts = chartDateParts(point.date);
      if (parts) add(point, `${parts.monthText}.${parts.dayText}`);
    }
    return { ticks: [...labels.keys()], labels };
  }

  const monthGroups = new Map<string, {
    year: number;
    month: number;
    monthText: string;
    point: (typeof points)[number];
  }>();

  for (const point of points) {
    const parts = chartDateParts(point.date);
    if (!parts) continue;
    const key = `${parts.year}-${parts.monthText}`;
    if (!monthGroups.has(key)) {
      monthGroups.set(key, {
        year: parts.year,
        month: parts.month,
        monthText: parts.monthText,
        point,
      });
    }
  }

  const groups = [...monthGroups.values()];

  if (period === "3M") {
    for (const group of groups) {
      add(group.point, group.monthText);
    }
    return { ticks: [...labels.keys()], labels };
  }

  if (period === "6M") {
    for (const group of groups.slice(-6)) {
      add(group.point, group.monthText);
    }
    return { ticks: [...labels.keys()], labels };
  }

  // 1Y: keep labels sparse. Months are enough; only the previous year's
  // December carries a year marker so the year transition is obvious once.
  const selectedIndexes = new Set<number>();
  selectedIndexes.add(0);
  for (let index = 2; index < groups.length - 1; index += 2) {
    selectedIndexes.add(index);
  }
  selectedIndexes.add(groups.length - 1);

  const latestYear = groups.at(-1)?.year;
  groups.forEach((group, index) => {
    if (group.month === 12 && latestYear && group.year < latestYear) {
      selectedIndexes.add(index);
    }
  });

  [...selectedIndexes]
    .sort((a, b) => a - b)
    .forEach((index) => {
      const group = groups[index];
      if (!group) return;
      const label =
        group.month === 12 && latestYear && group.year < latestYear
          ? `${String(group.year).slice(-2)}.12`
          : group.monthText;
      add(group.point, label);
    });

  return { ticks: [...labels.keys()], labels };
}

function normalizeHistory(history: HistoryPoint[] = []) {
  return history.flatMap((point) => {
    const date = point.date ?? point.timestamp;
    const score = typeof point.score === "number" ? point.score : point.value;
    if (!date || typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) return [];
    const time = Date.parse(date);
    return Number.isFinite(time) ? [{ date, time, score }] : [];
  }).sort((a, b) => a.time - b.time);
}


const periodComparisonLabels: Record<MarketPeriod, string> = {
  "1W": "1주 대비",
  "1M": "1개월 대비",
  "3M": "3개월 대비",
  "6M": "6개월 대비",
  "1Y": "1년 대비",
};

function subtractCalendarMonths(value: string | undefined, months: number) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.getTime();
}

function historicalBaseline(points: ReturnType<typeof normalizeHistory>, targetTime: number | null) {
  if (targetTime === null) return null;
  let candidate: number | null = null;
  for (const point of points) {
    if (point.time > targetTime) break;
    candidate = point.score;
  }
  return candidate;
}

function previousHistoryBaseline(
  points: ReturnType<typeof normalizeHistory>,
  observedAt: string | undefined,
) {
  if (!observedAt) return null;
  const observedTime = Date.parse(observedAt);
  if (!Number.isFinite(observedTime)) return null;

  let candidate: number | null = null;
  for (const point of points) {
    if (point.time >= observedTime) break;
    candidate = point.score;
  }
  return candidate;
}

function subtractCalendarDays(value: string | undefined, days: number) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() - days);
  return date.getTime();
}


function buildMarketInsight({
  stage,
  score,
  dayDelta,
  periodDelta,
  periodLabel,
  loading,
}: {
  stage: string;
  score: number | null;
  dayDelta: number | null;
  periodDelta: number | null;
  periodLabel: string;
  loading: boolean;
}) {
  if (loading) return "시장 심리 데이터를 확인하고 있습니다.";
  if (score === null) return "시장 심리 원본을 확인할 수 없습니다.";

  const periodName = periodLabel.replace(" 대비", "");
  const dayDown = dayDelta !== null && dayDelta < -0.05;
  const dayUp = dayDelta !== null && dayDelta > 0.05;
  const periodDown = periodDelta !== null && periodDelta < -0.05;
  const periodUp = periodDelta !== null && periodDelta > 0.05;

  if (dayDown && periodDown) {
    return `${stage} 구간이 이어지고 있으며 단기와 ${periodName} 기준 심리가 모두 약화되고 있습니다.`;
  }
  if (dayUp && periodUp) {
    return `${stage} 구간이지만 단기와 ${periodName} 기준 심리는 함께 회복되고 있습니다.`;
  }
  if (dayUp && periodDown) {
    return `${stage} 구간입니다. 단기 심리는 반등했지만 ${periodName} 기준 흐름은 아직 약세입니다.`;
  }
  if (dayDown && periodUp) {
    return `${stage} 구간입니다. 단기는 약화됐지만 ${periodName} 기준 흐름은 개선된 상태입니다.`;
  }
  if (dayDown) return `${stage} 구간에서 단기 심리가 약화되고 있습니다.`;
  if (dayUp) return `${stage} 구간에서 단기 심리가 회복되고 있습니다.`;
  if (periodDown) return `${stage} 구간이며 ${periodName} 기준 심리는 약화된 상태입니다.`;
  if (periodUp) return `${stage} 구간이며 ${periodName} 기준 심리는 개선된 상태입니다.`;

  return `${stage} 구간에서 뚜렷한 방향 변화는 확인되지 않습니다.`;
}

export default function CnnPanel() {
  const [payload, setPayload] = useState<IndexPayload | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<MarketPeriod>(DEFAULT_MARKET_PERIOD);
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
  const allHistory = useMemo(() => normalizeHistory(payload?.history), [payload?.history]);
  const history = useMemo(() => {
    const selected = getMarketPeriodConfig(selectedPeriod);
    const end = allHistory.at(-1)?.time;
    return end ? allHistory.filter((point) => point.time >= end - selected.days * 86400000) : allHistory;
  }, [allHistory, selectedPeriod]);

  const dayBaseline = useMemo(
    () => previousHistoryBaseline(allHistory, payload?.observedAt),
    [allHistory, payload?.observedAt],
  );
  const periodBaseline = useMemo(() => {
    const targetTime =
      selectedPeriod === "1W"
        ? subtractCalendarDays(payload?.observedAt, 7)
        : selectedPeriod === "1M"
          ? subtractCalendarMonths(payload?.observedAt, 1)
          : selectedPeriod === "3M"
            ? subtractCalendarMonths(payload?.observedAt, 3)
            : selectedPeriod === "6M"
              ? subtractCalendarMonths(payload?.observedAt, 6)
              : subtractCalendarMonths(payload?.observedAt, 12);

    return historicalBaseline(allHistory, targetTime);
  }, [allHistory, payload?.observedAt, selectedPeriod]);

  // U11 Data Honesty:
  // every displayed change is derived from verified history only.
  // If the required historical baseline does not exist, render no fabricated delta.
  const dayDelta = score !== null && dayBaseline !== null ? score - dayBaseline : null;
  const periodDelta = score !== null && periodBaseline !== null ? score - periodBaseline : null;
  const latestHistoryPoint = history.at(-1) ?? null;
  const chartAxis = useMemo(
    () => buildChartAxisTicks(history, selectedPeriod),
    [history, selectedPeriod],
  );

  const stage = label(payload?.rating);
  const status = payload?.status === "verified" && score !== null ? "검증된 CNN 원본" : "원본 확인 필요";
  const currentPeriodLabel = periodComparisonLabels[selectedPeriod];
  // U11 Data Honesty: interpretation is always derived from the verified
  // score/rating and history-derived changes. No upstream/sample insight text is trusted.
  const marketInsight = buildMarketInsight({
    stage,
    score,
    dayDelta,
    periodDelta,
    periodLabel: currentPeriodLabel,
    loading,
  });

  return <FearGreedCardShell
    className="usa-target-card"
    layoutVariant="shared"
    testId="cnn-reference-panel"
    marketState={loading ? "loading" : score === null ? "unavailable" : history.length > 1 ? "ready" : "empty"}
    busy={loading}
    header={{
      flag: "/flags/us.svg",
      eyebrow: "CNN FEAR & GREED INDEX",
      title: "미국 시장",
      description: "S&P 500 · NASDAQ",
      dateLabel: "데이터 기준일",
      date: dateLabel(payload?.observedAt),
      source: loading ? "확인 중" : status,
      rightContent: <MarketCardInsight text={marketInsight}/>,
    }}
    score={{
      value: loading || score === null ? "—" : score.toFixed(1),
      state: loading ? "확인 중" : stage,
      caption: "",
      variant: "hero",
      dayDelta,
      periodDelta,
      periodLabel: currentPeriodLabel,
      metaDate: dateLabel(payload?.observedAt),
    }}
    period={<MarketPeriodControls
      activeKey={selectedPeriod}
      onChange={setSelectedPeriod}
      ariaLabel="CNN 지수 기간 선택"
    />}
    chart={<MarketFearGreedChart
      data={history}
      axisTicks={chartAxis.ticks}
      axisLabels={chartAxis.labels}
      latestPoint={latestHistoryPoint}
      instanceKey={selectedPeriod}
      gradientId="cnn-fill"
      formatTooltipLabel={dateLabel}
    />}
    footer={{
      href: "/fear-greed/usa/",
      label: "자세히",
      ariaLabel: "미국 공포탐욕지수 세부 지표 보기",
      children: "원본 기준",
    }}
  />;
}
