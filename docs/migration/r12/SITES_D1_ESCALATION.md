# ZGMINI R12 — Sites D1 Recovery Escalation

## Current migration state
Cloudflare migration engineering is ready up to the database handoff:

- candidate Worker runtime PASS
- static shell / Free CPU PASS
- SELECT-only candidate store PASS
- hosted Cloudflare Linux build/deploy PASS
- write guard PASS
- Production isolation PASS
- DNS / Custom Domain intentionally deferred until D1 parity

The only active migration blocker is recovery of the existing ChatGPT Sites D1 database.

## Source identity
- Sites project: `appgprj_6a9aab599d64819185bbc870a6e728d7`
- Production Sites version: `377`
- Authoritative Production source: `de0504f191ab2ba5e0bdbdebd312f162f25f035e`
- binding name: `DB`
- target Cloudflare account: `6e9b57e718b247330a6efa42a9516e95`

## What is needed from OpenAI/Sites support
Please provide one officially supported path:

### Preferred A — direct database handoff/bind
1. underlying D1 `database_id`
2. `database_name`
3. owning Cloudflare account / ownership model
4. whether this database can be transferred or bound to the target Cloudflare account above
5. exact procedure, including any write freeze or ownership transition

### Alternative B — complete export
If direct handoff/bind is not supported, provide a complete D1 SQL export and confirm:
1. schema and all table data are included
2. indexes are included
3. triggers/views are included if they exist
4. snapshot consistency semantics
5. whether Production writes are paused/blocked during export
6. how changes after the snapshot should be handled before cutover
7. official target D1 import procedure

## Existing evidence
Static source reconciliation found:
- 50 LIVE_CONFIRMED table names exposed by the Sites viewer
- 5 additional source-referenced tables not proven visible/absent
- complete live sqlite_master/schema/export cannot be obtained through the exposed Sites database viewer

The bounded viewer is not acceptable as a lossless export because it does not provide a transactionally pinned complete database snapshot.

## Safety
No database deletion, mutation, ownership change, writer shutdown, or Production interruption is requested without explicit procedure/coordination.

## Response needed to unblock cutover
A usable response must identify either:
- SAME_D1_BIND_READY, or
- EXPORT_READY

with enough identifiers/procedure to create/bind/import an isolated target D1 and perform read-only parity checks before DNS cutover.
