# ZGMINI Cloudflare R9 — Readiness Matrix

Baseline: 28cb1b1bc01493a5c703ab806a1e77ba91c0f675

| Gate | Status | Evidence / Note |
|---|---|---|
| Worker candidate deploy | PASS | R5 |
| Static shell CPU | PASS | R7 |
| SELECT-only candidate store | PASS | R8 |
| Production isolation | PASS | R5-R8 |
| Existing Sites D1 recovery/export | BLOCKER | SUPPORT_REQUIRED |
| Target D1 import | WAITING | depends on recovery/export |
| D1-bound data parity | WAITING | depends on import |
| D1-bound CPU | WAITING | depends on binding |
| Hosted Linux Workers Builds | READY_TO_TEST | config prepared, not activated |
| Cloudflare full zone | DEFERRED | final cutover only |
| Custom Domain | DEFERRED | final cutover only |
| Post-cutover smoke | DEFERRED | final cutover only |

## Completion estimate by engineering work
Excluding external support wait, remaining hands-on work is approximately:
- D1 import/integrity/parity: 1.5-3h
- D1-bound CPU and possible read-path optimization: 0.5-2h if PASS/WARN; longer if heavy detail APIs need precompute
- hosted Linux build: 0.5-1h
- DNS/custom-domain cutover + smoke/rollback verification: 0.5-1h

This is a work estimate, not a calendar completion promise. The external support response controls when G1 can begin.

## Current overall readiness
Engineering readiness is approximately 90%.
Do not increase this percentage merely by completing documentation; the next material increase requires D1 recovery/import evidence.
