IRAN NEWS R38 - READ-ONLY PREFLIGHT DIAGNOSTIC
2026-10-28

The earlier IRAN_NEWS_R38_KEYWORD_INSTALL_RESULT.txt showed:
  STEP_1=READ_ONLY_IDENTITY_AND_SCHEDULE_PREFLIGHT
  STOP_R38 / R38_UNCLASSIFIED_FAILURE
  FINAL_STATUS=STOP_R38_BEFORE_INSTALL

DO NOT RERUN IRAN_NEWS_R38_KEYWORD_INSTALL.cmd.

Use this separate package instead:
  1. Extract the whole diagnostic ZIP into a NEW empty Windows folder.
  2. Run IRAN_NEWS_R38_PREFLIGHT_DIAG.cmd once.
  3. Send IRAN_NEWS_R38_PREFLIGHT_DIAG_RESULT.txt.

The diagnostic calls only --preflight and labels missing PC modules,
permission errors, or R32 launcher identity failures without printing
private paths, credentials or article text.

This is NOT a fix or publication, and DOES NOT replace any installed PC
module, alter task registrations, touch D1 or publish any news.
