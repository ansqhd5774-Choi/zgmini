# US Breadth R35 — explicit R2 percent-history publication launcher

## Approved input

The operator-provided R33 read-only log reported provider bytes verified,
249 contiguous real percent-only comparisons (2025-11-04 through 2026-10-30),
no E: source/Core/D1 writes and the reviewed R25 raw-evidence SHA:

`31ae5b3aa062d84ee9b28954fe726a47c36bde6bfcdfc957624fba4babee9728`

This digest is a guard for the source calculation, not a provider signature.
The R31 and R33 percentage series were independently compared for every date:
differences were limited to 8-decimal rounding. The strict R32 public-history
schema was also validated with no count or price fields exposed.

## Windows operation (manual and explicit)

The R35 portable ZIP contains the script dependencies, approved E: Node runtime
entry point and `US_BREADTH_R35_APPROVED_PERCENT_HISTORY_PUBLISH.cmd` at its
root. Extract to a local folder and run the CMD manually. It requires a Y/N
confirmation before attempting to open any D1 credentials or write to D1.

The CMD invokes only the existing R33 writer with three explicit publication
flags and the exact reviewed SHA. The writer independently revalidates the
actual MarketParquet source bytes, requires the matching SHA, rejects unknown,
conflicting and newer D1 rows, and checks the exact R2-only D1 readback.
If the provider's 249-day window has changed, the digest will differ and D1
will not be opened or written. Do not remove this gate to force publication.

Publication target: `public:market-breadth-confirmed-r2:usa:history-percent:v1`.
Public daily fields: `{date,risingPct,fallingPct,unchangedPct}` only.
Existing confirmed R1, the older 250-session chart, Alpaca IEX provisional
source, and approved Core task are not touched.

The TXT result is placed in `%USERPROFILE%\Downloads` (or `%TEMP%` fallback),
not on E:, and Notepad opens it. Send that TXT for readback assessment.
An unknown D1 outcome must be verified independently before retrying. Never
blindly repeat a potentially successful write.

## Deployment boundary

Running this PC CMD is **not** a website deployment. The API route and the
UI must still be selectively integrated into the approved latest `main`
through the existing PR/Cloudflare Git integration workflow. Deployment-only
branches must never be used for new feature development; return to the
existing `codex/us-breadth-public-r1-20261031` work branch afterward.

No actual D1 write, Windows task change, UI edit or deployment occurred while
building or testing this launcher.
