ZGMINI - Iran English Score R5 safe installer (2026-10-31)

1. Extract this ZIP to a normal folder on your Windows PC.
2. Double-click RUN_IRAN_ENGLISH_R5_ONE_CLICK.cmd in the extracted folder.
3. If multiple ZGMINI project folders are found, select the currently approved one.
   If none is detected, enter the complete path of the existing ZGMINI source root.
   (Example only: E:\ZGmini\projects\zgmini ; do not select the extracted ZIP.)
4. The installer checks baseline R4 file hashes before writing anything.
   It copies only four R5 shadow-related scripts, backs up existing files and
   then runs exactly one read-only R5 preview. No scheduler, API, DB or public
   score changes. It preserves other local PC changes and refuses source drift.
5. Wait for FINAL_STATUS=R5_SHADOW_PREVIEW_COMPLETED_NO_PUBLISH.
   During model execution, it prints a status line every 15 seconds, up to
   six minutes. The final console waits for a keypress so you can read it.
6. Send IRAN_ENGLISH_SCORE_R5_INSTALL_RESULT.txt, and if preview was reached,
   scripts\iran-progress\IRAN_ENGLISH_SCORE_R5_PREVIEW_RESULT.txt from the
   approved ZGMINI project folder.

If BLOCKED: no score or scheduler changes were made. Do not rerun repeatedly
until the reported source mismatch, Node or Ollama problem has been resolved.

GitHub source: ansqhd5774-Choi/zgmini
Existing branch: codex/iran-news-analysis-deploy-r1-20261029
Approved R5 source commit before installer: fdbfa86e6b66495befff3a5dc1869337759661f0
PC installation and live Ollama result are not verified by this ZIP alone.
