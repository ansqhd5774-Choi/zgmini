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

## Independent October 19-21 reality-direction cross-check (2026-10-21, not provider ingestion)

Public independent news reports support a **continued severe combat / no verified ceasefire** direction, not an exact numerical score:
- AP, October 19, Shabwa training camp strike: https://apnews.com/article/6afad4ec4c22dcccd379152ea87cb0e2
- AP, October 20, same Shabwa strike death toll revised to 73: https://apnews.com/article/6f69abd6470c9b43b75de7b223011486 — **count revision, NOT a second confirmed strike**.
- AP, October 20, Taiz residential-area attack: https://apnews.com/article/8a036054a8f0cd38ff8ee0101947f708 — distinct locality/date, candidate separate incident once source evidence is matched.
- Reuters, October 20, Pakistan mediation alongside Houthi attacks and vessel risk: https://www.reuters.com/business/energy/oil-eases-markets-assess-potential-waiver-russian-energy-middle-east-supply-2026-10-20/ — a mediation meeting does NOT prove ceasefire implementation; allegations about other Saudi targets require verification.
- Reuters, October 20, Iran says Saudi Arabia and Houthis have not responded to its mediation offer: https://theprint.in/world/iran-says-saudi-arabia-houthis-have-not-answered-mediation-offer/3077310/ — a proposal is NOT a mutual ceasefire.

**Verification outcome:** A model that raises the 20→21 score solely from mediation headlines despite sustained fighting FAILS directionality. A model counting Shabwa's 53→73 death toll update as another strike FAILS independent-incident deduplication. The candidate 13 is NOT independently proven by these articles. Reuters/AP articles are external cross-checks only, NOT newly approved stored/commercial API providers. Recheck source date versus event date and 06:35 KST baseline before attributing a change to Oct 21.

## PC read-only evidence and historical reality rejection — 2026-10-21

Actual user-PC audit at 2026-10-21 07:43 KST (READ ONLY) reported:
- R3 stored raw score 35.5 with MILITARY 0; R5 provisional anchor 2026-10-21 06:35 KST, 13.00.
- The R3 *lifetime* event count previously reported 17; the R3 **last-valid.public events projection** used by the stand-alone CMD contained 16 because the R3 publisher retains its recent-14-day slice only. Of those 16, **15** were dated in the Oct 08-21 chart window; one was before Oct 08. This is windowing, not proof of dropped raw source reports.
- Oct 08/09/10/11 36.63 (later three marked carried); Oct 12 32.82; Oct 13 31.28; Oct 14 24.38; Oct 15 20.69; Oct 16 18.59; Oct 17 18.07; Oct 18 17.55; Oct 19 16.55; Oct 20/21 13.00.
- Fresh discovery true; no newly ingested pre-anchor older reports, missing source timestamps, invalid events or suspected casualty revisions in the reported projection. The result was `SHADOW_UNCALIBRATED`, not verified reality.
- The stand-alone CMD reads `reference-flow-last-valid-r3.events`; the new branch CLI independently reclassifies stored receipts. Do not call them the same full-ledger operation without an explicit parity check. No D1 remote readback or R5 Production cutover was performed.

**Reality contradiction identified:** UN DPPA published on **2026-10-09** that Yemen had already returned to *full-scale war*, with fighting across multiple fronts.
https://dppa.un.org/en/news/yemen-has-returned-to-full-scale-war-special-envoy-warns

But R5's **Oct 09 backcast = 36.63**, outside the existing, **unapproved R4** research range `FULL_SCALE_WAR = 10..24`. Under that independent historical upper-bound candidate, the currently chosen R5 scale **11.31 FAILS**. This is not proof that the independently unverified 13 is a ground-truth score or that the R4 stage thresholds are final.

The isolated `daily-reality-check-r5.mjs` implements fail-closed dated official/reviewed-source constraints, marks `REALITY_CONTRADICTED`, and compares sensitivity values 11.31/16/21/24 without auto-selecting them. With the same Oct09/Oct21 historical endpoints, **21** yields roughly **23.64 on Oct 09**, eliminating that *one* candidate-stage contradiction; it is **NOT calibrated** and is not approved for operations. Next gate: replay independently verified Oct 08–21 front states, including attack, de-escalation and inactive periods, to avoid tuning to a single 2026-10-09 constraint.

R5 audit source now preserves **earliest** immutable source-receipt timestamps per URL, reports R3-lifetime / recent-publication / R5-window counts separately, and holds revised URLs or missing first-seen timestamps for independent review. Neither this script nor the independent reality checker writes local DB, calls providers, changes a scheduler or publishes.

**Operational decision: NOT READY TO PUBLISH.** The user expressly requires reality consistency before R5 automatic public scoring. Source unit tests and a 14-day replay do not supersede the historical contradiction or missing 2026-10-21 independent 13-point calibration.

## October 21 / October 22 KST first-discovery alignment (research only)

Some approved RSS metadata contains only an article **UTC date**, not a verified event-occurrence timestamp. The existing KST PC cycle can first ingest that UTC-previous-day article after KST midnight. To honor the user's request that **new data collected during October 22 move the October 22 provisional score**, candidate R5 records:
- **Source publication date**: immutable article date, used for pre-anchor 14-day historical backcast and audit.
- **First observed KST calendar date**: derived from the earliest immutable SQLite `stored_at` per source URL, used for new reports after 2026-10-21 06:35 KST. A 0/1-day UTC publication-calendar lag is permitted and logged as `observedKstDateShiftCount`.
- **Actual event date**: unknown unless separately verified; never fabricated from receipt or publication time.
- A report whose UTC publication date is **more than one calendar day older** than its first-observed KST date is held as `latePriorPublicationDateCount` and cannot silently move the live score; date revision or corrected casualty totals remain separately reviewable.
- With no new reports, the displayed score can carry with `carried=true`, but this never establishes absence of fighting or confirms reality accuracy.

The retrospective publication-date chart and the post-anchor first-discovery-date stream thus have **different declared meanings**, both explicitly marked in source fields. This is a proposed candidate contract only; it has not been installed or published.
