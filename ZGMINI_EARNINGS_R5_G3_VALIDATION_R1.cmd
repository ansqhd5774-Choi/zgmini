@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
if defined ZGMINI_PC_HOME (
  set "BASE=%ZGMINI_PC_HOME%"
) else (
  set "BASE=%USERPROFILE%\.zgmini\pc-writer"
)
echo ============================================================
echo ZGMINI E1-R5 G3 VALIDATION R1
echo ============================================================
echo [MODE] RESEARCH-ONLY / LOCAL STORED SEC / NETWORK 0 / DB WRITE 0 / PRODUCTION OFF
echo [BASE] %BASE%
echo.
node scripts\pc-writer\earnings-r5-g3-validation-r1.mjs --base="%BASE%"
exit /b %ERRORLEVEL%
