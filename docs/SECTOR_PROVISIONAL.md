# Sector R3 provisional observations

The approved five-axis weights and percentile formulas remain unchanged. A delayed intraday daily-bar snapshot is an explicitly provisional input, not a finalized observation.

- Existing Alpaca IEX, split-adjusted source only; 15-minute delayed cutoff. No new provider/subscription.
- New York weekdays 09:45–16:15, at most one batch request per five minutes; no pagination or automatic retries. Missing any requested current symbol/ETF withholds the provisional result. Holidays produce no complete current-date bars and preserve the confirmed result.
- Exact prior stock-price overlap; existing ETF overlap tolerance 1%. New members lacking an existing prior row are not assigned synthetic history. Their long-window contributions follow the existing formula's observed-history handling.
- Raw snapshot uses a separate local file; calculated display output uses `sector-fear-greed-r3-provisional` in the existing output store. Final stock/ETF history and the 252-point confirmed feed are not overwritten.
- Public API appends only a valid newer same-New-York-date provisional point. Expired, future, incomplete or superseded output is ignored. Finalized daily output supersedes provisional. The UI identifies provisional date, delayed cutoff and confirmed date.
- Existing core cycle lock and publication/readback are reused. Failures in the additional lane must not block the normal publisher. No new scheduler, DNS, schema, weights or final-score-history mutation.
