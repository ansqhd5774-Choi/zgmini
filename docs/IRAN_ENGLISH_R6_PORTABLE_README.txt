ZGMINI - Iran English R5/R6 portable read-only manual test

SOURCE: codex/outbreak-iran-news-retention-r1-20261026
R6 SOURCE COMMIT: a84f71bdc13b09425d4bca341a3a4eaaee01c60c

1. Unzip the full package into a NEW folder on the approved Windows PC.
   Do not copy these files into the existing ZGMINI project.
2. Double click RUN_IRAN_ENGLISH_R6_PORTABLE.cmd.
3. After the window stops, upload:
   scripts\iran-progress\IRAN_ENGLISH_R5_R6_IN_MEMORY_RESULT.txt

Requirements:
- Node.js 24+ in an existing approved path or ZGMINI_NODE_EXE.
- Local Ollama with gemma3:4b available at http://127.0.0.1:11434.
- Existing R3/R5 SQLite with complete and fresh approved checkpoints.
- Existing approved ZGMINI_IRAN_HOME, or the normal local junction at
  %USERPROFILE%\.zgmini\iran-progress-r13 pointing to approved storage.
- Internet access to read public R41 news and authorized English originals.

What it does:
- Reads the PUBLIC R41 article list and authorized source evidence.
- Checks the existing R3 source freshness gate and R5 calculation.
- Shows a baseline and a hypothetical R5 score IN MEMORY ONLY.
- Writes only a diagnostic TXT inside this extracted folder.

What it NEVER does:
- Install or replace operating project source.
- Write SQLite, checkpoint, Cloudflare D1 or published score.
- Modify Windows scheduled tasks or activate an automated job.
- Copy secrets or article bodies into the diagnostic result.

FINAL_STATUS=ENGLISH_R5_R6_IN_MEMORY_NO_PUBLISH means manual preview
gate passed, NOT deployment or score publication. candidateCount=0 is
possible even if the command succeeds. A BLOCKED result is fail closed;
do not weaken the collection gate or bypass the model checks.
