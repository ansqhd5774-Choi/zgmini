# R4 D1 recovery — 2026-10-02 KST

## R4_STATUS
Authorized read-only investigation and escalation package completed. Recovery itself remains blocked. D1_PATH=SUPPORT_REQUIRED. No claim that migration is impossible. Existing Production/Sites writers continue; Production/DB write/DNS changes zero. No destination DB, clone, export job, Worker deploy or main change.

## D1_IDENTITY
Binding DB and Sites project appgprj_6a9aab599d64819185bbc870a6e728d7 confirmed. database_id, database_name, owning Cloudflare account UNKNOWN. Sites project identity does not prove underlying Cloudflare account ownership. User account has zero D1 per accepted R2 evidence; this does not prove cross-account binding impossible.

Official project/deployment evidence from R2 reused, not fetched again. R4 newly read saved version 377 metadata because archive_storage had not been examined. It confirms baseline de0504f and includes a tar artifact identifier/hash, 76 files and 8,683,520 bytes, but no D1 identity, runtime binding metadata or database export descriptor. Artifact bytes are NOT DB size. Archive contents were not downloaded and no assertion is made that it contains or excludes a DB dump.

Available official DB overview/table tools expose binding/table names, columns and bounded rows; neither accepts arbitrary SQL nor offers sqlite_master enumeration, exact COUNT(*), DB bytes, owner/UUID, export or consistent-snapshot tokens. Native D1 binding API exposes operations rather than an owner/account metadata surface; creating an inspection endpoint would require Production changes and was not attempted. Existing source search found no database_id/name/sqlite_master/page_size/page_count read-only recovery route. R3 authenticated Database GUI evidence (read viewer, no identity/export menu) reused without repetitive login or GUI reads.

## SCHEMA_COMPLETENESS
NOT_PROVEN. Read-only static extraction from immutable Production baseline scans 312 runtime/migration/script source files. 94 source CREATE statements: 59 table declarations (55 distinct names) and 35 index declarations, including repeated migrations/runtime declarations. All 50 live-viewer names are source declared. Five source tables are not visible in the bounded viewer:
- market_score_employment_r6_raw_snapshot_v1
- market_score_employment_r6_feature_history_v1
- market_score_employment_r6_read_model_v1
- market_score_employment_r6_read_pointer_v1
- public_feed_snapshots_v1

Classification: LIVE_CONFIRMED 50 (name existence only, not live DDL parity); SOURCE_REFERENCED_NOT_VISIBLE 5; LIVE_VISIBLE_NOT_SOURCE_DECLARED 0. UNKNOWN applies to complete live object enumeration and definitions, not a guessed table count. The missing five might be hidden by the viewer boundary or absent; neither is proven. Source FK declarations appear in seven CREATE TABLE statements. No trigger/view/virtual/generated declarations found by extraction; their presence/absence in live DB remains UNKNOWN. Source DDL is not a current sqlite_master dump and must not be applied as migration proof. Exact table columns remain missing for two viewer tables per R3. Generated/virtual tables, views, triggers and migration metadata may exist outside returned user-table list.

## EXPORT_PATH
All statuses below assess this actual Sites DB, distinct from generic Cloudflare capability:

| Candidate | This Sites DB | Official evidence / limit |
| --- | --- | --- |
| A same-D1 direct bind | NOT_PROVEN | Native binding supported generally; source ID/account and current-account permission absent. |
| B wrangler d1 export | NOT_PROVEN | Cloudflare documents full schema+data SQL export/import; source credentials/identity/entitlement absent. |
| C dashboard export | NOT_PROVEN | Sites GUI has no export menu; source owner Cloudflare dashboard unavailable. No global assertion that dashboard export is unsupported. |
| D official API export | NOT_PROVEN | Documented account/database scoped export endpoint; no authorized source IDs/access. Not called. |
| E Sites support-assisted export | NOT_PROVEN | Official support contact route supported; DB export provision/entitlement still requires their response. Draft prepared, not sent. |
| F current viewer complete pagination + consistent snapshot | UNSUPPORTED | Exposed reader cannot enumerate all schema objects or pin an immutable transaction snapshot; bounded offset <=10,000, rows<=25, projection omissions possible. Paging is not lossless export. |

Cloudflare's generic B/D export and SQL import are SUPPORTED product features. They do not establish EXPORT_READY for Sites. Official export limitations: virtual-table databases not supported by standard export; export blocks other database requests; JavaScript numeric precision can affect large int64 values. No destructive virtual-table workaround permitted here. Source has no matching declarations but live absence/numeric exactness not proven. An export job could interrupt the current Production and was not started. Blocking queries is not by itself evidence of a complete, tested snapshot/delta handoff for this DB; support must confirm the actual procedure. No fresh database migration or export test was performed.

## DATA_SIZE
DB bytes/page_count/page_size/total rows UNKNOWN. Exact COUNT(*) facility unavailable. R3 page-exhaustion metadata proves 14 per-table observed counts of 0 or 1 at its observation time; listed in data-size-evidence.json with method/time. These are not new R4 counts or a simultaneous DB snapshot. Remaining table counts UNKNOWN; no sample-size lower bound or cumulative processed counter used as total row count. Historical counter 989962 is explicitly excluded from size evidence. No full paging performed to create a nonconsistent fake export.

## SUPPORT_REQUIRED / BLOCKERS
B1 only: source database identity/account and official complete consistent schema+data export or binding permission require Sites owner/platform assistance. No official statement denying both binding and export found, so MIGRATION_NOT_POSSIBLE would be unjustified. A contact channel being available does not guarantee support will supply an export.

## NON_BLOCKING
Source extraction is review evidence rather than a complete SQL parser; unsupported dynamic constructs would be UNKNOWN (zero unresolved templates in this scan). No application modifications/tests/build reruns required for this documentation-only R4. DNS/auth/UI/candidate investigations were not repeated.

## CHANGED_FILES / EVIDENCE
Only docs/migration/r4/: R4_STATUS.md, SITES_D1_SUPPORT_REQUEST.md, version-artifact-metadata.json, schema-reconciliation.json, source-ddl-review.sql, data-size-evidence.json, recover-source-schema.mjs. Original baseline and R3 application files untouched. Schema generation and internal consistency checks completed; no runtime/export/import PASS asserted.

Official references checked:
- https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites (no documented DB export procedure in this article)
- https://help.openai.com/en/articles/20001338-managing-chatgpt-sites-for-your-workspace (Sites D1/R2 storage mentioned; owner-account/export entitlement not exposed)
- https://help.openai.com/en/articles/6614161-how-can-i-contact-support
- https://developers.cloudflare.com/d1/best-practices/import-export-data/
- https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/
- https://developers.cloudflare.com/d1/worker-api/d1-database/
- https://developers.cloudflare.com/d1/get-started/

## NEXT_ACTION
Submit the exact seven-question SITES_D1_SUPPORT_REQUEST.md through OpenAI Help Center's bottom-right chat bubble. No message sent by agent. Await official identity/bind/export/snapshot answer; no repeated viewer/login calls while evidence unchanged. Support response changes the evidence for classifying SAME_D1_BIND_READY or EXPORT_READY. Keep Production and existing writer operating.
