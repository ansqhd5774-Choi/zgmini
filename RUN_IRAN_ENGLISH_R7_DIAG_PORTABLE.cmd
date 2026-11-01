@echo off
setlocal DisableDelayedExpansion
title ZGMINI IRAN R7 - READ ONLY ARTICLE DIAGNOSTICS
echo.
echo Iran R7 per-article reason trace - read only.
echo No installation, SQLite write, D1, site publish, or scheduled task.
echo.
call "%~dp0scripts\iran-progress\IRAN_ENGLISH_R7_HOLD_DIAGNOSTICS.cmd"
set "ZG_R7_EXIT=%ERRORLEVEL%"
echo.
echo Result: %~dp0scripts\iran-progress\IRAN_ENGLISH_R7_HOLD_DIAGNOSTICS_RESULT.txt
if not "%ZG_R7_EXIT%"=="0" echo [BLOCKED] Upload the result for diagnosis.
echo.
pause
exit /b %ZG_R7_EXIT%
