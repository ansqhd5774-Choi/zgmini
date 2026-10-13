@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "REPORT=%BASE%\manual-input\e1-r5\reports\e1-r5-sec-cross-filing-audit-last.txt"
set "TMP_TIME=%TEMP%\zgmini-e1r5-cross-audit-now-%RANDOM%-%RANDOM%.txt"

echo ============================================================
echo ZGMINI E1-R5 SEC CROSS-FILING AUDIT R1
echo ============================================================
echo [MODE] RESEARCH-ONLY / LOCAL SEC CORPUS / NETWORK 0 / DB WRITE 0 / PRODUCTION OFF
echo [BASE] %BASE%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [AUTOMATION_BLOCKED] node.exe not found in PATH.
  exit /b 2
)

if not exist "scripts\pc-writer\earnings-r5-sec-cross-filing-audit.mjs" (
  echo [BLOCKED] Run this CMD from the ZGMINI repository root containing the cross-filing audit runner.
  exit /b 2
)

node -e "console.log(new Date().toISOString())" > "%TMP_TIME%" 2>nul
if errorlevel 1 (
  echo [AUTOMATION_BLOCKED] Could not create current UTC timestamp.
  if exist "%TMP_TIME%" del /q "%TMP_TIME%" >nul 2>&1
  exit /b 2
)
set /p "AS_OF="<"%TMP_TIME%"
del /q "%TMP_TIME%" >nul 2>&1
if not defined AS_OF (
  echo [AUTOMATION_BLOCKED] Current UTC timestamp was empty.
  exit /b 2
)

echo [AS_OF] %AS_OF%
node scripts\pc-writer\earnings-r5-sec-cross-filing-audit.mjs --base="%BASE%" --as-of="%AS_OF%"
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

echo.
exit /b %RC%
