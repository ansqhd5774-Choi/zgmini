# ZGMINI Market Calendar R59 — annual FHS-R3 grade connection

## Approved contract
- Score R3 unchanged: 20/15/25/40, boundaries 80/50, risk caps from R58.
- Manual refresh once each year; no scheduled collection/re-score/validation.
- Source R58.3 private shadow (1615 provisional records, 451 / 610 / 554); **not automatically public credit ratings**.
- Economic calendar market-importance grade is independent. Annual SEC financial-health stars apply only to earnings rows after a valid D1 snapshot exists. Unrated ticker gets em-dash.
- No raw SEC financial values, private R58 JSON, keys or vendor feed redistributed.

## Storage and reader
- D1 existing `public_feed_snapshots_v1` key `market-calendar:fhs-r3-annual`, kind=`output`, snapshot=`current` (no table migration, no TTL), value annual `{status:'READY_R3_PROVISIONAL', version:'ZGMINI-FHS-R3', asOf, sourceStoredAt, recordCount, grades:{TICKER:[stars,score]}}`.
- Existing earnings HTML D1 key remains independent and untouched; renderer joins ticker at request, respects filter/sort and reports unrated, removes core-ticker priority override only when annual FHS exists.
- If no annual snapshot, legacy HTML remains available. No automatic deletion/re-scoring for blank sources. Server re-reads only stored result.
- No automatic process touching annual score; publication uses manual CMD and D1 readback, last valid preserved.

## Safety/testing
- Source previous R58.3 private score has `sectorVerified:false`, `cashUnrestrictedVerified:false` so `READY_R3_PROVISIONAL` must remain transparent, **never agency credit rating**.
- Node pure contract tests including 1615-item distribution and empty/conflicting-source rejection. Reader isolated V8 smoke covers 3 stars, 1 star, unrated, legacy fallback.
- Same private file used only on PC; packaged R59 CLI accepts source directory, never copies private file to D1.
- The main/UI branch divergence (163 ahead/111 behind at start) blocks whole-branch PR or deploy. Selective integration of exact new paths with main required before running PC publication.
- Do not merge branch wholesale, manually overwrite Workers, activate cron, or make DNS changes.
