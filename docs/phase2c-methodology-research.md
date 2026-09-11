# PHASE 2C methodology research (not production methodology)

The existing temporary `/api/internal/phase2-korea-history-check` response adds a
`methodology` section. It consumes the same in-memory FSC and BOK observations;
there are no new upstream requests. Raw histories never enter this section's
output. The existing 2026-10-11 UTC expiry still applies.

## Candidate definitions

| Axis | Candidates |
| --- | --- |
| Leverage | 20-observation change P252; 60-change P252; 60/40 blend of those scores; winsorized 20-change Z252 |
| Liquidation | level P252; log1p(level) P252; winsorized level P252; all inverted to Greed direction |
| Credit stress | level P252; level P504; level Z252; 50/50 level-P252 / change20-P252 blend; all inverted |
| USD/KRW | level P252 and change20 P252, inverted; auxiliary comparisons only |

P252/P504 are trailing percentile windows including the current observation.
Rank is `100 * (less + (equal-1)/2) / (n-1)`; tied values use average rank and
constant windows yield 50. Z252 uses population standard deviation, clips z to
[-3,3], and maps through `50 + 50*z/3`. Zero variance yields no z-score.
Winsorization uses the same trailing window's interpolated p01/p99, never the
full sample. These parameters are explicit research assumptions, not final choices.

The first 251/503 observations have no score. Change candidates additionally need
their 20/60-observation horizon. Missing/nonfinite values invalidate a window;
there is no shorter-window fallback. Nonpositive percentage-change denominators
are excluded; negative liquidation amounts are invalid. Negative credit spreads
remain valid for level normalization. Changes across nonpositive spread baselines
cannot be used in the change-percentile candidate.

Log1p is monotonic and therefore normally leaves percentile ranks unchanged.
The output reports maximum score difference instead of claiming new information.
Winsorization similarly mainly changes tail ties when followed by percentile.

## Models and coverage

For a controlled weight comparison, all models use the **illustrative** bundle
LEV_BLEND20_60 / LIQ_LEVEL_P252 / SPREAD_LEVEL_P252. It is not a selected optimum.
Candidate-level summaries and cross-axis Pearson/Spearman correlations compare
the other normalizations independently; not every normalization/weight Cartesian
combination is run.

- A: exact equal thirds (avoids 33.33% rounding loss).
- B: 40/35/25.
- C: 35/35/30.
- Grid: every sum-to-100 triple from 20% to 50% in 5-point increments.

Identical weight calculations are cached within one evaluation. Nothing ranks
weights as best. Model quality includes usable dates, score distribution, <20/>80
frequencies, absolute consecutive-observation jumps, and lag-5/20 autocorrelation.
No benchmark exists to measure actual crisis reaction lag or predictive validity.

Strict coverage requires all three components on the exact date. Alternative
coverage permits exactly one unavailable/stale component and renormalizes the
remaining weights. No forward fill, interpolation or carrying stale observations
occurs. Two missing components never yield a score. Explicit stale input flags
are missing; actual acquired histories are aligned on their observed dates.
The alternative's coverage is reported, not selected as production policy.

Top/bottom ten dates, composite scores and ordered component scores are emitted
for A/B/C. The grid emits quality and coverage only to bound output. No event names
or raw financial values are attached. A four-axis equal-weight comparison is
provided separately for each FX normalization; this does not establish incremental
information without an external validation target.

All score-change and autocorrelation horizons are observations, not interpolated
calendar days. Missing score slots break consecutive change pairs. Component
correlations align exact dates and warn at absolute Pearson or Spearman >=0.80;
they never automatically reject a candidate. Pair counts accompany correlations.

## Rights and limitations

FSC source eligibility is recorded as confirmed **per the research brief**. BOK
spread and FX remain rights-unconfirmed / productionEligible=false. Every composite
and the entire methodology result remains productionEligible=false, including the
alternative missing-component policy. Final weights remain null. CCSI, CMA,
liquidation ratio and KOSIS PHASE 1 series are excluded.

Rolling scores never use future observations. This does not establish a true
point-in-time backtest: historical publication dates and revision vintages were
not supplied. Summary metrics may describe the full research sample but never
feed back into historical normalization windows.

This implementation does not publish an index endpoint, connect UI, persist to
Supabase, resolve BOK rights or select a final formula. Runtime results remain
unverified until separately authorized evaluation.
