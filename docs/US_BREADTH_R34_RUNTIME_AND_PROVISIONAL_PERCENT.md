# US Breadth R34 — provisional percentage-only API and live-source gate

## Updated display rule

The public US breadth interface shows percentages only, never constituent
counts, including the IEX 15-minute provisional phase. Internal recorded
counts and source-audit evidence are retained for arithmetic integrity.

For a provisional IEX observation, `risingPct`, `fallingPct`,
`unchangedPct` and `unobservedPct` share the same eligible IEX universe
denominator and total 100%. Missing observed prices remain **unobserved**, not
imputed unchanged. No confirmed 98% coverage gate or directional-match test is
applied to provisional output. The separate MarketParquet R2 final phase uses
only `risingPct`, `fallingPct`, `unchangedPct` for verified complete daily
source pairs. Neither source is relabelled as the other.

The public API `phase=provisional` uses a strict validated projection and
must not return `counts`, `expectedCount`, `observedCount`, `missingCount`,
`coverage` or source security prices. Existing D1 keys and raw PC ledgers are
not rewritten.

## Live read-only check (2026-11-02 KST)

The observed `https://zgmini.kr` deployment serves the legacy R1 response for
`/api/market-breadth?market=usa` even when `phase=provisional` or
`phase=confirmed-r2` is appended. The independent
`/api/market-breadth-r2-history?market=usa` route returns HTTP 404. This is
consistent with GitHub `main` at `f217fe24faeeb76a7a161228b5e9a6f304bdaa11`:
the public main route has no phase selection, and the R2 history route is not
in main. An R32/R34 feature-branch commit is **not** production deployment.

The main and existing `codex/ui-improvements` branch currently diverge by
hundreds of commits; the latest UI branch observed was
`abc0d85735a552cf9651c889544d0b6e91bc0fdf`. Do not merge that branch
wholesale or restore its older chart implementations over main's recently
repaired mobile, tooltip and pointer behavior.

## Remaining release gates

1. Run explicit read-only R33 PC inspect using the approved E: Node and
   upload the sanitized Downloads TXT. This performs provider-byte comparison
   without D1 writes; the missing oldest 2025-10-31 raw day is not required.
2. Independently approve the verified R33 chart/evidence digest before a
   separate opt-in R2-only D1 history publication and exact readback. Existing
   R1 Core/History and scheduling remain immutable.
3. Selectively integrate the R2 route, reader and **all required imports** into
   latest main through a reviewed PR. The branch has diverged from main, so a
   raw full-branch merge is not a safe substitute for selective recovery.
4. On the existing UI-only branch, remove count text and accessibility labels,
   stop hiding percentages under 500 px, and point to correctly published R2
   percentage history without R1 fallback. Preserve the main layout/interaction
   improvements. Verify desktop and mobile visual output.
5. Only after the repository PR and Cloudflare Git integration deployment are
   confirmed should the live API, D1 and public page be declared operational.

All R33/R34 tests use synthetic fixtures; no authenticated provider calls,
PC task changes, real D1 writes or production deployments were performed by
these source changes.
