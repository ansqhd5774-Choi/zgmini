@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

if defined ZGMINI_PC_HOME (
  set "BASE=%ZGMINI_PC_HOME%"
) else (
  set "BASE=%USERPROFILE%\.zgmini\pc-writer"
)

echo ============================================================
echo ZGMINI E1-R5 SEC MATCHING SOURCE REVIEW R1
echo ============================================================
echo [MODE] RESEARCH-ONLY / LOCAL STORED SEC SOURCE / NETWORK 0 / DB WRITE 0 / PRODUCTION OFF
echo [BASE] %BASE%

if not exist "scripts\pc-writer\earnings-r5-sec-matching-source-review-r1.mjs" (
  echo [BLOCKED] Run this CMD from the ZGMINI repository root containing the source review runner.
  exit /b 2
)

node scripts\pc-writer\earnings-r5-sec-matching-source-review-r1.mjs --base="%BASE%"
set "RC=%ERRORLEVEL%"

set "REPORT=%BASE%\manual-input\e1-r5\reports\e1-r5-sec-matching-source-review-r1-last.txt"
if exist "%REPORT%" (
  echo.
  echo ==================== LAST REPORT ====================
  type "%REPORT%"
  echo =====================================================
)

echo [FINAL_EXIT_CODE] %RC%
exit /b %RC%
