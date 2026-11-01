# US Breadth R37 — verified Core D1 target for isolated R2 percent history

## Root cause established by R36 operator read-only log

The R35 provider-authenticity and prior SHA approval gates passed, but its
R33 publication runner selected `config.history`, so the initial D1 R2-key
SELECT failed with `D1_HISTORY_READ_UNAVAILABLE`; `d1Writes=0`.

The operator's R36 D1 role probe showed:

- `core`: SELECT succeeded; `market_public_snapshots_v1` exists.
- `history`: SELECT succeeded; that public snapshots table does not exist.
- R2 percent-history key on `core`: `ABSENT`.
- D1 writes, provider calls, source writes, and Core task changes: zero.

This makes the database-role mismatch the established reason for R35's missing
public table, without guessing account/database IDs or changing either schema.

## R37 surgical correction

The existing R33 R2-only runner's `loadApprovedHistoryD1R33` now selects
`config.core` instead of `config.history`. No other writer, public key, existing
R1 source, older 250-session history, provisional IEX behavior, formula or
scheduled Core task is modified. The R32 percent-only schema, exact prior
preview SHA-256 approval and provider re-verification remain unchanged.

After explicit operator `Y`, the R37 portable CMD uses the approved
`E:\ZGmini\runtime\node.exe` and the same exact earlier-reviewed digest:

`31ae5b3aa062d84ee9b28954fe726a47c36bde6bfcdfc957624fba4babee9728`

The digest is a *calculation-evidence guard*, not a provider signature. R33
must still reverify MarketParquet source bytes and compare the prepared
percentage history with the approved digest before opening D1. The R32 writer
reads only the exact R2 key, rejects unknown/newer/conflicting rows, writes
only this R2 key when permitted, then performs exact D1 readback. If the
provider source changes, publication stops before any D1 write. No fallback to
R1 or history DB is allowed.

The public R2 body has `{date,risingPct,fallingPct,unchangedPct}` daily
entries, with no stock counts or raw prices. The 250 source dates yield
249 legitimate comparison dates from 2025-11-04 through 2026-10-30; no
missing baseline date is forced as a publication prerequisite.

## Windows operation and next gate

Unpack the supplied `ZGMINI_US_BREADTH_R37_APPROVED_CORE_PUBLISH.zip` and
double-click `US_BREADTH_R37_APPROVED_CORE_PERCENT_HISTORY_PUBLISH.cmd` in the
extracted root. Answer `Y` only if this exact R2-only publication is still
approved, otherwise `N` writes nothing. The result TXT is saved in Downloads
(fallback `%TEMP%`) and opened in Notepad. Upload the TXT for assessment.

The ZIP and code tests do not establish actual D1 publication or site release.
The operator log must report `VERIFIED_PERCENT_HISTORY_FINAL` with successful
D1 readback; any nonzero/unknown result requires independent read-only status
inspection before another write. Public API/website deployment remains a
separate source/PR/Cloudflare Git integration and runtime gate. No development
is performed on the deployment-only branch.
