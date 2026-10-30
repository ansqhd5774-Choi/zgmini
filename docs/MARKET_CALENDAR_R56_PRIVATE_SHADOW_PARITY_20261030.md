# Market Calendar R56 — private market-cap shadow reader parity and R55 bugfix

Date: 2026-10-30. Repository: `ansqhd5774-Choi/zgmini`; working branch: `codex/ui-improvements`.

## Confirmed baseline

- R51: 2,393/2,394 newly targeted prices were stored. R52: 2,639/2,640 calendar tickers with recent prices; 2,372 with SEC share candidates. R53: only 1,331 share observations are <=90 days old; **no verified issuer-wide USD market caps** and no approved public-derived display rights.
- The prior R54 validation gate and R55 shadow builder were entirely private and not connected to public DB/D1 publication.

## Source-level blocker found and fixed

Two separate defects prevented a future market-cap star rollout, even if licensed issuer-cap snapshots later become available:

1. **R55 actual R31 markup rejected incorrectly**. In `market-calendar-r55-shadow-preview.mjs`, comparing `matches[0][1].length` to the number of ★ characters compared the length of the string "3" (always 1), not the integer 3. Consequently existing 2-star and 3-star rows failed with `DISPLAY_MARKUP_INVALID`. Replaced with `Number(matches[0][1]) !== matches[0][2].length`.
2. **Existing public reader always overrides nine core tickers to ★★★** in `lib/earnings-api-display.mjs` via `CORE_TICKERS`, so an R55 shadow that assigns GOOG/GOOGL a *synthetic test* grade 2 would be rendered back as 3 in the ordinary reader. Added an **explicitly private** shadow render path that honors validated R55 markup, deduplicates GOOG/GOOGL, and applies the existing importance filter consistently. The existing exported `earningsDisplayHtml` and `earningsDisplayResponse` keep the previous core-ticker rules and do not expose the private mode through URL parameters.

## Changes

- `lib/earnings-api-display.mjs`: new `earningsMarketCapPrivateShadowHtml(shadow, options)` requires `PRIVATE_SHADOW_ONLY / NOT_PUBLICABLE_HTML`. Returns `PRIVATE_SHADOW_RENDER_ONLY`, `publishReady=false`; no DB, D1, HTTP or config mutation.
- `scripts/pc-writer/market-calendar-r55-shadow-preview.mjs`: numeric importance-label correction.
- `scripts/pc-writer/market-calendar-r55-shadow-preview.test.mjs`: regression for legacy 2/3 stars.
- `tests/market-calendar-r56-private-shadow-reader.test.mjs`: 6 tests across R31→R55→private render, GOOG/GOOGL issuer grouping, ABBV synthetic grade, importance-filter parity, shadow rejection by public reader, and fail-closed incomplete inputs.

## Evidence boundary

- Targeted V8 execution with actual remote-branch function sources: **R55 9/9 and R56 6/6 PASS**, 2026-10-30. In the isolated test harness, Node imports were removed and standard built-ins used by the HTTP response test were simulated; this is **not a substitute for Node.js CI or PC runtime testing**. No GitHub Actions build/test was run.
- The earlier R53 counts remain actual PC-readback evidence, whereas all specific star values in these regression tests are synthetic, not live market capitalization.
- No provider API calls, PC DB writes, D1 writes, scheduler changes, production deployment, public HTML changes or new price collection.

## Licensing/source gate

- Alpaca official support says redistribution of its API data is not allowed: https://alpaca.markets/support/redistribute-alpaca-api . This does not by itself resolve a derived categorical signal's licensing terms, so publishing a market-cap-derived star needs documented authorization.
- FMP's official ToS 2.2.2 prohibits data display through multi-user applications without a specific agreement; its published 2026 guidance explicitly includes calculated scores/rankings as derived outputs to discuss in a licensing agreement: https://site.financialmodelingprep.com/terms-of-service and https://site.financialmodelingprep.com/insights/platform/can-you-use-fmp-data-in-a-public-app-website-or-client-dashboard .
- EarningsAPI's profile endpoint includes `marketCap`, but the Free tier is limited to 100 requests/day, 1,000/month; the existing website's data-rights grant for derived market-cap grades is not verified: https://www.earningsapi.com/docs/examples/profile-enrichment . **Do not confuse `earningsapi.io` (another vendor) with `earningsapi.com`.**
- New third-party API calls, paid subscriptions, changed TTL/DB structure or deployment require their appropriate approvals and checks. Reuse R51–R53 valid PC evidence; do not rerun source collection merely because the shadow renderer was fixed.

## Next

Complete permitted, accurate issuer-wide market-cap source verification and contractual public derived-display authorization. Once both are established, connect the validated R54/R55 private gate to the approved PC HTML-only projection/publishing route with no legacy priority fallback, rerun affected build/CI and test exact D1/API/UI readbacks before reporting public star changes.
