@echo off
setlocal DisableDelayedExpansion
title ZGMINI IRAN ENGLISH R6 - READ ONLY MANUAL TEST
echo.
echo ZGMINI IRAN ENGLISH R6 - PORTABLE READ ONLY TEST
echo No project install, SQLite write, D1, score publish or scheduled task.
echo.
call "%~dp0scripts\iran-progress\IRAN_ENGLISH_R5_R6_IN_MEMORY_PREVIEW.cmd"
set "ZG_R6_EXIT=%ERRORLEVEL%"
echo.
echo Result: %~dp0scripts\iran-progress\IRAN_ENGLISH_R5_R6_IN_MEMORY_RESULT.txt
if not "%ZG_R6_EXIT%"=="0" echo [BLOCKED] Read result file. No operating state was changed.
echo.
pause
exit /b %ZG_R6_EXIT%
