# Candidate Workers Builds recipe (integration OFF)

- Repository: ansqhd5774-Choi/zgmini; root: /
- Deploy branch: migration/cloudflare-workers-r1 ONLY; other branch previews OFF; main excluded.
- Install: npm ci (clean lockfile install; do not use Sites install:ci).
- Build: node scripts/build-candidate-r7.mjs && node --test scripts/candidate-guard.test.mjs scripts/candidate-shell-r7.test.mjs && node scripts/check-candidate-r5.mjs
- Deploy: node scripts/candidate-branch-gate.mjs && node scripts/check-candidate-r5.mjs && node node_modules/wrangler/bin/wrangler.js deploy --config dist/server/wrangler.json
- Node >=22.13; WORKERS_CI_BRANCH and WORKERS_CI_COMMIT_SHA are build metadata, never runtime guard switches.
- Candidate name zgmini-migration-candidate-r5. Production name/config remain separate and unassigned here.
- Cloudflare-managed deploy credential only; application secrets none, D1 none, Cron none.
- Branch gate rejects main and contradictory CI/local branch, permits detached CI checkout only with the expected branch metadata.
- Local renderer uses compatibility-date 2026-05-22 because pinned local Workerd cannot run 2026-09-01. Final deployed candidate remains 2026-09-01. Build-time HTML/RSC and identical client asset hashes are checked.
- This document is a configuration recipe, not an activated Git integration. Linux Workers Builds execution remains unverified until integration is explicitly enabled.

## Deferred risks

D1-bound detail APIs remain unprofiled: readStoredMarketInputs -> seven stored input reads -> gunzipSync / JSON.parse -> detail history/percentile calculations. No formula, payload, history, schema or DB write changed.

CANDIDATE_SELECT_ONLY_STORE_REQUIRED: marketOperationalStore.readInput invokes initialize with CREATE TABLE IF NOT EXISTS. SELECT-only candidate boundary will reject it. Keep the guard strict; prepare a separate SELECT-only store in a future authorized task. Production store untouched.

## Official references reused from R6

https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/
https://developers.cloudflare.com/workers/ci-cd/builds/build-image/
