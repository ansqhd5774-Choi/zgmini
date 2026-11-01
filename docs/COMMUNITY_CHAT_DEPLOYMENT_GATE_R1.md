# ZGMINI Community Chat R1 — Production Release Gate
Date: 2026-10-19. Draft PR #441.

## GitHub implementation evidence
- Native Worker route handler: `worker/community-chat-api-r1.mjs`; three exact community paths only.
- Existing financial public API preserved under `candidate2dbWorker` read-only guard and `DB_CORE` / `DB_HISTORY`; chat must exclusively use `DB_COMMUNITY`.
- Frontend: dashboard-only message icon, right-side slide-out opening from left to right, closing toward right, 300 Unicode-codepoint comments, 5-second polling while open, mobile sizing, reduced motion.
- Security: same-origin POST, Turnstile Siteverify with verified hostname, hashed actor rate limits, report and admin hide/restore controls.
- SQL schema lives exclusively at `docs/community-chat-migrations/0001_init.sql`, never in financial Drizzle migrations.

## Completed static and synthetic validation
- PR #441 latest Node.js CI: GitHub Actions general build, typecheck, regression, PC publication recovery success.
- Candidate Worker test: `Community Chat Candidate Build (Read Only)` compiles both the chat handler and existing financial guard, with neither deploy nor D1 write.
- `Community Chat Browser UI (Mocked API)` validates 390, 768, 1440, and 1920 px; screenshot artifact `community-chat-browser-r1` is in the passing workflow run. Tests use **intercepted mock messages, mock Turnstile and mock reports**, not real D1 or real CAPTCHA.
- CI PASS does not imply a production configured database or effective abuse mitigation.

## Hard-blocked by missing production account operations
1. Confirm the **actual current** Worker, connected GitHub repo/branch, latest main SHA, and Cloudflare auto-build/deploy command/config. Do not assume from repo settings that Cloudflare deployed it.
2. Provision a fresh separate Cloudflare D1 database `zgmini-community-chat-r1` (new real database ID, never a placeholder) within the authorized account. Verify account plan/usage/cost exposure before enabling anonymous writes.
3. Attach D1 as **DB_COMMUNITY** to the same actual public Worker. Append its real `database_id`/name to the correct production deployment config while preserving `DB_CORE` and `DB_HISTORY` bindings, queue, PC collection ownership and cron=0.
4. Apply **only** `docs/community-chat-migrations/0001_init.sql` to DB_COMMUNITY (three tables; no financial table updates) and verify all three exist using readback. Preserve backup/rollback.
5. Provision Cloudflare Turnstile for actual `zgmini.kr` hostname and store `COMMUNITY_CHAT_SITE_KEY` (public setting) and private `COMMUNITY_CHAT_TURNSTILE_SECRET`, `COMMUNITY_CHAT_HASH_SECRET`, `COMMUNITY_CHAT_ADMIN_SECRET` securely in Worker bindings. Never commit secrets or pass them in the chat.
6. Perform real endpoint integration smoke: GET returns stored messages and writeEnabled true, POST with valid Turnstile inserts exactly one message, rejected/expired/cross-origin/foreign hostname tokens fail, four posts per minute reject fourth; report creates exactly one record and admin hide/restore changes public read, unauthorized admin requests fail.
7. Verify actual Cloudflare account usage, D1 row read/write budgeting, anti-spam behavior, messaging viewport, and lifecycle under normal and abusive traffic.
8. Re-check PR #441 vs live main and existing approved operating SHA. Only then mark PR ready and merge to main, letting **existing Cloudflare Git Integration** deploy. Never trigger direct production Wrangler deploy.
9. Confirm exact Cloudflare Build/Deployment SHA matches new main, actual public https://zgmini.kr/ UI and API work after deploy, and existing financial scores/PC writer unchanged. On failure rollback the new Worker SHA; do not touch existing stored financial data.

## Current state
- GitHub branch only; Draft PR maintained; no Cloudflare D1 resource provisioned in this assistant session, no secrets configured, no D1 schema applied, no GitHub main merge, and no production deployment.
- No ability in currently connected ChatGPT tools to administer this Cloudflare account. A GitHub CI success alone does not grant that access.
- Cloudflare reference: https://developers.cloudflare.com/d1/get-started/ and https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/
