IRAN NEWS R38 - 2-STAGE KEYWORD FILTER INSTALL
2026-10-28

Branch: codex/outbreak-iran-news-retention-r1-20261026

CONTENT MATCHING (article title + publisher article body):
  FIRST GROUP: Iran, Houthis, Saudi, Yemen (Korean equivalents accepted)
  SECOND GROUP: war, agreement, ceasefire, negotiation, progress
  RESULT: at least one FIRST and at least one SECOND; no semantic relevance ranking.

INSTALL STEPS (Windows CMD only):
  1. Extract this entire ZIP into a new empty folder.
  2. Ensure E:\ZGmini\projects and E:\ZGmini\data are available as usual.
  3. Outside scheduled R13 +/-25 minute windows (00:00,06:00,12:00,18:00 KST),
     run IRAN_NEWS_R38_KEYWORD_INSTALL.cmd once.
  4. Read IRAN_NEWS_R38_KEYWORD_INSTALL_RESULT.txt in the same folder.
  5. If STOP or uncertain, DO NOT rerun or delete .before-iran-news-r38 backups.

THIS INSTALL CHANGES ONLY TWO PC PRIVATE COLLECTOR MODULES:
  scripts/iran-progress/news-display-discover-r1.mjs
  scripts/iran-progress/news-display-article-audit-r25.mjs

NO D1 PUBLISHING, PUBLIC NEWS CACHE WRITE, TASK REGISTRATION, SCORE OR DNS CHANGE.
The live site will NOT automatically show 35 new articles just because this
package was installed. Public reviewed news payload and D1 read-back remain
separate steps. The R36 historical module identity audit checks R35 hashes
and must not be reused to grade the changed R38 modules.

STOP CONDITIONS: unknown PC module SHA, changed/partial install, existing
result or staging file, unsafe schedule window, missing runtime or PC identity.
