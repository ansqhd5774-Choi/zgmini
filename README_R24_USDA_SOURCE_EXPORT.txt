ZGMINI MARKET CALENDAR R24 USDA WASDE SOURCE READ ONLY
DATE: 2026-10-28

PURPOSE
  Obtain the official USDA WASDE 2026/2027 monthly release date HTML once.
  Do not install or trigger any PC source update, database operation,
  publishing, scheduler, Git push, or other collection job.

STEPS
  1. Extract all files from MARKET_CALENDAR_R24_USDA_SOURCE_EXPORT_20261028.zip
     into one folder, preserving the scripts/pc-writer subdirectories.
  2. Double-click MARKET_CALENDAR_R24_USDA_SOURCE_EXPORT.cmd.
  3. Upload MARKET_CALENDAR_R24_USDA_SOURCE_EXPORT_RESULT.txt to ChatGPT.
  4. If the command says SOURCE_FAILED, upload the result anyway. Do not
     repeatedly retry or bypass any rate limit / server error.

SOURCE
  https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report

EXPECTED OUTPUT
  USDA_HTML_CAPTURED_READONLY, official HTML Base64, original SHA256.
  Error status is reported without modifying the operational PC source.

STATUS BOUNDARY
  This is one-time official source format capture only. R23 EIA remains
  installed as PC local source 8ff396217c9f84578b37c9d422381644c2b8f0e8.
  R24 is not yet installed. Do not interpret captured HTML as production data.
