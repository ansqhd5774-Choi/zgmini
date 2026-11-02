ZGMINI US BREADTH R45 - LATEST TWO COMPLETED MARKET DAYS

1. Extract the entire ZIP to a normal folder (not to E:).
2. After NY market close + 15 minutes, run US_BREADTH_R45_LATEST_PAIR_APPROVED.cmd.
   For 2026-11-02, not earlier than 2026-11-02 21:15 UTC / 16:15 EST.
   MarketParquet may publish that day's file later than this time.
3. The CMD first calls the provider manifest PLAN only. To approve source-only
   collection, enter uppercase Y at its prompt. Any other answer writes no E: files.
4. The result TXT is created in the SAME FOLDER AS THE CMD. Explorer selects it.
   Attach the TXT in chat. Never send providers.env, API keys, source files, or raw data.

Requires E:\ZGmini\runtime\node.exe (x64), existing E:\ZGmini\data,
and the already configured local MarketParquet API key in providers.env.

Only the following existing source folder may gain new parquet and audit files:
E:\ZGmini\data\us-breadth-confirmed-r2\marketparquet-stock-daily

No Core Task, D1, legacy R1, existing 250-day source, or deployment changes.
R45 preserves existing verified pairs, rejects source conflicts, and does NOT
claim provider-authenticity or publication. An unavailable new provider day
is a normal partial result and must not block unrelated work.

Output status is in [R45_COLLECTION_RESULT]. A normal CLI exit alone is NOT
proof of collection success. Report STAGING_COMPLETE_LOCAL_ONLY versus any
other provider/availability status exactly as printed in the TXT.

Source branch: codex/us-breadth-public-r1-20261031
Relevant source: scripts/pc-writer/us-breadth-confirmed-download-r30.mjs
