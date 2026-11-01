@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PACKAGE=%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE%" goto blocked
"%NODE%" -e "process.exit(Number(process.versions.node.split('.')[0])>=24?0:1)" >nul 2>&1
if errorlevel 1 goto blocked
"%NODE%" "%PACKAGE%four-gap-diagnosis-r11.mjs"
set "CODE=%ERRORLEVEL%"
echo RESULT_FILE=%PACKAGE%US_BREADTH_PC_R11_FOUR_GAP_READONLY_RESULT.txt
if not "%CODE%"=="0" echo [STOP] Send the result file for review. Do not retry automatically.
echo.
pause
endlocal & exit /b %CODE%
:blocked
echo [STOP] Approved Node 24+ runtime was not found. Nothing was changed.
echo.
pause
endlocal & exit /b 2
