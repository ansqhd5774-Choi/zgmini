# ZGMINI R7 — GPT Parallel Static Shell Audit

Baseline reviewed: migration/cloudflare-workers-r1 @ 8a69b7f lineage.

## Confirmed
- app/layout.tsx has no request-time headers/cookies/server fetch and is structurally compatible with build-time static HTML.
- The 8 detail pages reviewed earlier are synchronous shells; their data is fetched by client panels after hydration.
- worker/candidate-r5.ts currently sends only extension-based static files (css/js/svg/png/jpg/webp/ico/xml/txt) to ASSETS.
- HTML routes such as /, /inflation/, /recession/ therefore always fall through to vinext handler.fetch(), which matches R6 SSR CPU evidence.
- Static shell optimization therefore requires BOTH:
  1. build-time HTML/RSC artifacts for an explicit allowlist, and
  2. candidate-worker path dispatch that maps those 9 page routes to the generated asset artifacts before handler.fetch().
- candidateRequest/write guard must remain outside and before this fast path.
- Production canonical middleware is already neutralized by the candidate-only transform; it is not the CPU target.

## Candidate-only implementation constraint
Do not guess artifact filenames. After Vinext prerender/build, enumerate the actual generated asset paths and create the route map from verified artifacts. If HTML exists but RSC/navigation artifacts do not, validate client navigation behavior before declaring PASS.

## Safety
- No Production source edits.
- No D1/DNS/main changes.
- No loosening of read-only/write guard.
- No global static export; allowlist only.

## Parallel conclusion
R7's minimum viable code change is localized to candidate build/prerender plumbing and candidate worker HTML route dispatch. Application data APIs and scoring logic do not need to change for the SSR CPU test.
