# US Breadth R44 — verified R2 D1 final and remaining release gates

Date: 2026-11-02 KST. Repository: `ansqhd5774-Choi/zgmini`.
Development branch: `codex/us-breadth-public-r1-20261031`.

## Actual operator evidence — no re-collection required

- R31 staged the **250 available** MarketParquet source days. The absent oldest
  2025-10-31 baseline does not block the collected history or current source pair.
- R37 operator result: `VERIFIED_PERCENT_HISTORY_FINAL`, D1 write/readback for
  `public:market-breadth-confirmed-r2:usa:history-percent:v1` covering percentage
  comparison points from 2025-11-04 to 2026-10-30. This key is immutable in
  subsequent R43/R44 steps.
- R43 operator result: `R43_VERIFIED_STAGING_ONLY`, process exit 0,
  `d1Writes=1`, `stageReadbackVerified=true`. The row was the independent
  `public:market-breadth-confirmed-r2:usa:staging` key in approved CORE D1.
  Actual D1 staging-body SHA256:
  `830491288e7a66ad42c488c039afdbb466439708f06aa7156c16c141bedcfccd`.
- R44 FIX1 operator result: **`R44_VERIFIED_CURRENT_AND_DAILY_FINAL`**,
  process exit 0, `d1Writes=2`, `readbackVerified=true`,
  `publicationAllowed=true` for `2026-10-30`. CORE D1 contains independent
  R2 keys `public:market-breadth-confirmed-r2:usa:current` and
  `public:market-breadth-confirmed-r2:usa:daily:2026-10-30`.
  The final was promoted only after exact staging and source SHA checks.
- Verified percentage output for that session: rising 26.4217645250538%,
  falling 67.78358438364587%, unchanged 5.794651091300338%.
  Only these percentages, not constituent totals, belong on public output.
- The R44 original operator attempt stopped at argument validation with
  `d1Writes=0`; FIX1 used the reviewed staging SHA without manual text entry.
- Existing R1 confirmed key, 250-session R1 history, R37 R2 percent history,
  IEX provisional keys, PC Core scheduler, lock/PID and E: source are unchanged
  by R43/R44. All above D1 assertions are from operator PC logs, **not** from
  direct Cloudflare console access from this workspace.

## Actual public HTTP and source state

Read-only checks on 2026-11-02 KST:

1. `GET https://zgmini.kr/api/market-breadth?market=usa&phase=confirmed-r2`
   returned HTTP 200 with the **old R1 body shape containing counts**, not the
   R2 percent-only contract. Production currently ignores this phase.
2. The same route with `phase=provisional` returned the same old R1 body shape.
3. `GET https://zgmini.kr/api/market-breadth-r2-history?market=usa`
   returned HTTP 404.
4. Latest main observed: `a198e3c5cd21a955454fe5e9641cd5d42246bcde`.
   It lacks R2 phase dispatch and the independent history route. On the
   development branch the separate R2 readers and route tests already exist;
   four targeted reader/route test files passed in the source workspace.

Do not call the D1 write a website deployment or report the old R1 response
as an R2 API success. No production deploy was performed with this evidence.

## Deployment-only branch must remain deployment-only

- Existing release PR: <https://github.com/ansqhd5774-Choi/zgmini/pull/943>
  (`release/us-breadth-history-r2-20261031` -> `main`) is **draft/unmerged**,
  containing only the history API and its two required library files.
- PR #943 last observed Node.js CI completed **failure** on 12 unrelated
  regression tests also failing on its main baseline. This is not proof of a
  successful required production gate. Do not silently merge it or add
  development files to that release-only branch.
- Source-only R2 `phase=confirmed-r2` and `phase=provisional` readers on the
  development branch have not yet been selectively released to main.
- UI layout/count removal and R2 1-year percentage chart work belong to the
  existing `codex/ui-improvements` branch, preserving main's current visual
  interaction work. Never merge that branch wholesale.

## Remaining ordered tasks

1. **API release gate:** confirm latest main/bindings/CI, select only audited
   R2 history and R2 current/provisional read-only endpoint dependencies,
   using approved deployment-only workflow and selective PR review. Keep R1
   legacy keys and routes available as historical data without relabelling.
2. **Automated freshness:** the R44 record is a one-time 2026-10-30 current.
   After the next US completed session, the R2 current reader correctly
   rejects the stale day. Verify the actual approved PC Core Task action/source
   (R39 reported multiple project candidates), then plan repeated full-market
   daily source acquisition and R2-only percent final publication with no
   task re-registration or old-key write. This remains **unverified**.
3. **IEX natural slots:** verify three consecutive real 15-minute NY slots,
   their approved PC producer, D1 readback, and API timestamp progression.
   Do not impose R2 98% or directional agreement on IEX provisional.
4. **UI release:** add clear provisional/confirmed labels and percent-only
   visible output and 1-year R2 percentage history. No R1 503-count fallback
   presented as a MarketParquet full-market R2 result.
5. **Production gate:** approved PR into main -> Cloudflare Git integration
   build/deployment -> exact API results -> D1/read-only consistency -> live
   desktop/mobile UI. Do not use Sites, direct Wrangler production deploy,
   Cloudflare Cron, or arbitrary Core changes.

Oldest missing baseline collection, repeat R42/R43/R44 preflight, and
R1-to-R2 direction matching are **not** prerequisites for the above work.
