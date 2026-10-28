MARKET CALENDAR R31 - OWN-SITE HTML PRESENTATION

PC-only installation from the verified R30 PC source:
  060d5e5fdb15ddfb7161c4d92f8012cd6c2c6192

Changes exactly two files in the existing scheduled Core worktree:
  lib/earnings-api-display.mjs (NEW)
  scripts/pc-writer/earnings-api-local.mjs (REPLACED)

1. Extract the entire ZIP to a fresh folder.
2. Run MARKET_CALENDAR_R31_SAFE_WAIT_APPLY.cmd only ONCE.
3. Send MARKET_CALENDAR_R31_SAFE_WAIT_RESULT.txt and
   MARKET_CALENDAR_R31_PRIVATE_APPLY_RESULT.txt if created.

The one-time installer waits up to 20 minutes for an idle Core task and free
local-cycle.lock. It retries only verified clean lock races. All other
failures STOP; do not delete the lock or rerun a successful installer.

The installer does not run a collection, publish, change the DB schema,
change tasks, push GitHub, or change DNS.

Upon the NEXT successful scheduled 14-date R29 collection, R31 converts
the R30 private result into escaped HTML presentation rows and stores them
as a distinct local output key. Existing PC synchronization may transport
this display key to Cloudflare D1. The site returns rendered HTML only,
not the underlying proprietary API JSON or a machine-readable earnings feed.
API keys and raw input snapshots remain local, and source dates remain
vendor-unverified. If no new collection runs, no new data is asserted.
