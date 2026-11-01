ZGMINI Iran English R7 - article-by-article HOLD diagnostics

Original development branch: codex/outbreak-iran-news-retention-r1-20261026

1. Extract the complete ZIP into a NEW folder.
2. Double click RUN_IRAN_ENGLISH_R7_DIAG_PORTABLE.cmd.
3. Upload scripts\iran-progress\IRAN_ENGLISH_R7_HOLD_DIAGNOSTICS_RESULT.txt.

This R7 check explains WHY R6 accepted zero new score candidates.
It preserves the R5 original model, approved source restrictions, old article
gate, duplicate policy, fresh R3 checkpoints, and all existing news history.
The detailed TXT reports only hashed article IDs, source IDs, date/age,
English evidence state, and score admission reason. It never records
original article titles, bodies, model quotes, or credentials.

R7 requires the existing approved Windows PC Node.js 24+, the approved
read-only operational SQLite path (ZGMINI_IRAN_HOME or default junction),
Ollama gemma3:4b at http://127.0.0.1:11434, and public R41 access.

This is a manual read-only analysis. No existing project file is replaced.
It does not write to SQLite, D1 or Cloudflare; publish R5; schedule a task;
or make any score rule/threshold/weight change.

When finished, FINAL_STATUS=IRAN_R7_DIAGNOSTICS_READ_ONLY_NO_PUBLISH
means only that read-only diagnostics passed. It does not mean that the
news is eligible for use in a live R5 score.
