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
