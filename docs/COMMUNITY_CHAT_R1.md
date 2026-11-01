# ZGMINI dashboard community chat — R1 branch-only
Date: 2026-10-19. Branch: feat/dashboard-live-chat-r1-20261019.

## Contract
- A fixed message button on dashboard toggles one floating panel.
- Entry animation slides left-to-right; exit slides toward the right.
- Desktop/mobile share one public chatroom; 300 Unicode codepoint maximum per message; short anonymous session nickname.
- GET last 50 public messages, poll every 5 seconds **only while panel is open**. This is near-real-time polling, NOT a WebSocket live guarantee.
- POST is disabled until the D1 tables and `COMMUNITY_CHAT_HASH_SECRET` are separately configured; no sample messages or false online indicator.
- Same-origin JSON POST, strict input validation, block outbound links, hash Cloudflare source IP with deployment secret, rate cap 3/min and 100/day.
- Message contents are displayed as text (not HTML).

## Gates BEFORE production
1. Branch CI: Node regression tests, TypeScript, build, responsive UI screenshots at 390/768/1440/1920, actual left-to-right opening and rightward closing, keyboard focus and reduced motion.
2. **Separate production approval** for the new D1 migration; execute migration on controlled target, verify new tables and rollback plan. Do not modify existing score tables.
3. Configure `COMMUNITY_CHAT_HASH_SECRET` as a Cloudflare secret, not in Git. Without it sending remains disabled.
4. Implement/verify user reporting, admin hide/delete workflow, bot mitigation (Turnstile or WAF), retention policy and a load test before enabling anonymous public write traffic.
5. Validate availability, malformed input, concurrency rate limiting and rate-limiter D1 budgets. No fake PASS.
6. Only after approval and runtime tests consider merging into main; main may auto-deploy. Confirm deployment SHA and production read/write outcomes independently.

## Not complete
- No actual DB migration, Worker secret, live writer, production deployment or public chat test.
- No online count, notifications, threading or WebSocket/Durable Objects.
- D1 and other app score data must remain isolated by separate chat tables.
- Must not label the R1 polling version as instant WebSocket chat.

## R1.1 Moderation proposal
- Reports: authenticated by same-origin plus hashed Cloudflare-IP limit (20 per day). Each visitor may report a particular message once.
- Admin: secret-protected `GET/POST /api/internal/community/moderation` review, hide/restore, or manual purge of messages older than 30 days.
- Provision `COMMUNITY_CHAT_ADMIN_SECRET` via Cloudflare secret store before enabling writes; do not commit secrets. UI report and moderation must be runtime tested.

## R1.2 Turnstile write gate
- Turnstile sitekey (non-secret): `COMMUNITY_CHAT_SITE_KEY`; private Cloudflare binding: `COMMUNITY_CHAT_TURNSTILE_SECRET`. Both plus `COMMUNITY_CHAT_HASH_SECRET` and D1 must be configured to enable posting.
- Each message POST redeems a single-use token with Cloudflare Siteverify. Responses must be `success=true` and the hostname must match the current request hostname. Five-second timeout fails closed.
- Browser widget resets after a send attempt. Use the exact public hostname to register the Turnstile sitekey. Reference: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

## R1.3 Isolation and deployment topology
- Production candidate Worker: `worker/candidate-r52.ts`, with only exactly three explicit community routes dispatched to `worker/community-chat-api-r1.mjs` with **native** environment bindings. All other requests still pass through `candidate2dbWorker` and `candidateRequest`, preserving GET-only/read-only financial data safeguards.
- The old `DB` binding and existing `DB_CORE` and `DB_HISTORY` must **never** store visitor content. Chat uses a **new**, separate D1 binding `DB_COMMUNITY` with its own new database ID. That database does not exist in current checked-in production configuration. Do NOT invent an ID or use a fake placeholder in production.
- Initial chat schema relocated to `docs/community-chat-migrations/0001_init.sql`, outside the financial Drizzle migration chain. Requires creating dedicated Cloudflare D1, deploying its binding, applying migration to exactly that DB and verifying isolated read/write. The DB ID must be recorded in a later config update after verified provision.
- No Cloudflare resource/secret creation can be inferred from passing CI or merging a PR. Production automatic deployment requires confirmed GitHub main→Cloudflare build integration and source/deployment identity readback.
- Public chat cannot be activated until `COMMUNITY_CHAT_HASH_SECRET`, `COMMUNITY_CHAT_SITE_KEY`, `COMMUNITY_CHAT_TURNSTILE_SECRET` and `COMMUNITY_CHAT_ADMIN_SECRET` are securely provisioned and real moderation/abuse tests pass.
