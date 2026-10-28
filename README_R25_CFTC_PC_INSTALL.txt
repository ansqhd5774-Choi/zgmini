ZGMINI MARKET CALENDAR - R25 CFTC COT PC INSTALL

1) Extract ALL files from MARKET_CALENDAR_R25_CFTC_PC_INSTALL_20261028.zip.
2) Run MARKET_CALENDAR_R25_CFTC_APPLY.cmd exactly ONCE.
3) Upload MARKET_CALENDAR_R25_CFTC_APPLY_RESULT.txt to ChatGPT.

Verified user PC source at the preceding R24 successful install:
b8204432cea18f62eb34eb8d08dcfe61717a448d

Only these three files will be added or replaced after all safety gates:
- lib/release-calendar.mjs
- lib/cftc-calendar.mjs (new)
- scripts/pc-writer/release-calendar.mjs

Existing USDA, EIA, BLS, BEA, Fed and Census code is preserved.
The installer verifies R24 parser/collector plus USDA/EIA hashes.

SAFETY:
- Current PC source/config must exactly match the above R24 source.
- Existing protected worktree must be clean. Core identity and lock checked.
- Source files and config are backed up before a local-only Git commit.
- It never forces a collection, publisher, DB operation or schedule run.
- It never pushes GitHub, merges main or deploys the site.
- If another PC worker commits in the meantime, the installer STOPS.
- Do not rerun or bypass a stop; upload the result for safe re-review.

CFTC 2026 official HTML was observed on 2026-10-28 (HTTP 200, 47894 bytes).
The parser uses real dated rows, including official holiday delays. It
does not infer Fridays or schedule years absent from the official page.
