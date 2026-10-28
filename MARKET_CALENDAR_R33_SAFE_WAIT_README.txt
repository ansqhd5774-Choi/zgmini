MARKET CALENDAR R33 - CACHED EARNINGS HTML REPLAY

PC-only installation from the verified R31 PC source:
  4466f602abfe09bb9cc7530fd109ba1d80aeacbd

Changes exactly ONE source file in the existing scheduled Core worktree:
  scripts/pc-writer/earnings-api-local.mjs

1. Extract the entire ZIP to a fresh folder.
2. Run MARKET_CALENDAR_R33_SAFE_WAIT_APPLY.cmd ONCE.
3. Send MARKET_CALENDAR_R33_SAFE_WAIT_RESULT.txt and
   MARKET_CALENDAR_R33_PC_APPLY_RESULT.txt if created.

The one-time installer waits up to 20 minutes for an idle Core task and free
local-cycle.lock. It retries only verified clean lock races. All other
failures STOP. Do not delete the lock or rerun a successful installer.

On successful installation it attempts a ONE-TIME LOCAL CACHE REPLAY:
- Reuses R30 private input or R29 already stored day input, if current enough.
- Creates a sanitized HTML-only local output when eligible.
- Calls ZERO EarningsAPI endpoints; never performs a forced collection.
- Does NOT push to GitHub, change scheduler, perform remote D1 publication,
  or change schema/DNS/Cloudflare configuration.
- Existing normal PC publication later synchronizes local output to Cloudflare D1.
- If no valid local cache exists, the code still installs but cacheReplay
  reports CACHE_NOT_FOUND or CACHE_EXPIRED_OR_OUT_OF_WINDOW; do not infer
  that 2,609 rows were saved on PC or published to the website.

There is NO need to run any Cloudflare dashboard action. Site rendering code
was already deployed via GitHub main R31/R32, separate from PC data delivery.
