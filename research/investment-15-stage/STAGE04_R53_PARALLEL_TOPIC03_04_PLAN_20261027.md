# Stage04 R53: dual-topic PC research experiment

Date: 2026-10-27. Only branch codex/investment-15-stage-m2-r25-20261025.

## User authorization and prior state

The user requested **topics 03 and 04 to run simultaneously**, after the first two topic investigations had completed their diagnostic and partial-acceptance gates. Prior topic01/02 full GICS CAGR values remain NULL; a successful collector test is not equivalent to full sector source-coverage approval.

03 임의소비재(경기소비재) = GICS Consumer Discretionary.

04 산업재 = GICS Industrials.

## Parallel strategy

1. Start both distinct topic workflows in one Promise.all. Each topic visits the three permitted publishers independently. The observed overlap is logged for every pass, so parallelism is measurable rather than assumed.
2. Share one **FIFO Ollama model queue** across both workflows. This prevents two heavy local model generations from contending simultaneously, while publisher HTTP reads and topic jobs remain concurrent.
3. One warmup and three measured passes. Report the per-topic median, spread and state consistency independently, plus overlap and combined wall time. The prior 25% speed spread bound is a diagnostic, not a final-source acceptance formula.
4. Each publisher's **official report URL seed, if any**, is independently re-fetched. The R35 matrix never supplies live numbers. Topic03 has no relevant original four-publisher seeds; topic04 includes industrial-machinery proxies.
5. Search verified public publisher catalogs where known; use three alternate topic queries across Google and Bing. A successful HTTP search with zero links or Google JS-required response remains SEARCH_INCOMPLETE, not proof of no report. Preserve live discovered URL counts separately from seeds.
6. BRI is always SOURCE_BLOCKED_EXCLUDED with **zero HTTP attempts**. Do not retry or bypass 403, request a new login, or pay for access. Once another catalog or search engine produces 403/429, avoid pointless repeats within the same invocation.
7. The model returns a constrained candidate label, never an invented percentage. Check market title/slug separately, record partial-sector proxy forecasts separately from full GICS candidates, and keep final GICS CAGR as NULL unless separately validated and approved. Do not automatically combine different report scopes or forecast periods.
8. For TBRC use the existing R29 future-vs-historic arithmetic gate; if its forecast section is incomplete, mark the **individual report incomplete** rather than letting an historical CAGR be selected. Do not blacklist the entire publisher.
9. Write JSON and TXT plus an append-only dated history record for voluntary reruns. No scheduler, API, database, score, deployment or trade modification.

## Market scope guard

GICS Consumer Discretionary includes more than apparel or consumer durables; GICS Industrials includes more than industrial machinery. The [S&P GICS sector system](https://www.spglobal.com/spdji/en/landing/topic/gics/) defines the investment classification. Reports covering one submarket can provide informative **publisher proxy observations** but never become a whole-sector CAGR merely because Ollama outputs DIRECT.

The planned two-topic test is a diagnostic, not a 21-topic bulk rerun. It does not authorize running 05–21 automatically.
