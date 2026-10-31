@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PACKAGE=%~dp0"
if not exist "E:\ZGmini\runtime\node.exe" goto blocked
"E:\ZGmini\runtime\node.exe" -e "process.exit(Number(process.versions.node.split('.')[0])>=24?0:1)" >nul 2>&1
if errorlevel 1 goto blocked
"E:\ZGmini\runtime\node.exe" "%PACKAGE%safe-install.mjs" "%PACKAGE%"
set "CODE=%ERRORLEVEL%"
echo REPORT=%PACKAGE%US_BREADTH_PC_R4_INSTALL_RESULT.txt
if not "%CODE%"=="0" echo [STOP] See report. Existing scheduled tasks were preserved.
endlocal & exit /b %CODE%
:blocked
echo [STOP] Approved Node 24 runtime missing. No installation attempted.
endlocal & exit /b 2
