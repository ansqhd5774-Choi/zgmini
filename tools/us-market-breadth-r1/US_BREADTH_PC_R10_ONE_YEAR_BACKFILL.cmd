@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PACKAGE=%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE%" goto blocked
"%NODE%" -e "process.exit(Number(process.versions.node.split('.')[0])>=24?0:1)" >nul 2>&1
if errorlevel 1 goto blocked
"%NODE%" "%PACKAGE%history-backfill-r10.mjs"
set "CODE=%ERRORLEVEL%"
echo RESULT_FILE=%PACKAGE%US_BREADTH_PC_R10_ONE_YEAR_BACKFILL_RESULT.txt
if not "%CODE%"=="0" echo [STOP] Do not rerun until the result file has been reviewed.
echo.
pause
endlocal & exit /b %CODE%
:blocked
echo [STOP] The approved Node 24+ runtime was not found. No publication attempted.
echo.
pause
endlocal & exit /b 2
