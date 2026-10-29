# Market Calendar R52 runtime outcome and R53 read-only source audit

Date: 2026-10-29 (KST). Working branch: `codex/ui-improvements`. This is a private PC-data quality task, not production deployment.

## Actual R52 runtime result

User-provided `MARKET_CALENDAR_R52_RESULT.txt` confirms `R52_READONLY_AUDIT_COMPLETE`:
- 2,640 earnings tickers; 2,393 R51 stored price candidates plus 246 R10 price candidates, 0 overlapping => 2,639 total, 1 missing, 0 prices >7 days old.
- SEC usable shares with a recent price: 2,372. Of these, 1,331 have a share observation <=90 days old and 1,041 are older.
- Multi-ticker issuer candidate risk: 10; SEC conflicts with recent price: 26; SEC missing usable shares with recent price: 229; SEC unmapped with recent price: 12.
- Confirmed issuer-level market caps = 0; gradeable tickers = 0. Requests/writes/public-star changes = 0.
- This is independently reported read-only PC runtime evidence, not a claim that class-level correctness or licenses have been verified.

## R53 next step: issuer source-consistency audit

- Use R52 pinned R51 plan SHA `4f6be1ba8f45007d25b7702b5eb6d5b3d193c60e7e13793876042a84e34c0138`.
- Reuse the R52 read-only baseline, original SEC CompanyFacts ZIP, SEC CIK-ticker mapping, R10 price history, R51 20 stored row batches, and original calendar from read-only SQLite.
- Partition the 2,372 candidates into share-observation age buckets 0–30, 31–90, 91–180, and >180 days. Record single-ticker versus multi-ticker issuer risk, latest DEI vs US-GAAP tag evidence, and possible ADR name hints. Name hints are not evidence that a security is or is not an ADR.
- Output aggregate `MARKET_CALENDAR_R53_RESULT.txt` and a **PC-local-only** `MARKET_CALENDAR_R53_PRIVATE_REVIEW_QUEUE.json` with ticker, CIK, dates, and review reasons but no raw prices/shares or calculated market cap. Only the aggregate TXT is shared with ChatGPT. Never upload the private queue to GitHub or D1.
- Fail closed on different R52 baseline coverage, missing or corrupted inputs, or changed pinned plan. No provider calls, no source DB writes, no publication, no new scheduler, no market-cap computation, no adjusted grade threshold.
- The R53 executable package is delivered independently in the chat; it has **not** been committed to the repository. Node JS syntax checked, five offline unit tests passed, ZIP CRC and SHA-256 checked. R53 PC execution is NOT YET VERIFIED.
- Preserve all R51 rows/raw pages and existing R50/R52 evidence. Do not repeat completed price collection.

## Remaining gates

SEC CompanyFacts may omit class/dimensional context. Class/ADR and corporate-action split compatibility, issuer-wide market cap, the data provider’s derivative-public-display rights, and the publication/TTL contract must be verified before approved R43 star thresholds can be applied. Do not silently convert candidate counts into verified market caps or change public stars.
