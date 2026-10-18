# R18 P1 — PC diagnostic preflight correction (2026-10-19)

## Actual PC result
- User-provided R18_RESULT.txt reported only `STATUS=R18_STOCK_STORE_MISSING_STOP`.
- The **CMD preflight** stopped before the read-only Node diagnostic; this is not evidence that R8's previously verified 715 stock group files vanished.
- Original CMD incorrectly demanded exact `E:\\ZGmini\\data\\pc-writer\\asset-r10-alpaca\\group-01.json`. Existing R3/R8 batch format is `group-[0-9]+.json`, accepting `group-1.json`, etc. This mismatch is an assistant implementation mistake.

## Hotfix
- Standalone ZIP: `ZGMINI_THEME_R18_P1_STOCK_PREFLIGHT_FIX_2026-10-19.zip` (supplied in conversation).
- SHA-256: `6d4aac930f9feaf2020fa8e8e16fb46958dc3372b094dba241a36f76bd3bafc4`.
- Only replaces one CMD preflight with approved directory existence + bundled JavaScript file checks. Original R18 Node data access, storage parsing, cohort scoring bans, API access and original R3 algorithm **not changed**. The unchanged Node parser itself enforces numeric group filenames and incremental files.
- Two regression tests added to standalone package: group-1.json without group-01.json, and CMD preflight guard.
- Local Node v22.16.0 **70/70 fixture tests PASS**, then independent ZIP extraction **70/70 PASS**. No real PC R18 runtime proof until user executes updated CMD. No provider/API calls or PC raw writes performed.
- Run fresh ZIP's `ZGMINI_THEME_R18_LOCAL_STOCK_COVERAGE.cmd` once only; upload `ZGMINI_THEME_R18_RESULT.txt`; STOP on any further error.
- User requested reports only when CMD execution is necessary; do not request additional PC work while this gate remains.

Research-only: this branch does not merge or deploy, and no D1, scheduled jobs, weights, source contracts, DNS or production output were changed.
