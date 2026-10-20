# Iran R5 — 2026-10-21 reality-anchor daily SHADOW

Status: CANDIDATE / NO PRODUCTION CHANGE / NO D1 WRITES

## Goal
1. User's **2026-10-21 06:35 KST** 13-point provisional assessment is the reference (2026-10-20T21:35:00Z), not the older 19 and not independently verified ground truth. **It is not an end-of-day final.**
2. Back-calculate 14 KST calendar days using deduplicated actual stored report-date deltas. With no accepted October 21 reports, **October 20 is also 13**; the October 20 attack/interception changes October 19 to October 20, not October 20 to October 21. Do not shift publication dates.
3. New **Oct 21 same-day articles stored after 06:35** update that day's provisional value; Oct 21 articles already stored by 06:35 are included in the baseline and are not double-applied. From Oct 22 onward, use uniquely dated incremental events and deterministically rebuild. Do not reset every day, double-add across 00/06/12/18 cycles, or infer absence of fighting from silence. Any newly discovered article published **before** Oct 21 is held for retroactive-correction review instead of silently changing the baseline.
4. An article's publication date is not asserted to be its occurrence date.

## Unapproved numerical candidate
Use the existing R3 event stage deltas and five weights 30/25/20/15/10. The daily change is the sum of negative weighted independently deduplicated reports plus **only independently verified** substantial implementation improvements (actual effective ceasefire, withdrawal, maritime reopening, nuclear agreement, restored inspections). Talks or proposed agreements are not proof of peace. A day with adverse and positive evidence cannot yield a positive net change. Newly stored **prior-date** publications require separate correction review.

Apply the signed event changes on a bounded log-odds scale to avoid the existing R3 domain's hard military floor:
- p = 0.13, z0 = ln(p/(1-p)).
- k = 100*p*(1-p) = 11.31, selected to give unit local derivative at the anchor; this is a candidate mathematical normalization, NOT validated reality calibration.
- For Oct 21 after 06:35: z(Oct21 current) = z0 + sum(new Oct21 receipts stored AFTER 06:35) / k; same-day worsening blocks net-positive escalation.
- For d after Oct 21: z(d) = z(Oct21 current) + sum(weightedDelta on days Oct22 through d) / k.
- For d before Oct 21: z(d) = z0 - sum(weightedDelta on days d+1 through Oct21) / k.
- score(d) = round(100*logistic(z(d)), 2).

This is a *shadow algorithm*, not evidence that 13 or its past points are objectively true. It can still lose resolution near numeric extremes and responds to reported event counts, not proven war intensity. The 28-day verified-front R4 model requires separate completion; do not weaken its proof gates.

## Source and failure policy
Existing local SQLite (sources, decisions, checkpoints) read **ONLY** with the current R3 acceptance, migration and possible-duplicate resolution. Do not add any new provider, copy raw reports into GitHub, change PC/D1 schema/weights/scheduler, or publish. Negative headlines remain *single-source reported* events, not confirmed independent attacks.

Unobserved days use the last model value with a 'carried' flag and are not observed peaceful days. Where the baseline's own day has fresh receipts, its provisional score updates that same day, and the 14-day earlier dates retain their event-based backcast. R3 collection checkpoint older than 24 hours or missing -> preview returns null preliminaryScore and explicit SHADOW_INPUT_STALE_OR_MISSING. Independently unverified positive headlines never raise the estimate, and adverse events prevent simultaneous optimistic upward movement.

## How to execute (only after a source checkout containing this branch exists)
From checkout root:
E:\ZGmini\runtime\node.exe scripts\iran-progress\audit-daily-shadow-r5.mjs --db=E:\ZGmini\data\iran-progress-r13\iran.sqlite

JSON stdout: 14 KST calendar days, accepted counts, score, carried/freshness and warnings; no article bodies, source URLs or credentials printed. A wrapper CMD should save to the *CMD's own folder* and overwrite old TXT, not use %TEMP%. This read-only command has NOT been run on the user's PC.

## Acceptance gates
1. Oct 20 reports decrease 19->20; if no Oct21 report, Oct20=Oct21=13.
2. Oct22 unique adverse event decreases score even with R3 military domain at zero, but never double-counts identical eventKey.
3. Optimistic unverified negotiations produce no upward move. Same-day actual worsening + verified good news cannot produce a net increase.
4. Collector failure is not a peace signal; preserve last valid published number without claiming freshness.
5. Test same-PC stored SQLite *shadow*; independently re-evaluate actual contemporary war state before treating numeric outputs as reality, then user approval of scoring contract, then scoped operational cutover and D1/API/UI readback. CI PASS never means PC/Production PASS.
