# ZGMINI D1 R5.4 — Queue Hot-path Reduction

## Goal
Reduce candidate Queue CPU without changing any score formula, history window, stored source contract, or shard routing.

## Changes
The prior Queue flow did management reads/writes around every projection:
- source checkpoint before calculation
- projection existing-row read
- projection invalidation read/write
- source checkpoint after calculation
- projection writer existing-row read
- projection write

R5.4 removes the non-essential hot-path operations.

New flow:
1. load only projection-specific stored inputs
2. build the exact existing projection
3. read one final source checkpoint
4. require the queued source checkpoint to equal the final checkpoint
5. perform one conditional projection upsert

The previous READY projection remains readable while a replacement is being calculated.

## Safety
- Queue max concurrency remains 1.
- A changed final source checkpoint rejects the stale calculation.
- The conditional upsert prevents an older sourceStoredAt from replacing a newer projection.
- No public GET fallback is added.
- No source/history writes are introduced.
- No formula or data transformation changes are made.

## Revalidation
Deploy candidate from the latest migration source and retry only the remaining failed projection IDs, one at a time.

If CPU still fails, use the last emitted R54_PROJECTION_PROFILE phase:
- load-total / source:* => compact source slice
- build => staged deterministic derived precompute
- checkpoint-final => checkpoint compaction
- write => projection envelope/write optimization

Do not retry already completed inflation/recession unless regression evidence requires it.
