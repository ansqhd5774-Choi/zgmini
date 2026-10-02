# R7 validation

Candidate only: zgmini-migration-candidate-r5, version 565d438c-8c40-40d7-9d87-ececab4e35d1, deployment 2026-10-02T12:13:04.045Z, 100% traffic. Official Wrangler deployment list verified. No Production/DNS/D1/main changes or Git integration activation.

- Original and isolated clean-copy builds PASS. Clean npm ci installed 673 locked packages, then both rendering/final builds passed, all 9 HTML/RSC pairs generated, client assets identical.
- Tests 7/7 PASS in both environments; candidate contract PASS; main CI branch rejected; git diff --check PASS.
- Live 36 HTML/RSC GET/HEAD checks PASS, exact byte equality with generated artifacts, correct MIME, x-zgmini-ssr=bypassed and artifact-path headers. Four mutation methods return403.
- Wrapper guard precedes staticShell; no scheduled/queue/alarm export. Missing artifact fails503 without SSR fallback. APIs remain dynamic/unbound503, session200, staticasset200.
- PC1440 and mobile390: no document horizontal overflow, console errors0 observed, 8 detail tables present. Root period button and informational disclosure toggle worked. Client GET API requests observed; unbound DB APIs503 are expected. Actual data-point hover remains UNVERIFIED_D1_UNBOUND; no fabricated chart values.
- Date/locale check: initial Home view dashboard. getDDay runs in detail/data view content, absent from initial static dashboard view. Fixed makeSeries local date constructor preserves calendar labels. No source hydration changes needed in this candidate. Browser console observation found no hydration mismatch.
- R5 approved number-only UI remains: gauge DOM/CSS0, status0, value — in D1-unbound candidate.
- Windows clean install/build is actual evidence; hosted Cloudflare Linux build is not executed. Git integration remains OFF.
- Existing dependency deprecation/install-script warnings and duplicated static/dynamic slot import are NON_BLOCKING; build and required checks pass without dependency updates.

Production application source diff against de0504f remains empty for app/lib/db/worker/index.ts/middleware.ts. GitHub main remains 7369d8d203f084bed8f9d766fc0952d42b972c7b. Candidate guard/UI modifications are build plugins and candidate entry files only.
