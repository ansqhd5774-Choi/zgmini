export const marketPeriods = [
  { key: "1W", label: "1주", days: 7 },
  { key: "1M", label: "1개월", days: 31 },
  { key: "3M", label: "3개월", days: 93 },
  { key: "6M", label: "6개월", days: 186 },
  { key: "1Y", label: "1년", days: 366 },
] as const;

export type MarketPeriod = (typeof marketPeriods)[number]["key"];
export type MarketPeriodConfig = (typeof marketPeriods)[number];

export const DEFAULT_MARKET_PERIOD: MarketPeriod = "1M";
export const DEFAULT_KOREA_MARKET_PERIOD: MarketPeriod = "3M";

export function getMarketPeriodConfig(period: MarketPeriod): MarketPeriodConfig {
  return marketPeriods.find((item) => item.key === period) ?? marketPeriods[1];
}

export function getMarketPeriodDays(period: MarketPeriod): number {
  return getMarketPeriodConfig(period).days;
}

/**
 * Backward-compatible derived list for any existing non-card callers.
 * `marketPeriods` remains the single source of truth.
 */
export const marketPeriodDays = marketPeriods.map(({ days, label }) => [days, label] as const);
