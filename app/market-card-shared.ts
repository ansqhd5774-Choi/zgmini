export const marketPeriods = [
  { key: "1w", label: "1주", days: 7 },
  { key: "1m", label: "1개월", days: 31 },
  { key: "3m", label: "3개월", days: 93 },
  { key: "6m", label: "6개월", days: 186 },
  { key: "1y", label: "1년", days: 366 },
] as const;

export const marketPeriodDays = marketPeriods.map(({ days, label }) => [days, label] as const);
