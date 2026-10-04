# ZGMINI D1 R5.5 — Projection-scoped checkpoints

## Goal
Reduce Queue consumer CPU and D1 reads while preserving stale-source detection.

## Change
R5.2 used one global checkpoint for every projection:
- DB_CORE current snapshot
- DB_HISTORY latest REV7 snapshot
- JSON encoding + SHA-256

That forced non-KFG projections to read DB_HISTORY and hash unrelated state.

R5.5 scopes checkpoints:
- inflation/recession/liquidity/credit/earnings/asset/debt/supply -> DB_CORE current snapshot only
- koreaFearGreed -> DB_HISTORY latest REV7 snapshot only

The producer reads each needed shard once and fans the appropriate checkpoint into each Queue message.
The consumer validates only the shard relevant to the projection after build.

## Safety
- no score formula changes
- no history-window changes
- no source/history writes
- no cross-shard fallback
- stale jobs still fail when their relevant source checkpoint changed
- Queue concurrency remains 1
- visitor GET contract unchanged

## Expected reduction
Non-KFG consumer final checkpoint:
2 D1 reads + SHA-256 -> 1 D1 read, no digest.

KFG final checkpoint:
2 D1 reads + SHA-256 -> 1 D1 read, no digest.
