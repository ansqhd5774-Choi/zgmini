# R5 candidate runtime evidence

## Result
PARTIAL_CANDIDATE_RUNTIME. DB-less deployment and public rendering passed. Database APIs deliberately return 503 CANDIDATE_DB_UNBOUND. D1 recovery remains SUPPORT_REQUIRED. No cutover performed.

## Deployment
- Worker: zgmini-migration-candidate-r5
- URL: https://zgmini-migration-candidate-r5.ansqhd5774.workers.dev
- Active version: b22b191f-85fa-4f96-9297-088627266138, traffic 100%
- Version created: 2026-10-02T11:33:46.787Z; deployment created: 2026-10-02T11:33:47.974Z
- Account: 6e9b57e718b247330a6efa42a9516e95; Workers Free confirmed in dashboard.
- Only binding: ASSETS. Secrets list [], routes [], custom domains absent, cron configuration []. No scheduled handler.
- Local build exit 0, duration 13.5641529 seconds; generated configuration contract PASS. Sites plugin not included.
- Upload 5196.45 KiB, gzip 1000.53 KiB; startup 18ms (NOT request CPU).
- Asset directory scan 41 files; initial upload 36 assets, final upload no changed assets.
- Local detailed build/deploy logs: work/r5-build.log, work/r5-deploy.log (ignored work directory).

## Live HTTP and browser
Final probe evidence: http-runtime.json, observed 2026-10-02T11:37:03.458Z.
- Dashboard and inflation/recession/asset-bubble detail pages: 200 HTML.
- All 11 dashboard JS/CSS links and /flags/us.svg: 200; CSS gauge selector absent.
- Candidate status and anonymous session: 200. Three DB APIs: 503 with explicit unavailable reason.
- POST/PUT/PATCH/DELETE and tested internal/auth/favorites/session paths: 403.
- Probe found no credential/stack patterns; this is a bounded response check, not an exhaustive security audit.
- Chrome visual check: PC 1440x1000 and mobile 390x844 rendered successfully, no horizontal overflow. Composite number is —; gauge DOM count 0; number status span count 0. PC scroll width 1440; mobile document width 375 within viewport390. Viewport override reset.
- Other existing market gauges retained. Chart's separate missing-history notice retained.
- First deployment had static paths incorrectly redirected to trailing slashes. Fixed candidate ASSETS dispatch and re-deployed; final assets all200. Candidate canonical middleware shim prevents redirects to Production; original application middleware untouched.

## Actual Free runtime metrics
Cloudflare candidate Metrics / Last24hours / all deployed versions, read after live tests:
- Invocations80 (active version49, previous candidate31); errors0, exceeded CPU errors0.
- Subrequests25 aggregate; asset requests26, asset2xx26, asset3xx/4xx/5xx0.
- Active version median CPU0.63ms. All-version CPU P50 0.67ms / P90 7.83ms / P99 79.52ms / P99979.52ms.
- Account requests today81/100000, Workers Build minutes0 (build executed locally).
- FREE_PLAN_RUNTIME: FAIL for measured P99 exceeding10ms. Median pass and zero CPU-limit errors do not establish Free suitability. Per-request subrequest maximum and CPU maximum not available; do not equate aggregate25 to per-request maximum.
- D1 read/write caused by candidate:0 by absence of DB binding and fail-closed API interception. Account D1 GUI precheck showed databases0/read0/write0. Existing Sites database counters not accessible; no claim that ongoing writer counters stopped changing.
- Candidate cron0, no scheduler export. Existing scheduler untouched.

## Production isolation
- Official Sites get_site after candidate deploy: active, latest version377, live https://zgmini.kr.
- Public DNS CNAME after deploy: zgmini.kr -> custom-domains.chatgpt.site.
- Existing Cloudflare scheduler version before/after: 665f819a-b21a-4360-a8ff-48fcd1ae2beb, unchanged.
- GitHub main before/after: 7369d8d203f084bed8f9d766fc0952d42b972c7b.
- Git diff of app/lib/db/worker/index.ts/middleware.ts against de0504f191ab2ba5e0bdbdebd312f162f25f035e empty. UI and middleware changes are candidate build transforms only.
- No Sites save/deploy, DB operations, DNS updates, existing Worker updates, secret changes, scheduler activation or writer stop executed. Production writer runtime progress not separately measured; it was neither stopped nor reconfigured.

## Next
STOP after R5 report. D1 recovery requires support. CPU tail suitability requires a separately scoped investigation before Free production approval. No Production/DNS/D1 transition authorized by R5.

Post-deploy Cloudflare Settings: no runtime variables/secrets; No cron triggers configured; no queue consumers. Guard unit tests5/5 PASS, final contract PASS, git diff --check PASS.
