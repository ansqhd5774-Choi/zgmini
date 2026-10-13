# E1-R5 G3 Validation R1 — S12A vs S13 Non-Redundancy Gate

Status: **APPROVED_SHADOW_VALIDATION**  
Production activation: **NO**  
Production baseline: **E1-R4 remains active**

## Purpose

G3 tests whether S12A Management EPS Guidance Revision Magnitude and S13 Management Guidance Breadth contain sufficiently distinct information to remain separate components.

This is not a predictive-outcome test. G5 separately evaluates lead relationships to next-1Q/2Q earnings, revenue, margin, and EPS-breadth outcomes.

This is not a PIT backtest. G6 separately requires information that was actually stored and available at each historical evaluation timestamp.

## Evidence source

Use the existing local SEC corpus:

- current checkpoint: 499 issuers;
- historical backfill: 995 filings;
- source timestamps: SEC `acceptedAt` when present, otherwise filing date end-of-day;
- replay cadence: UTC month-end;
- same comparison contract as G2:
  - issuer;
  - target fiscal period;
  - EPS metric;
  - GAAP/adjusted basis;
  - unit.

The retrospective replay is research-only and must be labeled `RETROSPECTIVE_SOURCE_TIME_NOT_PIT`.

## Gate criteria

A monthly replay point is eligible only when it has at least **10 comparable issuers**.

G3 is `EVIDENCE_PRESENT` only when all of the following hold:

1. at least **6 eligible monthly points**;
2. at least **4 unique S12A values** and **4 unique S13 values**;
3. absolute S12A-vs-S13 Spearman correlation is **below 0.90**;
4. the maximum absolute leave-one-out Spearman correlation is **below 0.95**;
5. absolute first-difference Spearman correlation is **below 0.80**;
6. the S12A and S13 rank vectors are not identical.

These thresholds are a Shadow redundancy screen. They do not change any E1-R5 formula, weight, normalization rule, missing-data rule, storage schema, or Production wiring.

## Current 995-file evidence

Using the R36/R38 parser contract and existing local corpus:

- low-coverage April 2026 is excluded because it has only 6 comparable issuers;
- eligible months: May through October 2026 = 6 points;
- minimum comparable issuers among eligible months: 16;
- Spearman rho: approximately 0.7647;
- first-difference Spearman: 0.6000;
- maximum absolute leave-one-out Spearman: approximately 0.8947;
- rank vectors: different.

This satisfies the G3 R1 non-redundancy gate, but does not satisfy G4, G5, G6, historical-percentile normalization, or Production readiness.

## Safety

- Provider/network calls: 0.
- DB/D1 writes: 0.
- Production activation: NO.
- Formula changed: NO.
- Weight changed: NO.
- Normalization changed: NO.
- PIT backtest claim: NO.
