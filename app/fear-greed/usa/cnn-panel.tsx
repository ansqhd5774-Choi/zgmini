"use client";

import { useMemo, useState } from "react";
import { DEFAULT_MARKET_PERIOD, getMarketPeriodConfig, type MarketPeriod } from "../../market-card-shared";
import { MarketPeriodControls } from "../../market-period-controls";
import { FearGreedCardShell } from "../../fear-greed-card-shell";
import { MarketCardInsight } from "../../market-card-insight";
import { MarketFearGreedChart } from "../../market-fear-greed-chart";
import {fearGreedStateColor} from '../../../lib/fear-greed-state-color.mjs';

import {useStoredIndex} from '../../../components/use-stored-index';
import FactorAnalysisR2,{type FactorR2} from '../factor-analysis-r2';

type HistoryPoint = {
  date?: string;
  timestamp?: string;
  score?: number;
  value?: number;
  rating?: string;
};

type CnnComponent = {
  id: string;
  score: number;
  rating: string;
  observedAt: string;
  rawValue: number;
  rawObservedAt: string;
  referenceValue?: number;
  referenceObservedAt?: string;
};

type IndexPayload = {
  status?: string;
  score?: number | null;
  rating?: string;
  observedAt?: string;
  history?: HistoryPoint[];
  components?: CnnComponent[];
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



const componentDefinitions = [
  {
    id: "market-momentum",
    title: "시장 모멘텀",
    question: "S&P 500은 장기 추세보다 강한가?",
    metricLabel: "S&P 500",
    referenceLabel: "125일 이동평균",
    meaning: "S&P 500 지수를 125거래일 이동평균과 비교해 시장의 큰 추세를 확인합니다.",
    fearDirection: "125일 평균 아래",
    greedDirection: "125일 평균 위",
  },
  {
    id: "stock-price-strength",
    title: "주가 강도",
    question: "신고가 종목이 신저가 종목보다 강한가?",
    metricLabel: "52주 신고가·신저가 강도",
    referenceLabel: null,
    meaning: "NYSE에서 52주 신고가와 신저가의 힘을 비교해 시장 내부의 강도를 봅니다.",
    fearDirection: "신저가 우세",
    greedDirection: "신고가 우세",
  },
  {
    id: "stock-price-breadth",
    title: "시장 폭",
    question: "상승 거래량이 시장 전체로 퍼지고 있는가?",
    metricLabel: "McClellan Volume Summation",
    referenceLabel: null,
    meaning: "상승 종목과 하락 종목의 거래량 차이를 누적해 상승 참여가 넓은지 확인합니다.",
    fearDirection: "하락 거래량 우세",
    greedDirection: "상승 거래량 우세",
  },
  {
    id: "put-call-options",
    title: "풋/콜 옵션",
    question: "옵션 투자자는 하락을 얼마나 경계하는가?",
    metricLabel: "Put / Call 비율",
    referenceLabel: null,
    meaning: "최근 옵션 시장에서 풋과 콜 수요의 균형을 봅니다. 풋 비중이 커질수록 방어 심리가 강해집니다.",
    fearDirection: "비율 상승",
    greedDirection: "비율 하락",
  },
  {
    id: "market-volatility",
    title: "시장 변동성",
    question: "예상 변동성은 평소보다 높은가?",
    metricLabel: "VIX",
    referenceLabel: "VIX 50일 평균",
    meaning: "S&P 500 옵션에 반영된 예상 변동성인 VIX를 50일 평균과 비교합니다.",
    fearDirection: "VIX가 평균보다 높음",
    greedDirection: "VIX가 평균보다 낮음",
  },
  {
    id: "junk-bond-demand",
    title: "정크본드 수요",
    question: "투자자는 낮은 신용등급의 위험까지 감수하는가?",
    metricLabel: "고위험-투자등급 스프레드",
    referenceLabel: null,
    meaning: "고위험 회사채와 투자등급 회사채의 금리 차이로 신용위험에 대한 보상 요구를 확인합니다.",
    fearDirection: "스프레드 확대",
    greedDirection: "스프레드 축소",
  },
  {
    id: "safe-haven-demand",
    title: "안전자산 수요",
    question: "주식과 국채 중 어느 쪽이 더 강한가?",
    metricLabel: "20일 주식-국채 수익률 차",
    referenceLabel: null,
    meaning: "최근 20거래일 주식과 미국 국채의 수익률 차이로 위험자산 선호를 확인합니다.",
    fearDirection: "국채 상대우위",
    greedDirection: "주식 상대우위",
  },
] as const;

const scoreGuide = [
  { range: "0–<25", label: "극심한 공포" },
  { range: "25–<45", label: "공포" },
  { range: "45–55", label: "중립" },
  { range: ">55–75", label: "탐욕" },
  { range: ">75–100", label: "극심한 탐욕" },
] as const;

function componentValue(id: string, value: number) {
  if (id === "market-momentum") return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (id === "stock-price-breadth") return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (id === "market-volatility") return value.toFixed(2);
  if (id === "put-call-options" || id === "stock-price-strength") return value.toFixed(3);
  if (id === "junk-bond-demand" || id === "safe-haven-demand") return `${value.toFixed(3)}%p`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

function signedPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function rawValueReading(
  id: string,
  component: CnnComponent | undefined,
  referenceGap: number | null,
) {
  if (!component) return "검증 가능한 저장 원시값이 없습니다.";

  if (id === "market-momentum" && referenceGap !== null) {
    if (referenceGap > 0) return `S&P 500이 125일 이동평균보다 ${Math.abs(referenceGap).toFixed(2)}% 위입니다. 원시 추세는 상승 모멘텀 방향입니다.`;
    if (referenceGap < 0) return `S&P 500이 125일 이동평균보다 ${Math.abs(referenceGap).toFixed(2)}% 아래입니다. 원시 추세는 약화 방향입니다.`;
    return "S&P 500이 125일 이동평균과 같은 수준입니다.";
  }

  if (id === "stock-price-strength") {
    if (component.rawValue > 0) return "원시값이 양수여서 신고가 우위 방향입니다. CNN 등급은 이 값의 최근 상대 위치까지 함께 반영합니다.";
    if (component.rawValue < 0) return "원시값이 음수여서 신저가 우위 방향입니다. CNN 등급은 이 값의 최근 상대 위치까지 함께 반영합니다.";
    return "신고가와 신저가 강도가 균형에 가까운 원시값입니다.";
  }

  if (id === "stock-price-breadth") {
    if (component.rawValue < 0) return `McClellan Summation Index가 ${component.rawValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}로 음수입니다. CNN 설명상 낮거나 음수인 값은 약세 신호입니다. 최종 공포·탐욕 강도는 최근 상대 범위와 CNN 환산점수를 함께 봅니다.`;
    return `McClellan Summation Index는 ${component.rawValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}입니다. 양수라는 이유만으로 탐욕으로 단정하지 않고 최근 상대 범위와 CNN 환산점수를 함께 봅니다.`;
  }

  if (id === "put-call-options") {
    const ratio = component.rawValue.toFixed(3);
    if (component.rawValue > 1) return `현재 Put/Call 비율은 ${ratio}입니다. CNN 설명상 1.0 초과는 bearish 신호로 봅니다. 최종 공포·탐욕 강도는 최근 상대 범위까지 반영한 CNN 환산점수와 함께 확인합니다.`;
    return `현재 Put/Call 비율은 ${ratio}입니다. 1.0 아래에서는 콜이 풋보다 상대적으로 많지만, 이것만으로 탐욕을 확정하지 않고 최근 상대 범위와 CNN 환산점수를 함께 확인합니다.`;
  }

  if (id === "market-volatility" && referenceGap !== null) {
    const direction = referenceGap > 0 ? "높아" : referenceGap < 0 ? "낮아" : "같아";
    return `VIX가 50일 평균보다 ${Math.abs(referenceGap).toFixed(2)}% ${direction} 최근 평균 대비 예상 변동성을 보여줍니다. VIX는 주가 상승·하락 방향을 예측하는 지표가 아닙니다.`;
  }

  if (id === "junk-bond-demand") {
    return `고위험채와 투자등급채의 스프레드는 ${component.rawValue.toFixed(3)}%p입니다. 스프레드가 좁을수록 위험 선호, 넓을수록 공포 방향입니다.`;
  }

  if (id === "safe-haven-demand") {
    if (component.rawValue > 0) return `최근 20거래일 주식이 국채보다 ${component.rawValue.toFixed(3)}%p 더 강했습니다. 다만 플러스라고 자동으로 탐욕은 아니며, 최근 상대 범위에서 약하면 CNN은 공포로 분류할 수 있습니다.`;
    if (component.rawValue < 0) return `최근 20거래일 국채가 주식보다 ${Math.abs(component.rawValue).toFixed(3)}%p 더 강했습니다. 안전자산 선호가 커진 방향입니다.`;
    return "최근 20거래일 주식과 국채 수익률 차이가 거의 없습니다.";
  }

  return "원시값은 해당 지표 고유 단위로 읽고, CNN 환산점수와 함께 해석합니다.";
}

function normalizedReading(component: CnnComponent | undefined) {
  if (!component) return "검증 가능한 CNN 환산점수가 없습니다.";
  return `${component.score.toFixed(1)} / 100 · ${component.rating}. 원시값의 절대 수준과 별개로 CNN이 이 지표의 상대적인 공포·탐욕 강도를 0~100으로 환산한 값입니다.`;
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

export default function CnnPanel({ showEducation = false }: { showEducation?: boolean }) {
  const {payload,loading}=useStoredIndex<IndexPayload>("/api/fear-greed");
  const [selectedPeriod, setSelectedPeriod] = useState<MarketPeriod>(DEFAULT_MARKET_PERIOD);




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

  const componentMap = new Map((payload?.components ?? []).map((component) => [component.id, component]));
  const verifiedComponentCount = componentDefinitions.filter((item) => componentMap.has(item.id)).length;
  const componentScores = componentDefinitions.flatMap((item) => {
    const component = componentMap.get(item.id);
    return component ? [component.score] : [];
  });
  const componentScoreSum = componentScores.length === componentDefinitions.length
    ? componentScores.reduce((sum, value) => sum + value, 0)
    : null;
  const componentScoreAverage = componentScoreSum === null
    ? null
    : componentScoreSum / componentDefinitions.length;

  // R2 reuses the already-fetched CNN payload; no new API request or scoring rule.
  const factorRows:FactorR2[]=componentDefinitions.map(definition=>{
    const component=componentMap.get(definition.id);
    const hasScore=component&&Number.isFinite(component.score)&&component.score>=0&&component.score<=100;
    const hasRaw=component&&Number.isFinite(component.rawValue);
    return {id:definition.id,name:definition.title,metric:definition.metricLabel,
      score:hasScore?component.score:null,
      raw:hasRaw?componentValue(definition.id,component.rawValue):null,
      reference:definition.referenceLabel&&component&&Number.isFinite(component.referenceValue)
        ?`${definition.referenceLabel}: ${componentValue(definition.id,component.referenceValue!)}`:null,
      state:hasScore?component.rating:"미확인",
      observedAt:component?.rawObservedAt??null,
      meaning:definition.meaning,
      direction:`공포 방향: ${definition.fearDirection} · 탐욕 방향: ${definition.greedDirection}`,
    };
  });

  return <>
    <FearGreedCardShell
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
      score={{arrowId:"usa",
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
        showExtrema
        color={fearGreedStateColor(loading?'확인 중':stage)}
        data={history}
        axisTicks={chartAxis.ticks}
        axisLabels={chartAxis.labels}
        latestPoint={latestHistoryPoint}
        instanceKey={selectedPeriod}
        gradientId="cnn-fill"
        formatTooltipLabel={dateLabel}
      />}
      detailHref={showEducation ? undefined : "/fear-greed/usa/"}
      footer={{
        href: "https://www.cnn.com/markets/fear-and-greed",
        label: "자세히",
        ariaLabel: "CNN Fear & Greed 원본 페이지 열기",
        children: <a href="https://www.cnn.com/markets/fear-and-greed" aria-label="CNN Fear & Greed 출처 열기" style={{color:"inherit",textDecoration:"none"}}>데이터 출처</a>,
      }}
    />

    {showEducation ? <FactorAnalysisR2 market="usa" factors={factorRows} source="CNN Business"
      observedAt={payload?.observedAt} sourceNote="원시값과 환산점수의 기준·갱신 시각이 다를 수 있습니다. 확인되지 않은 값은 0으로 대체하지 않습니다."/> : null}
    {showEducation ? <section className="cnn-education-panel" aria-labelledby="cnn-education-title">
      <header className="cnn-education-header">
        <div>
          <p className="cnn-eyebrow">LEARN THE 7 COMPONENTS</p>
          <h2 id="cnn-education-title">공포·탐욕지수를 숫자로 이해하기</h2>
          <p>종합점수만 보지 않고, 어떤 시장 데이터가 공포와 탐욕을 만들었는지 7개 구성요소로 확인합니다.</p>
        </div>
        <div className="cnn-education-status" aria-label="검증된 구성요소 수">
          <strong>{loading ? "—" : `${verifiedComponentCount}/7`}</strong>
          <span>현재 확인된 구성요소</span>
        </div>
      </header>

      <div className="cnn-method-strip">
        <div><strong>원시값</strong><span>실제 시장에서 관측된 숫자</span></div>
        <b aria-hidden="true">→</b>
        <div><strong>기준과 비교</strong><span>평균·상대 강도·정상 변동폭 확인</span></div>
        <b aria-hidden="true">→</b>
        <div><strong>0~100 정규화</strong><span>낮을수록 공포 · 높을수록 탐욕</span></div>
      </div>

      <div className="cnn-composite-formula" aria-label="CNN 공포탐욕 구성점수 평균과 현재 종합점수 비교">
        <div>
          <span>7개 구성점수 합</span>
          <strong>{componentScoreSum === null ? "—" : componentScoreSum.toFixed(1)}</strong>
        </div>
        <b aria-hidden="true">÷ 7</b>
        <div>
          <span>구성요소 단순평균</span>
          <strong>{componentScoreAverage === null ? "—" : componentScoreAverage.toFixed(1)}</strong>
        </div>
        <b aria-hidden="true">↔</b>
        <div className="is-total">
          <span>CNN 현재 종합점수</span>
          <strong>{score === null ? "—" : score.toFixed(1)}</strong>
        </div>
      </div>
      <p className="cnn-composite-caption">
        7개 구성요소는 동일 비중으로 반영됩니다. 다만 각 구성요소와 CNN 종합점수의 갱신 시각이 서로 다를 수 있어, 화면에 보이는 7개 현재값의 단순평균과 종합점수가 소수점 단위에서 다를 수 있습니다. 이 페이지의 현재 종합점수는 CNN이 제공한 종합값을 우선 표시합니다.
      </p>

      <p className="cnn-scale-note"><strong>중요:</strong> 원시값의 방향과 CNN 환산점수는 같은 척도가 아닙니다. 예를 들어 주식이 채권보다 강하거나 S&P 500이 이동평균 위에 있어도, 최근 상대 범위에서 약하면 CNN 점수는 공포로 나올 수 있습니다.</p>

      <div className="cnn-score-guide" aria-label="CNN 공포탐욕 점수 해석 구간">
        {scoreGuide.map((item) => <span key={item.range}><b>{item.range}</b><small>{item.label}</small></span>)}
      </div>

      <section className="cnn-component-overview" aria-labelledby="cnn-component-overview-title">
        <div className="cnn-component-overview-head">
          <div>
            <p className="cnn-eyebrow">CURRENT COMPONENT SNAPSHOT</p>
            <h2 id="cnn-component-overview-title">7개 구성요소 한눈에 보기</h2>
          </div>
          <span>원시값 → CNN 환산점수 → 상태 순서로 읽으세요.</span>
        </div>
        <div className="cnn-component-overview-list" role="list">
          {componentDefinitions.map((definition, index) => {
            const component = componentMap.get(definition.id);
            const overviewTone = component?.rating.includes("공포")
              ? "fear"
              : component?.rating.includes("탐욕")
                ? "greed"
                : "neutral";
            return <div className="cnn-component-overview-row" data-tone={overviewTone} role="listitem" key={definition.id}>
              <div className="cnn-component-overview-name">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{definition.title}</strong>
              </div>
              <div className="cnn-component-overview-value">
                <small>현재 원시값</small>
                <strong>{component ? componentValue(definition.id, component.rawValue) : "—"}</strong>
              </div>
              <div className="cnn-component-overview-score">
                <small>CNN 점수</small>
                <strong>{component ? component.score.toFixed(1) : "—"}</strong>
              </div>
              <div className="cnn-component-overview-rating">
                <small>현재 상태</small>
                <strong>{component?.rating ?? "확인 필요"}</strong>
              </div>
            </div>;
          })}
        </div>
      </section>

      <div className="cnn-component-education-grid">
        {componentDefinitions.map((definition, index) => {
          const component = componentMap.get(definition.id);
          const referenceGap = component?.referenceValue && component.referenceValue !== 0
            ? ((component.rawValue / component.referenceValue) - 1) * 100
            : null;
          const tone = component?.rating.includes("공포")
            ? "fear"
            : component?.rating.includes("탐욕")
              ? "greed"
              : "neutral";

          return <article className="cnn-education-card" key={definition.id} data-tone={tone} data-layout={index === componentDefinitions.length - 1 ? "wide" : "standard"}>
            <div className="cnn-education-card-head">
              <span className="cnn-component-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{definition.title}</h2>
                <p>{definition.question}</p>
              </div>
              <span className="cnn-component-rating">{component?.rating ?? "확인 필요"}</span>
            </div>

            <p className="cnn-component-meaning">{definition.meaning}</p>

            <div className="cnn-component-metrics">
              <div>
                <span>{definition.metricLabel}</span>
                <strong>{component ? componentValue(definition.id, component.rawValue) : "—"}</strong>
              </div>
              {definition.referenceLabel ? <div>
                <span>{definition.referenceLabel}</span>
                <strong>{component?.referenceValue !== undefined ? componentValue(definition.id, component.referenceValue) : "—"}</strong>
              </div> : null}
              {definition.referenceLabel ? <div>
                <span>기준 대비</span>
                <strong>{referenceGap === null ? "—" : signedPercent(referenceGap)}</strong>
              </div> : null}
              <div className="cnn-component-score">
                <span>CNN 정규화 점수</span>
                <strong>{component ? `${component.score.toFixed(1)} / 100` : "—"}</strong>
              </div>
            </div>

            <div className="cnn-component-scorebar" aria-label={component ? `${definition.title} CNN 정규화 점수 ${component.score.toFixed(1)}점` : `${definition.title} 점수 확인 필요`}>
              <div className="cnn-component-scorebar-track">
                {component ? <i style={{ left: `${component.score}%` }} aria-hidden="true"/> : null}
              </div>
              <div className="cnn-component-scorebar-ticks" aria-hidden="true">
                <span>0</span><span>25</span><span>45</span><span>55</span><span>75</span><span>100</span>
              </div>
            </div>

            <div className="cnn-component-direction" aria-label={`${definition.title} 해석 방향`}>
              <span><b>공포 방향</b>{definition.fearDirection}</span>
              <span><b>탐욕 방향</b>{definition.greedDirection}</span>
            </div>

            <div className="cnn-component-reading-grid">
              <div className="cnn-component-reading is-raw">
                <strong>원시값 해석</strong>
                <p>{rawValueReading(definition.id, component, referenceGap)}</p>
              </div>
              <div className="cnn-component-reading is-score">
                <strong>CNN 환산점수</strong>
                <p>{normalizedReading(component)}</p>
                <small>{component ? `원시값 기준일 ${dateLabel(component.rawObservedAt)}` : "임의 수치로 대체하지 않습니다."}</small>
              </div>
            </div>
          </article>;
        })}
      </div>

      <aside className="cnn-education-note">
        <strong>숫자를 읽는 핵심</strong>
        <p>원시값의 절대 숫자만으로 매수·매도를 판단하지 않습니다. 각 구성요소가 자신의 기준에서 얼마나 벗어났는지를 정규화한 CNN 점수와 함께 읽습니다.</p>
      </aside>

      <a className="cnn-return-cta" href="/">← 메인 대시보드로 돌아가기</a>
    </section> : null}
  </>;
}
