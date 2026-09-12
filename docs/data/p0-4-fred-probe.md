# P0-4 internal FRED transport probe

Route: GET /api/internal/p0-fred-transport-check; no query parameters.
Base remote main verified c8c6eb12e748dc1430f57efdfcdd62096cf72663. Separate data/p0-4-fred-probe worktree. P0-2 route/providers/Payroll adapter copied byte-exact; original worktree untouched.

Only production Vite build plus HTTPS non-loopback request with platform request.cf.colo permits native fetch. Existing internal diagnostic factory/fixture separation is retained; earlier diagnostics' unconditional runtime:true is deliberately not used as deployment evidence. Sites ingress metadata has not been production verified: missing cf fails closed, no outbound.

Exactly three fixed targets: fredUrl('DGS10'), FRED robots.txt, example.com. Redirect manual, no retries, 8000ms total per request, 256KiB streaming cap. No raw body/headers/error text/secrets returned. No BLS or market-data call.

Memory results cached 15min, concurrent calls coalesced per isolate. Platform Cache API stores sanitized result for 900 seconds across isolate reuse within its cache locality. No global cross-colo exactly-once guarantee; perform one authorized request, do not fan out across regions. No new storage bindings or configuration.

Expiry: 2026-09-19T23:59:59Z (checked before cache; 410 thereafter). Cache/query cannot bypass expiry. Remove route after diagnosis.

Tests: all probes use injected fixtures, zero real FRED/BLS calls. Related tests include full UI hashes, P0-2 hashes, unchanged buildSummary, public contract and Payroll semantics. Existing full suite failures: four incompatible Miniflare constructor fixtures, two absent dist artifact checks. No unrelated fixes or installation.

Production runtime remains UNVERIFIED. No deployment executed. After resolving release checks, Sites deployment and ONE manual transport probe are needed; do not invoke market-data automatically.
