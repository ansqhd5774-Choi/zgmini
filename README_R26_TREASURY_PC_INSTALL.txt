ZGMINI MARKET CALENDAR - R26 U.S. TREASURY PC INSTALL

1) Extract ALL files in the R26 ZIP to ONE new Windows folder.
2) Run MARKET_CALENDAR_R26_TREASURY_APPLY.cmd exactly ONCE.
3) Upload MARKET_CALENDAR_R26_TREASURY_APPLY_RESULT.txt to ChatGPT.

Verified successful user PC R25 source:
724bbbf4407363f1f091567ed196cc0bf554bb5e

ONLY these three changes are permitted after safety validation:
- lib/release-calendar.mjs (one new source registry entry)
- lib/treasury-calendar.mjs (new official XML parser)
- scripts/pc-writer/release-calendar.mjs (one independent source collector)

Existing CFTC, USDA, EIA, BLS, BEA, Fed, Census and unrelated workers'
PC sources are protected. R25 baseline SHA256 for all covered files,
Core worktree identity, scheduler task origin, config.source, dirty
protected worktree and local-cycle.lock are checked before any write.

EVENT POLICY:
- Official weekly Treasury CUSIP Release XML, observed HTTP 200.
- Use explicit announcement and competitive auction dates only.
- Issue/settlement dates remain in raw XML and are not release events.
- Never infer auction time or extrapolate recurring auction weekdays.
- Preserve previously captured history and other still-upcoming CUSIPs
  when Treasury rotates to a newer weekly release.

SAFETY:
- Exact R25 PC HEAD/config.source required; source drift STOPS.
- Backups then local 3-file Git commit and config.source readback.
- No forced collection, publication, SQLite/D1 operation or task edit.
- No GitHub push, main merge, Cloudflare production deployment.
- If STOP occurs, do not bypass or rerun. Upload result for review.
