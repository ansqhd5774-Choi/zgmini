# ZGMINI D1 R6 — Production Worker preparation

Status: SOURCE_PREP_ONLY

## Purpose
Prepare the final Cloudflare Production Worker without activating routes, custom domains, DNS or scheduled writers before the final D1 delta gate passes.

## Production shape
- Worker source: worker/production-r6.ts
- Worker name: zgmini-production-r6
- DB_CORE: zgmini-core-r42
- DB_HISTORY: zgmini-history-r42
- public detail/KFG APIs: fixed stored projections
- 9 public pages: prebuilt static shell
- other existing application routes: existing worker/index.ts contract
- Queue: zgmini-public-projection-r1
- initial crons: none
- initial routes/custom domains: none

## DB routing
Legacy non-KFG env.DB is mapped to DB_CORE at the production build boundary.
KFG V2/REV7 readers/stores are routed to DB_HISTORY by the same deterministic module allowlist proven in the candidate.
No runtime SQL parsing or cross-DB fallback is introduced.

## Writer activation
The pre-DNS Production Worker must first deploy with crons disabled.
After FINAL_SOURCE -> target exact parity:
1. configure required existing runtime secrets
2. run one authenticated controlled writer probe through an existing internal scheduler endpoint
3. verify only the expected target shard/table changed
4. verify frozen Sites source did not change
5. enable approved schedules only after the probe passes

## Projection refresh
The production wrapper keeps the existing source writer implementation intact.
After an approved scheduled source update:
- core schedules enqueue non-KFG projection IDs only when the CORE checkpoint advanced
- REV7 schedule enqueues koreaFearGreed only when the HISTORY checkpoint advanced
Queue consumer writes only the fixed projection keys in DB_CORE.

## Hard gate
Do not deploy this as live Production or attach zgmini.kr until:
- Sites writers are frozen
- final source manifest exists
- final delta is applied
- 53-table target parity passes
- controlled target writer probe passes
- direct workers.dev runtime passes
