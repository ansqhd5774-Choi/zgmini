# US Breadth R33 — independent percent-only PC inspect and gated R2 history writer

## Scope

The R31 provider evidence was sufficient for 249 authentic day-over-day
comparisons. R33 does **not** demand the unavailable oldest baseline day.
The existing R1 confirmed public record, its 250-session history, all IEX
provisional data and the approved Windows Core scheduled task are immutable.

R33 connects the already existing R25 provider-authenticated full-stock preview
to the R32 percent-only history publisher through an **independent manual PC
entry point**. It has no scheduled task, service installation, or automatic
production deployment.

## Explicit read-only Windows inspection

1. Use the original full-stock PC package directory (same root layout as R31)
   with `scripts/`, `lib/`, and approved dependencies available.
2. Run `US_BREADTH_R33_PERCENT_ONLY_INSPECT.cmd` from the package root.
3. It uses **only** `E:\ZGmini\runtime\node.exe`, reads the R2-staged
   MarketParquet source, and re-verifies its bytes against signed provider
   downloads. No source files are rewritten.
4. It saves a timestamp-free, sanitized TXT in `%USERPROFILE%\Downloads`
   (or `%TEMP%` fallback), opens Notepad, and asks for that TXT to be attached.

The inspect output contains dates, `risingPct`, `fallingPct`, `unchangedPct`,
an evidence SHA, provenance status and publication/write controls. It contains
**no public stock counts, raw security prices, API secrets, D1 credentials,
source paths or raw provider URLs**.

**Important:** A complete independent provider-byte re-verification runs each
time this entry point executes. R33 does not silently reuse an unverified
snapshot or treat SHA-256 of a local file as provider provenance.

## Separately authorized R2 history publication code

The Node entry point supports a separately approved mode:

```
node scripts/pc-writer/us-breadth-confirmed-percent-history-runner-r33.mjs \
  --publish-approved --allow-d1-final-write --approved-sha256 <REVIEWED_64_HEX_SHA>
```

**This is not an instruction to run now.** The required reviewed SHA is from
the preceding R33 inspect report. That number must be independently approved
before final publication; CLI flags alone cannot supply that permission.

Only the R2 percent-history D1 key can be written, after re-verifying the
provider and matching the reviewed SHA. `d1.mjs` uses the existing PC Wrangler
credential in memory; tokens and config are never printed. The writer uses a
conditional D1 update (CAS), reads back the exact record and rejects unknown,
conflicting or newer content. Ambiguous outcomes require independent readback.

R33 does **not** create a publish CMD or register it in Windows Task Scheduler.
No D1 write has been executed during implementation or tests.

## Verification and next gates

- Tests: `node --test tests/us-breadth-confirmed-percent-history-runner-r33.test.mjs`
- Typecheck: `npm run typecheck`
- Gate 1: PC inspect TXT and independent SHA review.
- Gate 2: actual R2 percent-history D1 key publication/readback, separate from R1.
- Gate 3: corresponding API route merged into approved `main`, Cloudflare Git
  deployment and real HTTP confirmation.
- Gate 4: only the existing `codex/ui-improvements` branch may remove public
  counts from desktop/mobile strip and 1-year tooltip; ensure the latest UI
  rollback remains intact and the result has real browser evidence.

The program is not a substitute for the Cloudflare deployment/readback gates.
