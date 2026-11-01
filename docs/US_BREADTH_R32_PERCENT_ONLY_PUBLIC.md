# US Breadth R32 — Percentage-only external presentation

## Approved user requirement

**Show only percentages for 상승 / 하락 / 보합. Do not display stock
counts.** This applies to the R2 full-market public API, 1-year chart and
eventual desktop/mobile labels. The internal MarketParquet calculations keep
counts and audit SHA solely for data integrity and independent verification.
Those are not public chart series or visible legends.

## Verified source evidence

The user-provided R31 PC logs show `stock_daily` 250 files staged only under
the isolated R2 raw data root and a separate R24 provider-byte check with
`providerAuthenticityVerified=true`. The R25 preview built 249 real adjacent
market comparisons from `2025-11-04` to `2026-10-30`. No R2 D1 publication or
Production deployment has been performed.

## Public fields

Current R2 confirmation presents only date/source/phase/method metadata and:

```json
{"risingPct":26.4,"fallingPct":67.8,"unchangedPct":5.8}
```

Percentages are computed directly from verified internal rise/fall/unchanged
counts, without changing the established R2 missing-previous-price-is-flat
classification. Public outputs never include `expectedCount`, `counts`,
`imputedUnchangedCount`, `observedComparableCount` or raw constituent prices.

The 1-year public chart point shape is only:

```json
{"date":"2026-10-30","risingPct":26.4,"fallingPct":67.8,"unchangedPct":5.8}
```

No artificial initial day is created to reach 250 points. The 249 verified
points are sufficient for an initial chart. Internal source records and the
existing R1 250-session history remain immutable.

An isolated read-only API route is prepared at
`/api/market-breadth-r2-history?market=usa` with key
`public:market-breadth-confirmed-r2:usa:history-percent:v1`. It accepts only a
separately published, properly dated, contiguous 249- or 250-point
`PUBLIC_FINAL` history record. It returns 503 until a verified R2 history
publisher has written that key; it never falls back to old R1 counts or
misrepresents an in-memory preview as a published final.

## Work and publication boundaries

1. Keep the R1 503-stock historic/public D1 keys and Alpaca IEX provisional
   keys completely isolated. The provisional 15-minute data remains its own
   product, without a confirmed 98%/direction-matching gate.
2. Percentage-only R2 projection and read-only history contract can be coded
   and unit tested in `codex/us-breadth-public-r1-20261031`.
3. Publishing the R2 249-point history requires a separately approved writer
   and D1 readback. A read-only candidate/reader is not yet a published record.
   No raw history overwrite or Core task change.
4. Actual desktop/mobile display changes belong exclusively to the existing
   `codex/ui-improvements` branch per `AGENTS.md` §1.1. That UI currently
   displays counts, and its narrow-screen CSS hides percentages; UI work must
   remove count labels and show all three percentages at every width.
   At this review, `main` contains the newer height-restore PR #937 while the
   UI branch is older and its layout files have diverged. Preserve latest
   `main` chart height, hover/touch behavior and responsive layout. Make a
   minimal percentage-text-only UI change after reconciling the branches;
   never copy/merge the stale UI branch's entire component or stylesheet.
   Both the strip and the one-year chart tooltip require count removal.
5. Production delivery follows approved PR to `main` and Cloudflare Git
   integration with build/deploy/live-page verification. Branch code alone
   is not a production release.
