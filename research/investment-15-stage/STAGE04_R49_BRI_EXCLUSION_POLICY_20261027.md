# Stage04 R49 — BRI HTTP 403 exclusion policy

2026-10-27, authorized by user: “그렇지. 그렇게하자”.

## Decision

* Research topic: **01 정보기술**, first of the 21 research topics.
* Historical observed evidence: R48 received **HTTP 403** for both the BRI catalog and its report. Do not issue further HTTP requests to BRI. Do not disguise access, rotate identities, use bypass/proxies, or ask for permission to circumvent.
* Write BRI as `SOURCE_BLOCKED_EXCLUDED`, with `selected: null`, and `BRI_NETWORK_REQUESTS=0` for each R49 run. This is a policy-based exclusion of that publisher, **not** a claim that its economic research is unreliable.
* Continue three independently gathered official publisher investigations: **TBRC, SkyQuest, Precedence Research**. Never fill one publisher's value with another publisher's report.
* Record absent CAGR as JSON `null` and TXT `NULL`, never zero. Do not count excluded/missing data in a publisher mean or denominator.
* Do not automatically mix sector and vendor-defined markets. A research mean may be formed only from confirmed, eligible entries with **matching market basis and forecast period**. Until approved source-and-scope mapping exists, eligibility is false and mean is NULL.

## Prior R48 evidence and interpretation

* TBRC: R29 source audit found a forecast CAGR 8.3% (2026–2030) for TBRC's *information technology market*; R48 Ollama repeatedly classified the vendor-wide definition as `PROXY` relative to GICS Information Technology. Do **not** substitute 8.3% as an approved GICS IT rate.
* SkyQuest: observed only an IT services submarket, `PROXY_ONLY`.
* Precedence: no verified direct full-market report found in R48 catalog.
* BRI: 403 from catalog and report, user-approved exclusion.

## Gates

* Four iterations per PC run (one warmup, three measured). Speed is diagnostic; stable milliseconds alone do not establish completeness.
* Three active publishers must have been attempted in each measured iteration; excluded BRI must not be contacted.
* Topic 02 and score/application integration remain blocked pending direct market-scope comparable results and the topic01 sequential research gate.
* R49 is **research-only**, writes TXT/JSON beside CMD, and does not change site calculation, source registry, DB, scheduler, deployment, branch, or trading functions.
* Save implementation **only** in `codex/investment-15-stage-m2-r25-20261025`, leave `main` untouched.
