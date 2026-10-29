# Asset Bubble R10 — genuine 1-year source history R1

## Authority / preservation

- Primary working branch: `codex/api-site-integration-r1-20261026`. This handoff and PC audit belong to the **existing** work stream, not a new feature branch.
- The latest `main` is the published-source baseline. Never merge the whole divergent work branch. Only submit verified, selected files when the history can be published.
- Preserve `detail:asset-bubble-raw:r1`, approved R10 scoring and all older stored raw batches. No D1, API, UI, score, scheduled task, Cloudflare, or DNS change is part of this read-only audit.
- `USER_ACCEPTED_UNVERIFIED` is a rights qualification, **not** independently cleared licensing. `CURRENT_VINTAGE_NOT_PIT` is a current-vintage historical reconstruction, **not** a point-in-time backtest.

## Why 1-year is pending

The existing public `/api/asset-bubble-raw` sidecar contains **only two genuine points** per factor. The UI labels them `관측 추이`, not `1Y`. Calling the two points a genuine one-year chart is incorrect. The actual PC `core.sqlite` may already contain longer source series; confirm them before changing public presentation.

## Exact reproducible read-only gate

1. Run `scripts/pc-writer/ASSET_R10_1Y_HISTORY_READONLY_R1.cmd` on the approved Windows PC. It clones only this existing branch to a new, isolated TEMP checkout, with no writes to the operational repo.
2. The Node runner first invokes the existing `assetR10PcPreflight()`: approved score, all six raw values, prior values, source batches, breadth audit, quality, releases, and read-only SQLite invariants must pass unchanged.
3. The new pure reconstruction reuses original R10 factor builders and gathers the five actual quarter observations **2025-Q2, Q3, Q4, 2026-Q1, Q2**. It records true date/unit/value for each and null for a missing quarter. All current/prior values and dates must match the already-approved release before any status is reported.
4. The runner checks the SQLite file size and modification time, source batch identity, and returns zero writes. No provider calls, D1 writes, score writes, or deploys.
5. Send only the generated `ASSET_R10_1Y_HISTORY_READONLY_RESULT_*.txt` evidence, never credentials, `core.sqlite`, or operational configs.

## Decision gate for the later UI/API work

| Result | Meaning | Safe next action |
| --- | --- | --- |
| `READY_1Y_READONLY` with all 6 `READY_1Y` | Five genuine observations exist for every component; **source coverage validated locally** | Independent provenance / publication-contract check, stage a separate history reader and versioned publication with exact D1 readback, then selective PR + Cloudflare Git auto deploy + public PC/mobile verification |
| `PARTIAL_1Y_READONLY` | One or more quarters are missing in the stored PC data or vetted breadth research | Preserve and report the exact missing quarters; do not interpolate, convert fake zeros, or label 1Y as complete |
| `ERROR=...` | Existing source/score/quality/immutability preflight failed | Stop, identify the precise error and minimal source fix. Never auto re-fetch, overwrite, or re-post |

## Actual PC evidence received 2026-10-29

- Evidence: `ASSET_R10_1Y_HISTORY_READONLY_RESULT_29981_21772.txt`; executed existing work branch SHA `42e3abbc671185cd9ea87b906ae32e84c51bd0e1`.
- `AUDIT_EXIT_CODE=0`, `WRAPPER_RESULT=PASS_READONLY_AUDIT_EXECUTED`, `approvedRawParity=PASS`; approved score is `22.57324252737245`, no SQLite/D1/score writes.
- `READY_1Y`: valuationPressure, priceAcceleration, riskAssetShare, speculativeFlows, excessLiquidity — each has five genuine observations for 2025-Q2..2026-Q2.
- `PARTIAL_1Y`: breadthDivergence — `2025-Q2`, `2025-Q3` are genuinely absent; only 2025-Q4..2026-Q2 is displayable. Do not invent old quarterly breadth.
- Release `sourceVersion=macro:2026-10-28:728cb9b8d7fe547bf7bcf740bbdd31c733408948fdc0c0b4a83ba0d0f80c9db9`, `sourceStoredAt=1793203206694`, `historyMode=CURRENT_VINTAGE_NOT_PIT`, `rightsStatus=USER_ACCEPTED_UNVERIFIED`.

## Subsequent separate-publication code (not yet applied)

- `worker/asset-bubble-r10-history-r1.mjs`: **new isolated** D1 key `detail:asset-bubble-history:r1` and public route `/api/asset-bubble-history`. Supports five-quarter actual points and `null` on breadth's two missing quarters. No scored API or existing raw key changes.
- `scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_ONE_SHOT_R1.mjs`: optional explicit D1 writer with PC audit, approved operational source gate, **existing raw D1 key comparison before write**, and exact new-key readback. Never publish before reader deployment is verified. A new command wrapper must be tested and delivered separately.
- `app/asset-bubble/asset-r10-history-ui-r1.mjs`: presentation-only exact score/raw/history lineage check. Five-point history for five factors; three-point partial history for breadth; fallback retains existing two-point observations.
- Next gates: selective reader PR from latest main; confirm Cloudflare Git deployment; PC one-shot D1 apply & readback; separate selective UI PR; live PC/mobile detail verification. None of these gates is considered completed by current PC evidence alone.

## Reader production gate completed (2026-10-29)

- Selective PR **#877**, seven needed files only; GitHub full Node.js CI and community candidate build PASS after adding the originally missing publisher test dependency. Merged `main` commit **`50a9eb265d221ea792382c21e89ebefff7746fc4`**; unrelated concurrent main changes retained.
- Cloudflare Git-linked service `zgmini-migration-candidate-r5` showed exact commit `50a9eb...` build **`bf9afe84-4947-444d-a60a-2c6db7c0267a`** Ready (`100%`). Build did not require a direct Wrangler or Sites deployment.
- Public `GET https://zgmini.kr/api/asset-bubble-history` returned `{status:"PENDING",reason:"STORED_PROJECTION_PENDING"}` from the new route, expected until D1 history is published; existing `/api/asset-bubble-raw` still returned approved six-factor `READY` with exact previous/current values.
- `scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_APPLY_R1.cmd` is now committed on the **existing** work branch. It performs a dry run, discovers exactly one approved operational root, and invokes the strictly gated one-key D1 publisher once. On failure, **STOP/NO_RETRY**; inspect D1 readback before any other attempt.
- **Pending**: human PC execution of one-click history-only D1 post + exact readback evidence; the UI is intentionally *not yet wired* to history, so existing two-point mini charts continue unchanged.

## Non-negotiable chart design

- Dashboard stays scored; detailed panel is raw source data, with separate unit/date/source and no reverse derivation from a score.
- Preserve existing two-observation chart until the new historical payload has validated coverage and exact matching D1/public readback.
- Once verified and published, render each factor's exact dated history points; missing/null dates stay empty or explicitly partial. Do not invent a uniform time span from two observations.
- D1 writes, PR merge, Cloudflare auto deployment, and public UI check are **not** completed by this read-only gate and must be reported separately.

## Tests

`node --test tests/asset-r10-one-year-readonly-r1.test.mjs tests/asset-r10-raw-readonly-r1.test.mjs`

The tests exercise genuine five-point readiness, an intentionally missing breadth month, score parity failure, no future observations, and read-only source constraints.


## R2 publication-launcher recovery (2026-10-29)

- PC R1 evidence: `ASSET_R10_1Y_HISTORY_D1_RESULT_3848_6278.txt`. `PASS_DRY_RUN` for six factors, five full and breadth partial; then `APPLY_EXIT_CODE=1`, `ERROR=ASSET_R10_HISTORY_D1_OPERATION_FAILED`, `WRAPPER_RESULT=STOPPED_NO_RETRY`. There was **no successful write/readback**. The public history API still reported `PENDING/STORED_PROJECTION_PENDING` after the attempt. Do not infer D1 completion from the dry run.
- Root cause in source: R1 launches the one-shot from `codex/api-site-integration-r1-20261026`, but its existing `EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs` independently requires a clean isolated **`main`** publisher with matching `origin/main` remote HEAD. This is a source-gate failure before the existing-raw D1 comparison/write; no relaxation of this security gate is permitted.
- **R2 corrected command:** `scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_APPLY_R2.cmd` on the **same existing work branch**. It clones latest `main` into an isolated TEMP publisher, checks exact publisher/reader/auditor blobs, runs approved PC dry-run, and uses an independent clone of the existing working branch solely for the proven operational-checkout discovery helper. It verifies latest remote `main` again immediately before apply, then invokes the original one-key audited publisher **once**, without retries. Existing D1 raw key, scores, SQLite, source config, scheduler, API, UI and deployments remain untouched by this launcher itself.
- Local static regression: `node --test tests/asset-r10-history-r2-launcher.test.mjs` **4/4 PASS**; compares isolation/clone scope, pinned source hashes, main-drift check, dry-run/apply ordering, and fail-closed behavior. This is not a Windows/PC integration execution or a D1 result.
- **Pending operating gate:** on the approved PC run R2 at most once and send only `ASSET_R10_1Y_HISTORY_D1_R2_RESULT_*.txt`. On `APPLY_EXIT_CODE != 0`, stop and read the D1 state before further attempts. `READBACK_VERIFIED` or validated `ALREADY_STORED` plus public `PARTIAL` history API must precede UI chart history wiring. Keep 5/5 real quarters for five factors and 3/5 for breadth; never invent 2025-Q2/Q3 breadth observations.

## R3 exact D1 lineage diagnosis — R2 failure evidence (2026-10-29)

- Actual R2 PC log: `ASSET_R10_1Y_HISTORY_D1_R2_RESULT_4458_2681.txt`. Publisher `main` SHA `9727678cf372457e4dfe6510f010c6f103e11a1e`. `PASS_DRY_RUN` and operational root discovery and main-drift gate PASS. At the existing-raw comparison, `ASSET_R10_HISTORY_APPROVED_RAW_D1_LINEAGE_MISMATCH`, `APPLY_EXIT_CODE=1`, `STOPPED_NO_RETRY`. New history writer was **not invoked**, so no new history write by that R2 execution. Do not rerun R2 until lineage is diagnosed.
- Existing archived successful raw D1 publication and PC 1Y audit agree exactly for six factors on value/previous value, units, dates and sources. A **current** D1-versus-PC metadata or factor difference is unproven, and the one-shot R1 failure groups all these field mismatches together. Never drop or weaken this gate.
- Added `lib/diagnostic-layer/asset-bubble-r10-d1-lineage-r3.mjs` (pure comparator), `scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_LINEAGE_READONLY_R3.mjs` (approved PC audit, strict approved operational source, read-only D1 adapter, exact field mismatch enumeration, new history key readback status), and `scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_LINEAGE_READONLY_R3.cmd` (isolated existing-branch clone, trusted file hashes, desktop TXT). No main merge, D1 writes, score edits, scheduled tasks, or deployment.
- Tests: `node --test tests/asset-r10-history-d1-lineage-r3.test.mjs` **5/5 PASS** on isolated source tests. No real Windows/PC or live D1 diagnostic has run yet.
- **Next step only:** execute R3 READ-ONLY diagnostic once and inspect `ASSET_R10_1Y_HISTORY_D1_LINEAGE_R3_RESULT_*.txt`. If raw row is missing/invalid, or any lineage fields differ, reconcile against actual approved D1/source without modifying approved scoring or data; do not re-post or wire the UI. If all fields match and history key is missing, investigate one-shot program timing/source drift before a separate approved single-key application. A terminal success from this read-only diagnostic is not a D1 publication PASS.

## R3 diagnosis and R4 archived provenance recovery (2026-10-29)

- User PC evidence `ASSET_R10_1Y_HISTORY_D1_LINEAGE_R3_RESULT_15495_25351.txt`: `PASS_READONLY_DIAG_EXECUTED`, old raw D1 `VALID`, new history D1 `MISSING`, **exactly three metadata mismatches**: `sourceVersion` date `2026-10-28` vs current PC `2026-10-29` (identical 64-byte source-content fingerprint), `sourceStoredAt` `1793203206694` vs `1793254203126`, `asOfDate` 28 vs 29. Score, values, previous values, dates, units and sources for 6/6 factors agree with original archived PC 28 audit and original D1 raw readback. R3 performed 0 D1 writes.
- Do **not** change old published D1 raw key, approved score or weights; do **not** relax the exact lineage gate or relabel 29 data as 28. Instead, reuse the **previously approved and preserved 28th PC read-only audit file**, validated against every genuine historical observation in the current PC again. The separate sidecar's `sourceVersion`/`sourceStoredAt`/`asOfDate` remain **28th** by actual audited provenance.
- Existing work branch new R4 implementation:
  - `lib/diagnostic-layer/asset-bubble-r10-history-archive-r4.mjs`: parse original R1 audit with exact source SHA and exit markers; require current/archived source content digest and all six 5-quarter factor arrays, score, input price batch, source release flags equal. Fail closed on any value/metadata drift.
  - `scripts/pc-writer/ASSET_R10_1Y_HISTORY_ARCHIVED_D1_ONE_SHOT_R4.mjs`: run PC read-only audit, validate original 28 audit (not overwrite source meta), check original 28 D1 raw envelope+strict lineage, publish **only** `detail:asset-bubble-history:r1` via existing writer and exact readback. Existing scored/raw D1 keys are SELECT-only.
  - `scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_APPLY_R4.cmd`: isolated latest `main` publisher + existing-branch read-only approved operational root discovery, pinned code hashes, fresh main check, dry-run before one and only one apply. STOP/NO_RETRY on all errors. The ZIP contains the exact original archived R1 PC audit file separately; **never commit original data/evidence to GitHub**.
  - `tests/asset-bubble-r10-history-archive-r4.test.mjs`: source tamper, five quarter mismatch, date/source digest mismatch, D1 raw lineage mismatch, zero-vs-null retention. Local pure regression 8/8 PASS. PC runtime and D1 application not yet executed.
- Selective PR [#887](https://github.com/ansqhd5774-Choi/zgmini/pull/887) from latest main, 4 exact source+test files only. **Pending CI/merge and Cloudflare Git delivery**; do not run the R4 CMD until a main production-ready source with R4 files is confirmed.
- Next: GitHub CI PASS and selective merge; verify Cloudflare Git-linked service if it builds; run approved PC R4 once; inspect `ASSET_R10_1Y_HISTORY_D1_R4_RESULT_*.txt` for `READBACK_VERIFIED` (or exact `ALREADY_STORED`); separately confirm public `/api/asset-bubble-history` PARTIAL; then selectively wire the detailed UI without touching R10 formula or scored API.

### R4 selective deployment result

- GitHub PR [#887](https://github.com/ansqhd5774-Choi/zgmini/pull/887) GitHub check **success**, mergeable; selectively squash-merged to `main` at exact SHA `d4b1959727db6943bb6eb4b012a9f3510d4cc5e0`. Main reread verified all four exact R4 file SHA blobs. This DOES NOT prove Cloudflare ready or PC/D1 apply; public reader was previously deployed independently with #877.
- R4 delivery ZIP `ASSET_R10_1Y_HISTORY_D1_ARCHIVED_R4_20261029.zip` includes approved archived PC audit `ASSET_R10_1Y_HISTORY_READONLY_RESULT_29981_21772.txt` **outside GitHub**, CMD, instructions. User must extract together, invoke once, and send `ASSET_R10_1Y_HISTORY_D1_R4_RESULT_*.txt`. NO automatic retry if result unknown.
- Remains pending: actual authorized PC run, exact D1 readback on only `detail:asset-bubble-history:r1`, public `PARTIAL` response, then selective UI wiring and PC/mobile verification. The current chart is still two observations until those gates pass.
