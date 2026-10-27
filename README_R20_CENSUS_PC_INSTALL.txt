ZGMINI MARKET CALENDAR R20 CENSUS - PC INSTALL PACKAGE
====================================================

Dedicated GitHub branch:
codex/zgmini-gpt-workspace-20261025

PACKAGE CONTENTS (keep this folder structure intact)
  MARKET_CALENDAR_R20_CENSUS_APPLY.cmd
  README_R20_CENSUS_PC_INSTALL.txt
  scripts/pc-writer/market-calendar-r20-census-apply.mjs
  scripts/pc-writer/market-calendar-r19-bea-apply.mjs
  staging/market-calendar/r20-census/lib/release-calendar.mjs
  docs/MARKET_CALENDAR_R20_CENSUS_CONNECTION.md

1. Extract the entire ZIP to a folder on your Windows PC.
   Do NOT copy or run the CMD alone. It needs the included folders.
2. Double-click MARKET_CALENDAR_R20_CENSUS_APPLY.cmd in that folder.
3. The script checks the registered existing ZGMINI PC Core before editing.
   It requires the exact R19 installed source and existing PC settings.
   If the source or active lock is different, it must STOP without forcing
   installation. Do not remove any lock or change the expected SHA to bypass.
4. Look in the SAME extracted folder for:
   MARKET_CALENDAR_R20_CENSUS_APPLY_RESULT.txt
5. Share that TXT file so the installation result can be checked. Only
   decision=CENSUS_INSTALLED_IN_EXISTING_PC_SOURCE_NO_FORCED_COLLECTION
   and phase=INSTALLED prove successful PC source installation.

The CMD checks E:\ZGmini\runtime\node.exe and otherwise uses node.exe on PATH.
It DOES NOT perform forced collection, publication, GitHub push, production
deployment, database replacement, scheduler changes, or source lock deletion.
Successful PC installation is NOT proof of scheduled collection or live display.

Official source and further limitations (including the 2027 Census URL issue)
are recorded in docs/MARKET_CALENDAR_R20_CENSUS_CONNECTION.md.
