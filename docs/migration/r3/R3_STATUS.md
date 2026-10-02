# R3 status — 2026-10-02

## Status
PARTIAL / D1 RECOVERY BLOCKED. Production, DNS, existing DB writes, Worker deploy, DB create/import and main changes: zero.
Baseline de0504f191ab2ba5e0bdbdebd312f162f25f035e (Production 377 succeeded) remains preserved. Work is on migration/cloudflare-workers-r1.

## D1 evidence and path
NOT_PROVEN. Official Sites overview: binding DB, exact 50 live user table names, no omissions. Official table reader: columns for 48 tables; two table reads unavailable (breadth_r2_raw_v1 and breadth_r2_snapshot_v1). This is not complete sqlite_master DDL/index/FK inventory. See live-db-inventory.json; null counts mean unknown, lower bounds are sample sizes, not estimates of totals.
The returned 50-table list is a bounded viewer inventory, not proof that no additional runtime tables exist: preserved source references public_feed_snapshots_v1 which the viewer list does not return. Complete source DB enumeration still requires the official owner/export path. No unreturned table identifier was guessed into the reader tool.
39 sampled tables nonempty. 34 samples have more rows; their full counts unknown. Database ID/name/account/size and full export authorization unavailable. Authenticated Sites Database GUI confirms connection and table viewer, but displays no database identity/export control. No hidden endpoints or credential extraction used.
Checkpoint sample: kfg_rev7_backfill_progress latest_processed_date=20261001, oldest_processed_date=20220630, rows_processed=989962, status=IDLE. This cumulative processed counter is NOT a current stored row count or maximum across tables. market_collection_jobs_v1 sample COMPLETE, not proof all jobs complete.
Current user Cloudflare account has zero D1 per R2 evidence. This does not identify the Sites owner account. Same-account binding not proven; export/import feasibility for this source not proven. Cloudflare's export API requires source account/database identity and authorized access; generic product support is not proof Sites grants it.

## DNS
DNS_CONTROL_CONFIRMED for current DNS records. whois.kr: registrar Gabia; nameservers ns1.cafe24.com, ns1.cafe24.co.kr, ns2.cafe24.com, ns2.cafe24.co.kr. Public DNS: apex CNAME custom-domains.chatgpt.site; www CNAME zgmini.kr. Authenticated Cafe24 DNS management with zgmini.kr selected displays apex CNAME and Add/Modify/Delete controls; wildcard points to apex. No save/change performed.
Workers Custom Domains require an active Cloudflare zone and conflict with existing CNAME on target hostname. Free full-zone path: add zone, inventory all records, replicate existing Sites records, change registrar nameservers only after approval; keep Sites destination during DNS migration; later cut over target hostname after separate approval. Registrar login/NS edit permission not verified. Registrar transfer is unnecessary. Existing Cafe24 CNAME-only change is not sufficient proof of a supported Workers custom-domain setup.
Official reference: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/

## Auth
AUTH_CONTINUITY_READY for currently stored app identity data: favorite_sentiments has 0 rows (official reader limit25: no rows, has_more=false, no truncation; GUI also says table empty). Source stores opaque user ID only in favorite_sentiments.user_id with unique(user_id,item_key). email/full-name are gateway attributes and operator checks, not DB keys. No app session/user persistence table appears in live 50-table inventory or schema; /api/session is a read-only gateway-header view. This is NOT a claim that upstream ChatGPT has zero registered users.
For the currently empty app table no identity-data migration needed. Recheck at actual cutover because Sites remains writable. If favorites become nonempty: retain opaque IDs unchanged; use a trusted old authenticated session to issue an expiring single-use signed link to the new verified subject, with uniqueness and explicit confirmation. Verified email alone cannot link existing rows because no trusted old ID/email mapping is stored. Do not hash/replace old IDs. Replacement login implementation deferred to approved later phase; public anonymous candidate needs none.

## Candidate guard
Dedicated worker/candidate.ts; original worker/index.ts unchanged. No scheduled/queue/alarm export. Mutation methods and internal/admin/favorites/auth paths blocked before handler. Gateway identity, authorization and cookies stripped; env exposes only wrapped DB and assets, no provider secrets.
Vite pre-transform mediates application cloudflare:workers env imports via candidate-env.ts; unknown native import forms fail build. Framework virtual/dependency modules are excluded from app transform. D1 wrapper permits single SELECT only; DDL/DML/PRAGMA/WITH/comments/multiple statements, run/batch/exec/dump denied before native invocation. No environment variable can enable writes.
5 meaningful tests PASS; build PASS; Wrangler dry-run PASS. Built artifact includes dedicated guard and mediated env. These are local tests/build evidence, not actual Cloudflare runtime verification. Public GET tests exercise wrapper dispatch with fixture handler; real stored core-pce reader also works through SELECT-only wrapper. Rendered dashboard/detail data parity remains unverified. Candidate explicitly retains stored core-pce/data-health reads, without collectors. Conservative SELECT filter can reject legitimate reads; fail closed rather than allow writes.

## Source / approved UI patch
Production app/lib/db/worker baseline files remain unchanged. Main not merged. approved-summary-numbers-only.patch removes only composite summary ring DOM/status span and status wording in its accessibility label; number, missing marker, chart and other gauges preserved. git apply --check PASS against baseline. Patch is prepared, not applied/deployed; rendered PC/mobile verification is pending application.

## Tests / changes
Tests 5/5 PASS; configuration check PASS; build PASS; dry-run PASS. Existing R2 fixture discrepancy reused, not rerun. Warning about mixed dynamic/static imports nonblocking.
Changes: worker/candidate.ts, candidate-env.ts, candidate-guard.mjs; scripts/candidate-import-boundary.mjs, candidate-guard.test.mjs, prepare-approved-summary-patch.mjs, check-cloudflare-migration.mjs; vite.cloudflare.config.ts; wrangler.cloudflare.json; docs/migration/r3/*. No score/schema formula edits.

## Next action
Obtain source D1 identity/access or an official complete SQL export path from Sites owner/support. Read-only viewer is insufficient for lossless export (bounded paging, no transaction snapshot, no complete DDL). Do not deploy or create destination DB while D1 path remains NOT_PROVEN. B2 and B3 resolved for current app data/current DNS; B4 local guard tests passed, actual bound runtime still pending. R3 completion gate not met due B1.
