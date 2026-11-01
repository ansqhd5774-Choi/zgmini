@echo off
setlocal
cd /d "%~dp0..\.."
node "scripts\pc-writer\EARNINGS_R4_C_D1_MANUAL.mjs" %*
exit /b %ERRORLEVEL%
