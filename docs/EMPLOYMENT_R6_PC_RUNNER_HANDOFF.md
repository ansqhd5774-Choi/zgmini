# Employment R6 PC Runner: isolated candidate read-only gate

Status: development contract only. This document does **not** approve PC installation,
control-repository allowlist changes, Core writes, candidate promotion, D1 publication,
or deployment.

## Identity and purpose

- Source repository: `ansqhd5774-Choi/zgmini`.
- Existing work branch: `codex/employment-1y-reader-r1`. Resolve its **live exact HEAD**
  when preparing the immutable installation bundle; never substitute development
  `main` or the operating PC Core source SHA.
- Control repository: private `ansqhd5774-Choi/zgmini-pc-control`.
- Intended new operation: `employment-r6-candidate-stage-readonly`.
- Existing read-only entrypoint in this branch:
  `scripts/pc-writer/employment-r6-runner-stage.mjs`.
- Goal: verify an existing isolated `EMPLOYMENT_R6_CANDIDATE.sqlite` against the
  approved Core without requesting another manual CMD run. The candidate is never
  promoted to approved publication input by this operation.

## Existing evidence and independent gates

- Historical PC candidate-inclusive STAGE (2026-11-01): 29/29 raw features,
  23/29 recent-quarter observations, 22/29 READY charts, 2/29 READY scores.
- Later Core-only STAGE (2026-11-02): 8/29 raw features, 2/29 recent-quarter
  observations, 2/29 READY charts and 2,880 Core PIT-history gaps.
- These observations are historical snapshots, **not** a new PC Runner PASS.
- Verified control jobs #25 (`source-audit`) and #26 (`core-status`) executed
  read-only. Their `actualExecutionSha` was the controller, not the R6 code.
- Candidate data availability, score eligibility, PIT lineage, approval to publish,
  D1 readback, and public UI availability are separate status decisions.

## Invocation contract

1. Keep the existing Issue JSON schema at exactly seven fields. Do not add an
   executable name, shell command, SQL text, candidate path, arbitrary arguments,
   or credentials to requests.
2. At B-grade installation time, register the **exact candidate file path** in
   the private PC host manifest and register an immutable R6 source bundle with
   a per-file SHA-256 manifest, approved branch, exact 40-character commit SHA,
   and fixed entrypoint. Never scan a drive to guess the candidate location.
3. For an allowed job, compare request SHA/branch against that installed bundle,
   verify the bundle manifest before starting Node, and reject missing/drifted
   sources without executing them. Do not check out the request's GitHub commit
   into the PC operating Core checkout.
4. Construct argv **inside the controller** from the approved host configuration:
   `--db <approved-absolute-core> --candidate-db-external <approved-absolute-candidate>
   --output-dir <unique-job-workspace> [--as-of YYYY-MM-DD]`.
   Use `spawn(process.execPath, argv)` with `shell:false`; never execute Issue text.
5. Open Core and candidate read-only. Reject wrong basename, non-file, missing
   file, Core realpath/file-ID alias, corrupt SQLite/schema, unpublished source
   metadata, or ambiguous PIT evidence. `PUBLISH` and provider calls are forbidden.
6. Return only the bounded Runner report: six feature counts, 29 public indicator
   IDs/status codes, PIT aggregate counts/status, WAL preflight status, fixed
   diagnostic code, and a digest of the local staged body. No raw values, chart
   points, private paths, provider responses, or full STAGE JSON in GitHub.
7. A job PASS means that the read-only stage completed. It does **not** mean
   29 scores are READY, candidate lineage is approved, D1 was updated, or that
   the public website shows the candidate.

## SQLite WAL safety gate

SQLite's read-only connection may create `-wal`/`-shm` files in a writable
directory. On an isolated Node 24 WAL fixture, opening a checkpointed database
with `DatabaseSync({readOnly:true})` recreated both sidecars without changing
the main database bytes. Therefore the new Runner entrypoint checks the database
header and requires existing WAL sidecars before opening a WAL-mode database;
otherwise it reports `WAL_SIDECAR_NOT_READY` and does not open SQLite. This
preflight prevents the observed absent-sidecar case, but is **not** a proof of
zero filesystem I/O or immunity to a concurrent sidecar removal. A Windows
fixture under live-writer conditions is still required before PC approval.

The job must not remove Core lock files, alter journal mode, copy/rename the
operating DB, replace the approved PC source, or change Task Scheduler entries.

## Exact controller changes needed, not yet authorized or installed

| Controller file or installation component | Required change |
| --- | --- |
| `config/operations.json` | Add one A-grade heavy operation (bounded timeout, memory gate) after its immutable executable is B-grade approved. Keep `mutationsEnabled:false`. |
| `controller/operations.mjs` | Add only the fixed operation dispatch, host-bound path/bundle checks, isolated Node invocation and status projection. |
| `controller/engine.mjs` | Record controller SHA and actual R6 bundle execution SHA separately, and record whether SQLite was actually opened. Preserve existing request/seat/heavy leases and protected-state snapshots. |
| `controller/worker.mjs` | Distinguish `BLOCKED` preflight from runtime `FAIL`; no automatic retries. |
| `controller/upload.mjs` | Upload only the reduced report. Retain the 32,768-byte total limit, private results and no Artifact/cache use. |
| Separate B-grade installation procedure | Verify and seal the R6 bundle and exact candidate file identity in host configuration; leave the existing operating Core source unchanged. Existing controller-only updater is insufficient. |

## Simulation and acceptance criteria

- Synthetic source coverage 29/29 while PIT or scores remain partial: complete
  stage may PASS, but scoring/promotion must remain unapproved.
- Read-only Core/candidate byte checks; WAL sidecar absence must BLOCK before
  SQLite open. Active WAL-writer behavior requires a separate Windows fixture.
- Candidate equals Core by path/symlink/hardlink/file ID, missing/wrong filename,
  corrupt SQLite, incomplete CURRENT/HISTORY lineage: fail closed with fixed
  codes and no private path leak.
- Wrong requested SHA, branch, installed manifest hash, or candidate identity:
  no R6 code executed. Controller source SHA must not impersonate the R6 SHA.
- Unknown request keys, arbitrary scripts/paths/commands, `PUBLISH`, outbound
  provider requests, D1 writes, Core source edits, lock deletion: rejected.
- At most one heavy job, bounded memory/time, unique workspace, one requestId,
  zero automatic retries. Queued/offline/resource wait is not a source failure.
- TXT + JSON summary under 32KiB, no secrets/raw rows/chart values; verify
  `status`, `code`, `lastPass`, `firstFail`, `actualExecutionSha` and result digest.
- Core/Korea/Iran Task hashes and approved PC config/source hashes unchanged.

## Remaining authorization and execution sequence

1. Review the final R6 development SHA and all targeted tests/CI.
2. Produce an immutable source bundle and obtain explicit B-grade approval for
   the **new executable, exact candidate location, host registration and
   installation**. This is not approval to promote the candidate or publish.
3. Test the isolated bundle and WAL/alias failures on Windows without accessing
   the production Core. Verify the installer and its rollback with the
   controller's existing installation contract.
4. Only after approval, install with the existing controller workflow under an
   idle/lease gate; verify six runners reconnect and protected hashes match.
5. Submit one new `pc-job` Issue using the existing seven-field JSON and a
   unique requestId; retrieve the exact job TXT/JSON and validate execution SHA.
6. If PIT and source provenance are still incomplete, hold the candidate in
   read-only research state. D1 publication and site deployment remain their
   own independent approval and validation gates.
