# ZGMINI Public Domain Producers — Revision 1 ACTIVE

Approved: 2026-09-22

This revision supplements CM-R1 without changing CM-R1 domain weights.

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

## B1 Breadth — NOT ACTIVE / UNAVAILABLE

No approved US producer + universe + PIT/coverage contract exists yet.
No proxy substitution is allowed.

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
