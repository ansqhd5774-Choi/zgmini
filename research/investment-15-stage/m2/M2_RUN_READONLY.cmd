@echo off
setlocal EnableExtensions DisableDelayedExpansion
title ZGMINI Investment M2 R25 - NASDAQ RELEASE CHECK READ ONLY
cd /d "%~dp0"
set "M2_NODE="
set "M2_RC=0"
set "NODE_USE_ENV_PROXY=1"
echo =====================================================
echo ZGMINI Investment M2 R25 - NASDAQ RELEASE CHECK - NO TRADE
echo Original 15 PDF scorecards: verify hashes and connect unchanged R22 calculators.
echo =====================================================
echo Selected Stage 4 and 5 TEST JSON files are bundled.
echo No manual path entry required.
echo Data sources: ZGMINI, Nasdaq Trader, Wikimedia Robotics lists and US category.
echo Category name matches are NOT humanoid revenue or financial validation.
echo Official private stock screener: M2_BUSINESSQUANT_API_KEY is optional.
echo Without a key, the screener remains NOT CONNECTED.
echo Prohibited source is never requested or used to validate candidates.
echo Current company product pages are checked anew on each run.
echo Two permitted standalone issuer earnings releases are also checked live.
echo SERV now uses a separately published Nasdaq issuer announcement.
echo Missing financial releases are NOT replaced by prohibited historical records.
echo.
echo PROGRAM_FOLDER=%~dp0
for %%F in (
  M2_RUN_READONLY.mjs
  m2-live-feeds.mjs
  m2-live-report.mjs
  m2-theme-research.mjs
  m2-theme-evidence.mjs
  m2-stage5-robotics.mjs
  m2-stage6-company-exposure.mjs
  m2-stage6-us-universe.mjs
  m2-stage6-robotics-discovery.mjs
  m2-stage6-businessquant.mjs
  m2-stage6-issuer-products-r23.mjs
  m2-stage7-issuer-earnings-r24.mjs
  m2-source-policy.mjs
  m2-stage8-scorecard-bridge.mjs
  scorecards\universal-scorecards-r22.mjs
  M2_STAGE4_SELECTION.json
  M2_STAGE5_SELECTION.json
) do (
  if not exist "%~dp0%%F" (
    echo MISSING_FILE=%%F
    set "M2_RC=3"
  )
)
if not "%M2_RC%"=="0" goto MISSING
if exist "E:\ZGmini\runtime\node.exe" set "M2_NODE=E:\ZGmini\runtime\node.exe"
if not defined M2_NODE (
  where node.exe >nul 2>nul
  if not errorlevel 1 set "M2_NODE=node.exe"
)
if not defined M2_NODE (
  echo ERROR: Node.js not found in PATH or E:\ZGmini\runtime.
  set "M2_RC=3"
  goto DONE
)
echo Fetching live published data, please wait...
"%M2_NODE%" "%~dp0M2_RUN_READONLY.mjs"
set "M2_RC=%errorlevel%"
if not "%M2_RC%"=="0" goto DONE
if not exist "%~dp0M2_LATEST_REPORT.html" (
  echo ERROR: Report file not found after running.
  set "M2_RC=4"
  goto DONE
)
echo.
echo Opening M2_LATEST_REPORT.html in your default browser...
start "" "%~dp0M2_LATEST_REPORT.html"
goto DONE
:MISSING
echo ERROR: One or more files printed as MISSING_FILE are not beside the CMD.
echo Right-click the ZIP - Extract All - open the extracted folder - run CMD there.
echo Do NOT double-click the CMD from inside the ZIP archive.
set "M2_RC=3"
:DONE
echo.
echo EXIT_CODE=%M2_RC%
echo If a source failed, the HTML and TXT show the exact reason.
echo This CMD window will remain open until you press a key.
pause
exit /b %M2_RC%
