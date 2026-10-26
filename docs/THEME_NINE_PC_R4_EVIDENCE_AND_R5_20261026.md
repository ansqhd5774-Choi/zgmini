# Original nine themes: R4 evidence → R5 real-JSON coverage

Status: branch-only private research. This file does not approve score, source, scheduler, D1 or deployment changes.

## What R4 actually established

The approved PC root `E:\ZGmini\data` contains:

| Class | R4 observed | Meaning |
| --- | ---: | --- |
| `theme-market-history-r131/raw` | 88 `.json` files | Existing recent original-7/14-symbol acquisitions. |
| `theme-market-history-r131/warmup/raw` | 18 `.json` files | Historical inputs, from filenames beginning `2024-01-02`; not proof of exact daily content. |
| `theme-market-history-r131/derived` | 54 `.json` files | Includes `warmup-joined` and R135 price-axis research. |
| AI `local-theme-ai-semiconductor-r187-raw-*.json` | 1,717,842 bytes | Full SHA256 matched the registered AI historical asset; contains `SMH`, `SOXX`, `SPY`. |
| AI/biotech registered JSONL | 9/9 and 17/17 in R3 | R3 SHA matched manifests, but does not establish latest data freshness. |

**Correction:** R4's original-7 `SELECTED_DAYS=0` came from a `.jsonl`/`.ndjson`-only file filter. All relevant older files observed by R4 are `.json`. Therefore zero was a diagnostic coverage failure, **not** demonstrated absence of historical prices or 628 sessions.

## R5 standalone PC execution

- Download **only** `scripts/pc-writer/theme-nine-source-r5.cmd` to the Windows Desktop and double-click or run from **CMD**. The CMD embeds the entire analysis program; it does **not** require `.cjs`, `.mjs`, npm, PowerShell, Python, or any downloaded companion.
- The only output file created is `THEME_NINE_SOURCE_R5_RESULT.txt` **in the same folder as the CMD**.
- Reads `E:\ZGmini\data` and leaves provider, data, Cloudflare/D1, GitHub main, published history and scheduler unchanged.
- Reads actual historical `.json` arrays and extracts exact dated positive observed `proxyClose` or `close` fields, regular NY 15:xx hour (early close 12:xx) when timezone-aware hourly timestamps are present. It does not interpolate or fabricate any price.
- Prints source-by-source (historical raw, already-derived joined, recent raw) day counts, date range, sample field names, same-date conflicts; then calculates **candidate intersection counts** for the nine original ETF pairs and SPY. Prints no raw prices.
- Reads AI registered R187 source and biotech JSONL manifest independently. `AI_R187` SHA verification and biotech `SHA_VERIFIED` are explicitly reported; absence of source is not silently replaced by another.
- Batch encoding ASCII/CRLF; compressed JS is split into environment variables to keep every individual CMD line below the [Microsoft CMD 8,191-character maximum](https://learn.microsoft.com/en-us/troubleshoot/windows-client/shell-experience/command-line-string-limitation).

### Interpretation restrictions

1. `MIN_628_CANDIDATE=true` means an intersection **could** support the R188 full history; it is not a successful calculation.
2. Cross-source price modes are not reconciled by combining dates, even if count is sufficient. Current R5 reports `REAL_SOURCE_MODE_RECONCILED=NO`. Actual overlap values and licence/provenance must be independently checked without contaminating confirmed published history.
3. `PRICE_CONFLICTS` or `HOUR_AMBIGUOUS` above zero is a blocker to silently using that series. R5 keeps each original file's provenance and reports conflicts instead of selecting a convenient price.
4. R5 does not replace the existing R188 scorer or adaptive R2 scorer; **no score is computed** and no ninth/eleventh theme is published.
5. A failed JSON schema should be fixed in the branch using the `*_SCHEMA` diagnostic lines, not addressed by artificially filling dates or going back to repeated path searches.

## Next gate

Once the PC R5 log is received, verify the actual chosen array keys, valid common session counts, the seven historical source-mode overlap rules, AI/biotech alignment and any SHA mismatch. Then build a complete read-only nine-theme R188/R2 shadow comparison with exact saved scoring functions and date-level parity tests. Submit differences and source evidence for approval before any production cutover; start eleventh theme only after the nine-theme overhaul is finished.
