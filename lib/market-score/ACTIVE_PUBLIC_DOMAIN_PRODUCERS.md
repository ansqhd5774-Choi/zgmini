# ZGMINI Public Domain Producers — Revision 3 ACTIVE

Approved: 2026-10-01

This revision supersedes Revision 2 for active public-domain producer wiring while preserving CM-R1 domain weights. Revisions 1 and 2 remain preserved.

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

## B1 Breadth — ACTIVE / R4

Storage / collection:
- existing B1-R3 D1 tables and store-only collector remain preserved;
- public scoring reads stored data only; page requests never call a provider;
- public source metadata comes from stored row provenance and is not hard-coded to a provider.

Daily breadth:
```
DailyBreadth =
    0.60 * AdvanceRatio
  + 0.40 * AdvanceValueShare
```

Final B1-R4 score:
```
B1R4 =
    0.50 * DailyBreadth
  + 0.30 * EMA5(DailyBreadth)
  + 0.20 * EMA20(DailyBreadth)
```

Policy:
- return coverage >= 98%;
- trading-value coverage >= 98%;
- stored universe/pair coverage >= 98%;
- maximum lag <= 2 completed market sessions;
- missing coverage => PARTIAL / null;
- no missing-weight renormalization;
- EMA restarts after a missing market-session gap rather than bridging unavailable history.

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
