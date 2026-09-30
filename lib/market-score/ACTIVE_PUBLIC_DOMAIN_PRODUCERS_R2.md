# ZGMINI Public Domain Producers — Revision 2 ACTIVE

Approved: 2026-10-01

This revision supersedes Revision 1 for active public-domain producer wiring while preserving CM-R1 domain weights. Revision 1 remains preserved.

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

## K1 Commodities — ACTIVE

```
CommoditiesScore =
    0.50 * oilScore
  + 0.25 * gasolineScore
  + 0.25 * copperScore
```

Policy:
- all three scores are required;
- missing component => PARTIAL / null;
- no missing-weight renormalization;
- supplyShockSafety is not a substitute.

Copper provenance:
- World Bank Pink Sheet
- CMO-Historical-Data-Monthly.xlsx
- Monthly Prices
- Copper column BM
- $/mt

Existing producer semantics reused:
- inverse trailing percentile
- lookback 240 months
- minValid 60

Previous proposal/evidence revisions remain preserved.
