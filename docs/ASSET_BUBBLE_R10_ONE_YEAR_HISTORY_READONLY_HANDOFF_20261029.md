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

## Non-negotiable chart design

- Dashboard stays scored; detailed panel is raw source data, with separate unit/date/source and no reverse derivation from a score.
- Preserve existing two-observation chart until the new historical payload has validated coverage and exact matching D1/public readback.
- Once verified and published, render each factor's exact dated history points; missing/null dates stay empty or explicitly partial. Do not invent a uniform time span from two observations.
- D1 writes, PR merge, Cloudflare auto deployment, and public UI check are **not** completed by this read-only gate and must be reported separately.

## Tests

`node --test tests/asset-r10-one-year-readonly-r1.test.mjs tests/asset-r10-raw-readonly-r1.test.mjs`

The tests exercise genuine five-point readiness, an intentionally missing breadth month, score parity failure, no future observations, and read-only source constraints.
