# ZGMINI Cloudflare R11 — Hosted Build First-Run Validation

Baseline: migration/cloudflare-workers-r1 @ 08522c8633a27dc3dbc0b5a8a68454de36758c83

## Goal
Validate Cloudflare Workers Builds once against the migration candidate branch only.
This is not Production cutover.

## Preconditions
- R10 HOSTED_BUILD_INTEGRATION_READY
- D1 remains unbound
- custom domains/routes/crons remain absent
- candidate Worker remains zgmini-migration-candidate-r5
- Production/DNS/main unchanged

## Cloudflare Git integration
Connect:
- repository: ansqhd5774-Choi/zgmini
- branch: migration/cloudflare-workers-r1
- install: npm ci
- build: npm run candidate:build:ci
- deploy: npm run candidate:deploy:ci

Disable preview builds for other branches.

## First hosted-run evidence
Record:
- source commit SHA
- WORKERS_CI_BRANCH
- Node version
- npm ci exit
- candidate:build:ci exit
- shell artifacts 9 HTML + 9 RSC
- candidate guard tests
- generated Wrangler contract
- deploy exit
- deployed Worker version ID
- workers.dev URL
- bindings/routes/crons/services/vars summary

## Live smoke after hosted deploy
Required:
- /
- /inflation/
- /recession/
- /liquidity-crisis/
- /credit-risk/
- /earnings-recession/
- /asset-bubble/
- /debt-risk/
- /supply-shock/
- /api/session
- /flags/us.svg

Expected:
- page shells 200
- x-zgmini-ssr=bypassed
- D1-dependent APIs remain 503 CANDIDATE_DB_UNBOUND
- mutation/internal/auth/favorites writes remain blocked
- runtime errors 0

## CPU spot-check
Because the code is unchanged from R7/R10, a full 31-sample rerun is not mandatory for this hosted-build gate unless deployed output differs.
Minimum:
- root
- one representative detail page
- /api/session
- one static asset

If generated bundle/hash differs materially from validated R10 output, repeat the full R7 CPU workload.

## PASS
HOSTED_BUILD_RUNTIME_PASS when:
- Cloudflare Linux install/build/deploy all pass
- source branch/commit are correct
- 9 shell pairs exist
- candidate only is deployed
- live smoke passes
- Production/DNS/D1/main unchanged

## FAIL
Stop if:
- branch mismatch
- shell artifact missing
- wrong Worker target
- D1/custom-domain/cron/route unexpectedly appears
- write guard fails
- Production changes occur

## Next
After PASS, hosted build is no longer a pending migration gate.
The next material blocker remains existing Sites D1 recovery/export.
