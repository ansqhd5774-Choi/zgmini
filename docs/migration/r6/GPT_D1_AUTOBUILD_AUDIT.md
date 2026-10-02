# ZGMINI Cloudflare R6 — Candidate D1/Auto-Build Audit

## Scope
Static analysis against migration baseline b696afd. No runtime or Production changes.

## Candidate D1-bound risk
R5 intentionally had no D1 binding, so the live tests did not exercise the real detail API read path.

When D1 is later bound, the current detail API path has an important fail-closed interaction:
- detail APIs call `readStoredMarketInputs(store)`
- `store.readInput()` calls `marketOperationalStore().initialize()`
- initialize issues four `CREATE TABLE IF NOT EXISTS` statements
- candidate `readOnlyDatabase()` only permits SQL beginning with SELECT and rejects CREATE

Therefore, a D1-bound candidate using the current guard is expected to reject detail API reads that call `readInput()` unless the read path is separated from schema initialization.

This is a migration/candidate concern, not evidence of a Production bug.

## Safe candidate-only fix direction
Do not loosen the SQL guard.
Instead, introduce a read-only operational store for candidate use that:
- never calls schema initialization
- implements only readScore/readInput needed by public GET routes
- uses SELECT-only statements
- preserves existing decode/TTL semantics
- has no write/claim/finish methods

Alternative: refactor Production store so readInput does not initialize schema, but this is broader and should only be done with explicit tests because it changes Production behavior.

## Automatic Build/Deploy readiness
The candidate repo already has enough pieces for Cloudflare Workers Builds:
- package lock committed
- Node >=22.13.0 declared
- candidate Vite config exists
- candidate Wrangler config exists
- worker name isolated from Production
- no custom domains/routes/crons/D1 binding in R5 candidate
- build completed locally

Current suitable candidate commands:
- install: `npm ci`
- build: `npx vite build --config vite.candidate-r5.config.ts`
- deploy artifact: use the generated `dist/server/wrangler.json` with Wrangler

Before enabling Git auto-deploy:
1. keep branch filter on migration branch, not main
2. keep candidate worker name separate
3. do not add D1/secrets/routes/crons
4. preserve workers.dev only
5. add post-build contract validation equivalent to check-candidate-r5.mjs
6. only switch main after source reconciliation and D1/cutover approval

## Free-plan relevance
The R5 candidate has no D1, so CPU evidence mainly covers framework/page/static behavior and guard overhead. It does not measure:
- gzip decode of stored inputs
- JSON parse of stored macro/credit/supply batches
- historical diagnostic recomputation
- D1 query CPU/rows

A future D1-bound read-only candidate should profile those paths independently.

## Recommended priority
1. route/version-isolated CPU measurement
2. candidate read-only store separation before D1 binding
3. if detail APIs are heavy, precompute and store final public detail payloads
4. then enable migration-branch Workers Builds
5. defer main auto-deploy and custom domain until cutover approval
