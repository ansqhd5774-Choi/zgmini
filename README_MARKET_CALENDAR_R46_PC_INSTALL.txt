ZGMINI R46 / R45 PC PRIVATE MARKETPARQUET INSTALL
================================================

Target: the existing approved ZGMINI PC Core checkout only.
Source branch: codex/zgmini-gpt-workspace-20261025
Expected installed files: exactly 4 approved R45 source paths.

1. Extract ALL files from the ZIP into ONE new folder on the Windows PC.
2. When the normal Core job is not actively running, double-click
   MARKET_CALENDAR_R46_PC_APPLY.cmd ONCE.
3. Read MARKET_CALENDAR_R46_PC_APPLY_RESULT.txt in the SAME folder.
4. If decision is R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION, the code is
   installed. No forced API call or B1 data collection occurs during install.
5. After a normal scheduled B1 collection, double-click
   MARKET_CALENDAR_R46_PC_VERIFY.cmd. Read the separate
   MARKET_CALENDAR_R46_PC_VERIFY_RESULT.txt in the SAME folder.

IMPORTANT: Keep every .cmd and .mjs file in the extracted folder together.
Do not copy/move only a CMD file. Do not run a .mjs from another checkout.
Existing RESULT.txt files are NEVER overwritten; rename them first.

Preflight is fail-closed. If the active Core origin, Git HEAD, config source,
protected worktree files, R45 insertion anchors, package checksum or Core
lock conflicts, installation stops. Do not force or bypass a STOP result.
An existing Core lock is never deleted. Source backups are stored privately
under the current PC writer data folder before any source change.

Four files only:
  lib/market-score/breadth-b1-r6-marketparquet-provider.mjs
  lib/market-score/breadth-b1-r3-collector.mjs
  scripts/pc-writer/collect-local.mjs
  scripts/pc-writer/market-calendar-r45-marketparquet-capture.mjs

No new HTTP requests, DB/scheduler updates, forced collection, publication,
GitHub push, cloud deployment or R43 rating changes are performed here.
The VERIFY command reads PC-private day files and reports only dates/counts.
Two verified private days mean capture storage works; it is NOT evidence
that the full 2,634-issuer R43 model or a 20-day turnover series is ready.

PC success and provider observations are separate facts. If no B1 collection
occurred yet, VERIFY may report WAITING_EXISTING_B1_COLLECTION.
