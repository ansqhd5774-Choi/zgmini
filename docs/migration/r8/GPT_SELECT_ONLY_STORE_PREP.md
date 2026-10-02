# ZGMINI Cloudflare R8 — GPT Select-only Store Prep

## Status
PREPARED_FOR_CODEX_RUNTIME_VALIDATION

## Implemented on this analysis branch
- Added `worker/candidate-market-operational-store.mjs`.
- Public read contract mirrors current operational store for:
  - `readScore()`
  - `readInput()`
  - `readStoredMarketInputs()`
  - `storedMarketResponse()`
- Removed schema initialization from candidate read path.
- All SQL in the candidate store is SELECT-only.
- Write/claim/finish methods fail closed with CANDIDATE_WRITE_DISABLED.
- Candidate import boundary rewrites app imports of Production `market-operational-store.mjs` to the candidate SELECT-only adapter.
- Added tests for:
  - no CREATE/INSERT/UPDATE/DELETE/PRAGMA in candidate operational reads
  - app import rewrite to candidate adapter
  - write methods fail closed

## Not yet proven
- Node/build/runtime tests have not been executed on this GPT analysis branch.
- Real D1 cannot be bound until database identity/export is resolved.
- Actual D1 route CPU is unmeasured.

## Merge rule
Do not merge blindly. Codex should reproduce/cherry-pick the changes into migration/cloudflare-workers-r1, run clean build and existing candidate guard/contract tests, then keep D1 unbound until official database recovery evidence exists.

## Remaining final-cutover gates
1. SELECT-only candidate store runtime validation.
2. Resolve Sites D1 identity/export/import path (external SUPPORT_REQUIRED blocker).
3. Bind recovered/imported D1 to isolated candidate and verify data parity + route CPU.
4. Run hosted Linux Workers Builds once and verify branch gate.
5. Final Cloudflare zone/custom-domain/DNS cutover and post-cutover smoke tests.

## Current engineering estimate
Code/hosting/UI/static-shell migration is in the final phase. The only unresolved external dependency is the existing Sites D1 recovery path. Calendar completion cannot be reliably estimated until support returns the database/export answer.
