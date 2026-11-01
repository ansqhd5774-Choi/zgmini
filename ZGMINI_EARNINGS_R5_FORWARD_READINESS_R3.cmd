@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

if defined ZGMINI_PC_HOME (
  set "BASE=%ZGMINI_PC_HOME%"
) else (
  set "BASE=%USERPROFILE%\.zgmini\pc-writer"
)
set "REPORT=%BASE%\manual-input\e1-r5\reports\e1-r5-forward-readiness-r3-last.txt"
set "TMP_TIME=%TEMP%\zgmini-e1r5-readiness-r3-now-%RANDOM%-%RANDOM%.txt"

echo ============================================================
echo ZGMINI E1-R5 FORWARD READINESS R3
echo ============================================================
echo [MODE] RESEARCH-ONLY / LOCAL STORED EVIDENCE / NETWORK 0 / DB WRITE 0 / PRODUCTION OFF
echo [BASE] %BASE%
echo.

call "%~dp0scripts\resolve-local-node.cmd"
if errorlevel 1 exit /b 2

if not exist "scripts\pc-writer\earnings-r5-forward-readiness-r3.mjs" (
  echo [BLOCKED] Run this CMD from the ZGMINI repository root containing the readiness runner.
  exit /b 2
)

"%NODE%" -e "console.log(new Date().toISOString())" > "%TMP_TIME%" 2>nul
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
"%NODE%" scripts\pc-writer\earnings-r5-forward-readiness-r3.mjs --base="%BASE%" --as-of="%AS_OF%"
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
