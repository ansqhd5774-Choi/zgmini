# R3 Local Collector Contract

## Local-only outputs
The collector must write outside Git-tracked paths:
- export metadata manifest
- schema.sql
- one file per table or chunk
- resumable checkpoint
- SHA-256 inventory

Recommended ignored location:
`work/d1-export-r3/<run-id>/`

## Chunk file format
Prefer NDJSON with explicit typed values rather than ad-hoc CSV.

Example conceptual row representation:
```json
{"id":{"t":"integer","v":"123"},"payload":{"t":"blob","v":"<base64>"},"name":{"t":"text","v":"abc"}}
```

The exact on-wire shape may differ, but type fidelity must be explicit.

## Resume
Resume only when:
- same run id
- same schema hash
- same source baseline/freeze epoch
- previous chunk hash verifies
- cursor continuity verifies

Otherwise start a new authoritative export.

## Evidence
Git may contain:
- counts
- hashes
- table names
- timings
- pass/fail status

Git must not contain:
- raw database rows
- secrets
- full SQL data dump
- BLOB content
