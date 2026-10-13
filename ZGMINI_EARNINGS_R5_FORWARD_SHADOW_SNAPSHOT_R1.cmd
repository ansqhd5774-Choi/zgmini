@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "SCRIPT_DIR=%~dp0"
if defined ZGMINI_PC_HOME (
  set "BASE=%ZGMINI_PC_HOME%"
) else (
  set "BASE=%USERPROFILE%\.zgmini\pc-writer"
)
echo ============================================================
echo ZGMINI E1-R5 FORWARD SHADOW SNAPSHOT R1
echo ============================================================
echo [MODE] RESEARCH-ONLY / LOCAL STORED EVIDENCE / NETWORK 0 / DB WRITE 0 / PRODUCTION OFF
echo [BASE] %BASE%
echo.
node "%SCRIPT_DIR%scripts\pc-writer\earnings-r5-forward-shadow-snapshot-r1.mjs" --base="%BASE%"
set "RC=%ERRORLEVEL%"
echo.
echo [FINAL_EXIT_CODE] %RC%
echo [NETWORK_CALLS] 0
echo [DB_WRITES] 0
echo [PRODUCTION_ACTIVATION] NO
exit /b %RC%
