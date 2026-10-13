@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "REPORT=%BASE%\manual-input\e1-r5\reports\e1-r5-sec-history-backfill-last.txt"
set "REPORT_JSON=%BASE%\manual-input\e1-r5\reports\e1-r5-sec-history-backfill-last.json"

echo ============================================================
echo ZGMINI E1-R5 SEC HISTORY BACKFILL R1
echo ============================================================
echo [MODE] RESEARCH-ONLY / LOCAL CHECKPOINT + SEC ARCHIVE / DB WRITE 0 / PRODUCTION OFF
echo [BASE] %BASE%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [AUTOMATION_BLOCKED] node.exe not found in PATH.
  exit /b 2
)

if not exist "scripts\pc-writer\earnings-r5-sec-history-backfill.mjs" (
  echo [BLOCKED] Run this CMD from the ZGMINI repository root containing the history backfill runner.
  exit /b 2
)

node scripts\pc-writer\earnings-r5-sec-history-backfill.mjs --base="%BASE%" --lookback-days=550 --prior-per-issuer=2 --max-requests=100
set "RC=%ERRORLEVEL%"

echo.
if exist "%REPORT%" (
  echo ==================== LAST REPORT ====================
  type "%REPORT%"
  echo =====================================================
) else (
  echo [BLOCKED] Expected report not found: %REPORT%
  if "%RC%"=="0" set "RC=2"
)

if not "%RC%"=="0" goto :finish
if not exist "%REPORT_JSON%" goto :finish
if not exist "ZGMINI_EARNINGS_R5_SEC_CROSS_FILING_AUDIT.cmd" goto :finish

node -e "const fs=require('fs');const x=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.exit(x.status==='COMPLETE'&&Number(x.remainingAccessions)===0?0:10)" "%REPORT_JSON%" >nul 2>&1
if errorlevel 1 goto :finish

echo.
echo [NEXT_GATE] Historical backfill COMPLETE. Running local cross-filing S12A/S13 audit automatically...
call ZGMINI_EARNINGS_R5_SEC_CROSS_FILING_AUDIT.cmd
set "AUDIT_RC=%ERRORLEVEL%"
if not "%AUDIT_RC%"=="0" set "RC=%AUDIT_RC%"

:finish
echo.
exit /b %RC%
