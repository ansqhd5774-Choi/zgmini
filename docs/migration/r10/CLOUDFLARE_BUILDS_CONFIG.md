# ZGMINI Cloudflare R10 — Hosted Builds Configuration

Baseline: migration/cloudflare-workers-r1 after R9 merge.

## Goal
Prepare a single, branch-gated build/deploy entrypoint for Cloudflare Workers Builds.
No Production Worker, DNS, D1, or main branch changes are made by this preparation.

## Cloudflare Builds settings

Repository:
- ansqhd5774-Choi/zgmini

Production branch for this candidate integration:
- migration/cloudflare-workers-r1

Root directory:
- /

Install command:
- npm ci

Build command:
- npm run candidate:build:ci

Deploy command:
- npm run candidate:deploy:ci

Node:
- >=22.13.0

## Branch safety
The repository script `candidate-branch-gate.mjs` requires:
- local branch migration/cloudflare-workers-r1, OR
- detached HEAD with WORKERS_CI_BRANCH=migration/cloudflare-workers-r1

Any other branch is rejected.

Do not enable preview deployments for other branches.

## Candidate-only contract
The generated deployment must retain:
- Worker name: zgmini-migration-candidate-r5
- workers.dev: enabled
- custom routes: none
- custom domains: none
- cron: none
- D1: none until recovery/import is authorized
- runtime vars/secrets: none for the DB-unbound candidate
- static shell allowlist: 9 routes
- read/write guard unchanged

## Build command behavior
`candidate:build:ci` performs:
1. branch gate
2. candidate guard tests
3. Vite candidate build
4. generated deployment contract check

The contract check rejects:
- wrong Worker name/account
- D1 binding
- route/cron/service additions
- missing write guard
- reintroduced composite gauge CSS
- drift in authoritative Production app/lib/db/worker/index.ts/middleware.ts

## Deploy command behavior
`candidate:deploy:ci` performs:
1. branch gate
2. Wrangler deploy using generated dist/server/wrangler.json

It must only be enabled after the Cloudflare Git integration is explicitly pointed at the migration branch.

## First hosted-run evidence required
After enabling the integration, record:
- Git commit SHA
- WORKERS_CI_BRANCH
- install/build/deploy exit status
- build duration
- deployed Worker version ID
- workers.dev URL
- bindings/routes/crons/secrets summary
- static shell smoke
- write guard smoke

The first hosted run is validation only. It is not Production cutover.

## Current status
CONFIG_PREPARED.
Hosted Linux run remains NOT_EXECUTED until the Cloudflare Git integration is enabled.
