@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R36 read-only snapshot of the seven private PC news sources.
rem Repeat only AFTER distinct normal R13 scheduled runs for comparison.
rem No collection, task start, source install, D1, score or public news write.
set "ZG_R36_SCRIPT=%~dp0scripts\iran-progress\news-display-coverage-readonly-r36.mjs"
if not exist "%ZG_R36_SCRIPT%" goto :missing
set "ZG_R36_NODE=node.exe"
where node.exe >nul 2>nul
if errorlevel 1 (
 if exist "E:\ZGmini\runtime\node.exe" (
  set "ZG_R36_NODE=E:\ZGmini\runtime\node.exe"
 ) else (
  echo STOP_R36_NODE_NOT_FOUND
  goto :failed
 )
)
echo R36_READ_ONLY_7_SOURCE_COVERAGE_SNAPSHOT
echo NO_PRIVATE_CACHE_OR_SCHEDULE_MUTATION=YES
"%ZG_R36_NODE%" "%ZG_R36_SCRIPT%" --snapshot
set "ZG_R36_EXIT=%ERRORLEVEL%"
echo.
echo Upload the timestamped IRAN_NEWS_R36_SOURCE_COVERAGE_*.txt file.
pause
exit /b %ZG_R36_EXIT%

:missing
echo STOP_R36_PACKAGE_INCOMPLETE
:failed
pause
exit /b 2
