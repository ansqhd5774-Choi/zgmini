@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PACKAGE=%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE%" goto blocked
"%NODE%" -e "process.exit(Number(process.versions.node.split('.')[0])>=24?0:1)" >nul 2>&1
if errorlevel 1 goto blocked
"%NODE%" "%PACKAGE%history-recover-r12.mjs"
set "CODE=%ERRORLEVEL%"
echo RESULT_FILE=%PACKAGE%US_BREADTH_PC_R12_TWO_DAY_RECOVERY_RESULT.txt
if not "%CODE%"=="0" echo [STOP] Do not rerun before result review.
echo.
pause
endlocal & exit /b %CODE%
:blocked
echo [STOP] Approved Node 24+ runtime not found. No D1 writes.
echo.
pause
endlocal & exit /b 2
