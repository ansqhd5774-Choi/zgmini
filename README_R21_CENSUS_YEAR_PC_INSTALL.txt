ZGMINI MARKET CALENDAR R21 - CENSUS YEAR TRANSITION (2026-10-27)

WITHDRAWN: DO NOT RUN THIS ORIGINAL INSTALL PACKAGE.
The PC collector did not match the unverified GitHub-template baseline.
R21 stopped safely before any source, config, DB, or scheduler change.
Use the separate MARKET_CALENDAR_R21_PC_SOURCE_EXPORT.cmd (read-only)
to obtain the actual PC collector for a new, correct R21 package.

WORK BRANCH: codex/zgmini-gpt-workspace-20261025
BASELINE PC CORE SHA: 97a38c7cdfbb7e0d30eaeacea27b9605bbfa2b3b
CORE WORKTREE ID: d0a4b3cb8b95

PURPOSE
- Preserve R20 Census, R19 BEA, R17 BLS, and Fed outputs.
- Fetch official Census current-year and next-year schedule rows.
- Fall back to the Census official generic list when annual URLs are empty.
- Do not accept a generic page unless it contains dates from the requested year.

PC INSTALL
PAUSED. The following original install CMD must not be executed:
  MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY.cmd
Use the new read-only source-export ZIP and submit its two output files.

CHANGES
- Exactly one PC source file: scripts/pc-writer/release-calendar.mjs
- No database schema, scheduled task, publisher, existing output, secret,
  forced collection, remote GitHub push, main merge or production deployment.
- Successful installation makes exactly one local Git commit and updates
  existing local config.source to the new commit hash.
- Locked, drifted or nonapproved source stops without touching the Core.

DECISION FOR SUCCESS
  R21_CENSUS_YEAR_INSTALLED_NO_FORCED_COLLECTION

EXPECTED CANDIDATE SHA256
  2e7ac2a57a7ec2c41b2f9647d98d49c7bb22d904978a0d637e3d3619e01dedf0

NOTE
  This is an installation package, not proof of actual scheduled collection
  or deployment. The user separately monitors the public website.
