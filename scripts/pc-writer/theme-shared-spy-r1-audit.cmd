@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0THEME_SPY_SHARED_R1_614168b.mjs"
set "REPORT=%~dp0THEME_SPY_SHARED_R1_RESULT.txt"
set "EXPECTED=663d3414fc49231b93f7f42071d8b2e9d219e11f8e50385d63066790e2db6f1d"
set "SOURCE=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/614168b14b547977d335ce90097535a0932d80fc/scripts/pc-writer/theme-shared-spy-readonly-r1.mjs"

if not exist "%NODE%" (
  echo BLOCKED_NODE_NOT_FOUND: %NODE%
  exit /b 2
)
if not exist "E:\ZGmini\data" (
  echo BLOCKED_DATA_ROOT_NOT_FOUND
  exit /b 2
)
if not exist "%SCRIPT%" (
  curl.exe -fLsS --retry 0 --max-time 30 "%SOURCE%" -o "%SCRIPT%"
  if errorlevel 1 (
    echo BLOCKED_SOURCE_DOWNLOAD
    exit /b 2
  )
)
"%NODE%" -e "const fs=require('fs'),c=require('crypto');process.exit(c.createHash('sha256').update(fs.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:12)" "%SCRIPT%" "%EXPECTED%"
if errorlevel 1 (
  echo BLOCKED_SOURCE_HASH_MISMATCH
  exit /b 2
)

echo REPORT=THEME_SPY_SHARED_R1_READ_ONLY_AUDIT>>"%REPORT%"
echo PINNED_SOURCE_SHA=614168b14b547977d335ce90097535a0932d80fc>>"%REPORT%"
"%NODE%" "%SCRIPT%" --audit data-center-power "E:\ZGmini\data" >>"%REPORT%" 2>&1
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
  echo RESULT=BLOCKED_REVIEW_REPORT>>"%REPORT%"
  echo RESULT=BLOCKED. Attach the report next to this CMD.
  exit /b %RESULT%
)
echo RESULT=PRIVATE_SPY_SOURCE_VERIFIED_NO_PROVIDER_CALL>>"%REPORT%"
echo RESULT_FILE=%REPORT%
exit /b 0
