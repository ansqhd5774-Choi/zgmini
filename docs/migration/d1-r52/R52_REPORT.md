# R52 public projection candidate

Status: R52_WAIT_QUOTA_RESET. Candidate build, deploy, 35 tests and 25 live smoke checks PASS. Deployed source 86b8c36be5621f9dfbc2e5c2aa0e027e2598c812; version bf48ae6a-58bc-4e4e-bd03-adf6e88fcc85.

## Evidence scope

- BUILDER_PARITY.json: original route bodies vs pure builders, identical authoritative snapshot inputs and frozen clock, exact all-field equality 9/9.
- QUEUE_PIPELINE_LOCAL.json: actual stored-source loaders against read-only snapshot; writes only separate in-memory projection table; 9 ACK, no retry, duplicate idempotency, no source/history write or provider call. This is not hosted Queue execution evidence.
- FINAL_LIVE_SMOKE.json: 9 shell GETs 200/SSR bypassed, session/asset 200, mutation/internal and actual Sites auth entrypoints 403, HEAD 200. /api/auth/signin is a nonexistent route (404), not the Sites auth entrypoint.
- QUOTA_PREFLIGHT.json: source read still D1_QUOTA; an empty projection-key SELECT returning pending does not establish quota reset or performance. No additional failed-source polling.
- Remote projection creation: 0 by this run. Hosted Queue delivery, populated response parity, CPU percentiles and rows-read reduction remain unverified.

## Write scope and serving

HTTP uses SELECT-only CORE/HISTORY adapters. Only Queue consumer can invalidate/upsert the nine allowlisted keys in existing market_public_snapshots_v1; no CREATE or source table write. Normal visitor GET never enqueues or computes a fallback. Queue messages carry only id/sourceVersion/sourceStoredAt. Producer checkpoint failure aborts. Scheduled bootstrap hook is dormant: registered Cron list is empty.

Eight detail APIs and KFG public API return stored original payload with one fixed-key SELECT. Missing/stale/source-advanced rows return 503. Cadence policies differ by source; KFG observation-delay boundary is preserved. Inflation historical asOf outside the stored projection returns 503, not legacy recomputation. No formula/history/JSON-field changes. Projection metadata is stored in an envelope, not injected into the public payload.

## Resume after quota reset

1. One bounded source-read preflight after midnight UTC (09:00 KST); stop if D1_QUOTA persists.
2. Invoke stored-source producer through an official controlled scheduled invocation or Queue administrative path, without enabling Cron or an HTTP write endpoint. Enqueue exactly nine three-field jobs with current stored checkpoint, no raw data or credentials. No hosted messages were sent yet.
3. Capture actual Queue ACK/retry/errors and 9 fixed-row creation. Verify source/history unchanged; derived keys must be accounted separately from original snapshot row totals.
4. Compare live populated public JSON against identical snapshot/clock baseline. Sites has resumed writers: differences must be classified as source snapshot drift rather than discarded fields or false parity.
5. Profile all nine optimized APIs using >=31 captured CPU samples per route; record actual native D1 rows_read and compare prior stored-source workload. Do not profile 503 empty-key responses as success.
6. Only report R52_PUBLIC_PROJECTION_PASS after hosted Queue, parity, CPU and reads evidence PASS/WARN; then propose D1_R6_FINAL_DELTA_SYNC_AND_WRITER_CUTOVER.

## Deployment and isolation

New candidate:r52:test/build/deploy commands use R52 config. Legacy hosted CI commands are preserved and remain DB-unbound; do not push/retrigger that pipeline over this candidate until commands/config are deliberately aligned. No GitHub main/Production/DNS/custom-domain changes, no source data writes. Changes are retained on a dedicated local branch.

Free Queue initial nine messages estimate 27 operations (send/read/delete), not observed usage; retries add operations. Actual messages submitted by this run 0; account-wide usage unknown. Queue Free quota 10,000 operations/day and retention 24h: https://developers.cloudflare.com/queues/platform/pricing/ and https://developers.cloudflare.com/queues/platform/limits/ . Consumer CPU/memory still require live validation.
