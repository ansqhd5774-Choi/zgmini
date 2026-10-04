# ZGMINI Cloudflare R9 — Final Cutover Gate

Baseline: migration/cloudflare-workers-r1 @ 28cb1b1bc01493a5c703ab806a1e77ba91c0f675

## Goal
Define the minimum final-cutover gate after R8 without changing Production, DNS, D1, or main.

## Current proven state
- Candidate Worker runtime: PASS
- Static shell 9 routes: PASS
- Free CPU for DB-unbound candidate: PASS
- Candidate write guard: PASS
- Candidate SELECT-only operational store: PASS
- Production isolation: PASS
- Hosted Linux Workers Builds execution: NOT YET RUN
- Existing Sites D1 recovery/import: SUPPORT_REQUIRED
- Final custom-domain cutover: NOT STARTED

## Gate order

### G1 — D1 recovery identity/export
Required evidence from official source/support:
- existing database identity or complete supported export path
- export scope includes schema and data needed by Production
- export consistency semantics known
- procedure for target D1 import known

No target D1 creation/import should be treated as parity evidence until this gate is satisfied.

### G2 — Target D1 import integrity
After an authorized export/import:
- table inventory matches expected source inventory
- required schema/index/trigger/view objects checked
- row counts recorded per critical table
- newest observation date recorded per critical history table
- current score snapshot exists
- no writer is pointed to target before read-parity verification

### G3 — Read-only candidate binding
Bind the imported target D1 to the isolated candidate only.
Keep:
- mutation guard enabled
- cron 0
- routes/custom domains 0
- Production writer untouched

Verify public reads against the SELECT-only candidate store.

### G4 — Data parity
Minimum parity set:
- overall market score
- inflation
- recession
- liquidity crisis
- credit risk
- earnings recession
- asset bubble
- debt risk
- supply shock
- representative historical chart rows
- observationDate / updatedAt / source fields

No tolerance should be invented. Exact stored payload fields should match when both sides are reading the same snapshot.

### G5 — DB-bound CPU
Repeat R7 workload after real D1 binding.
Separate:
- page/static shell CPU
- /api/market-score
- each detail API

If a detail API repeatedly exceeds Free CPU, move that payload to precompute/store-only read without changing scoring formulas.

### G6 — Hosted Linux Workers Builds
Connect GitHub only to the isolated candidate Worker first.
Branch:
- migration/cloudflare-workers-r1

Production branch must not be main during candidate validation.
Expected build flow:
- npm ci
- candidate build
- guard/contract checks
- candidate deploy

Record the exact Cloudflare build SHA and deployed Worker version.

### G7 — Production Worker configuration
Only after G1-G6 pass:
- create/confirm distinct Production Worker identity
- attach target D1
- preserve static-shell path
- preserve write/auth rules
- configure required runtime secrets only
- configure approved scheduler/writer path separately

Do not reuse candidate-only fail-closed settings where Production legitimately needs writer functionality.

### G8 — Cloudflare zone and DNS
For Workers Custom Domain on Free/Pro, the domain must be in an active Cloudflare full zone.
Before nameserver change:
- inventory all current Cafe24 DNS records
- reproduce required records in Cloudflare DNS
- confirm mail/verification/other records if any
- verify apex and www intended final behavior

Registrar remains Cafe24; no registrar transfer is required.

### G9 — Custom Domain
After zone is active:
- attach zgmini.kr to Production Worker as Custom Domain
- do not leave conflicting CNAME on the same hostname
- verify certificate issuance and HTTPS

### G10 — Post-cutover smoke test
Minimum:
- /
- 8 detail pages
- /api/market-score
- representative detail APIs
- /sitemap.xml
- /robots.txt
- static assets
- PC/mobile rendering
- canonical URLs
- no redirect loop
- no 5xx
- no 1102
- no write-guard regression
- current data parity

### G11 — Rollback readiness
Rollback trigger examples:
- persistent 5xx/1102
- target D1 parity failure
- missing critical DNS record
- certificate/custom-domain failure
- Production data writer corruption or write routing error

Rollback means restore the last known working DNS/hosting path and leave the migrated target isolated for diagnosis.

## Current blocker classification

Resolved since the original R9 document:
- Sites D1 recovery/export path
- target Free 2DB creation/import
- candidate DB binding/routing
- hosted candidate build/deploy
- Queue CPU optimization
- 9/9 stored projection creation
- fixed projection rows_read=1

Current BLOCKER:
- R6 final source freeze / final delta capture has not been executed.
- The authoritative Sites source is still live and can continue to drift from the imported target pair.
- Production Worker source/config is prepared in GitHub but must not be activated before final source parity and controlled writer probe.

Deferred until R6 parity/writer probe PASS:
- Cloudflare Production Worker activation
- Cafe24 -> Cloudflare nameserver cutover
- Custom Domain / TLS activation
- final Production UI/API smoke test
