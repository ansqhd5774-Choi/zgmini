# ZGMINI Public Domain Producers — Revision 4 ACTIVE

Approved: 2026-10-01

This revision supersedes Revision 3 for active public-domain producer wiring while preserving CM-R1 domain weights. Revisions 1, 2 and 3 remain preserved.

## C1 Consumption — ACTIVE

```
ConsumptionScore =
    0.50 * realPceScore
  + 0.50 * retailSalesScore
```

Policy:
- both scores are required;
- missing component => PARTIAL / null;
- no missing-weight renormalization.

## B1 Breadth — ACTIVE / R5

Storage / collection:
- existing B1-R3 D1 tables and store-only collector remain preserved;
- B1-R4 implementation remains preserved as the previous revision;
- public scoring reads stored data only; page requests never call a provider;
- public source metadata comes from stored row provenance and is not hard-coded to a provider.

Stored daily breadth base:
```
DailyBreadth =
    0.60 * AdvanceRatio
  + 0.40 * AdvanceValueShare
```

Four active B1-R5 factors:
1. AdvanceRatioScore = 100 * AdvanceRatio
2. AdvanceValueShareScore = 100 * AdvanceValueShare
3. EMA5(DailyBreadthScore)
4. EMA20(DailyBreadthScore)

Final B1-R5 score:
```
B1R5 =
    0.30 * AdvanceRatioScore
  + 0.20 * AdvanceValueShareScore
  + 0.30 * EMA5(DailyBreadthScore)
  + 0.20 * EMA20(DailyBreadthScore)
```

The R5 decomposition is algebraically equivalent to the approved R4 score, so activation does not introduce a score discontinuity. It replaces the two coverage diagnostics in the public four-detail slot with actual scoring factors.

Public four-detail IDs:
- breadth-41: 상승종목비율
- breadth-42: 상승거래대금비율
- breadth-43: 5일 수급 EMA
- breadth-44: 20일 수급 EMA

Policy:
- return coverage >= 98%;
- trading-value coverage >= 98%;
- stored universe/pair coverage >= 98%;
- maximum lag <= 2 completed market sessions;
- missing coverage or factor => PARTIAL / null;
- no missing-weight renormalization;
- EMA restarts after a missing market-session gap rather than bridging unavailable history;
- provider requests during public scoring = 0.

## K1 Commodities — ACTIVE / R2

Formula:
```
K1R2 =
    0.30 * WTI
  + 0.25 * Brent
  + 0.25 * Copper
  + 0.20 * Gasoline
```

Component scoring:
- each price series uses max(0, 1M log shock, 3M log shock);
- each shock becomes an inverse trailing percentile score;
- lookback: up to 240 monthly observations;
- minimum valid history: 60 observations.

As-of policy:
- WTI, Brent, Copper and Gasoline select their latest valid score independently;
- maximum permitted lag: 2 calendar months from the requested as-of month;
- any missing or stale component => PARTIAL / null;
- no missing-weight renormalization;
- supplyShockSafety is not a substitute for K1-R2.

Sources:
- WTI: FRED/EIA MCOILWTICO;
- Brent: FRED/EIA MCOILBRENTEU;
- Gasoline: FRED/EIA GASREGCOVM;
- Copper: World Bank Pink Sheet stored input when available.

Previous proposal/evidence revisions remain preserved.
