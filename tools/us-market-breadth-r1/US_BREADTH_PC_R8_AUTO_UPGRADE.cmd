@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PACKAGE=%~dp0"
set "REPORT=%PACKAGE%US_BREADTH_PC_R8_AUTO_UPGRADE_RESULT.txt"
if not exist "%PACKAGE%upgrade-auto-r8.mjs" goto missing_package
if not exist "%PACKAGE%us-scheduled.mjs" goto missing_package
if not exist "E:\ZGmini\runtime\node.exe" goto missing_node
"E:\ZGmini\runtime\node.exe" "%PACKAGE%upgrade-auto-r8.mjs" "%PACKAGE%" > "%PACKAGE%US_BREADTH_PC_R8_AUTO_NODE_OUTPUT.txt" 2>&1
set "CODE=%ERRORLEVEL%"
if not exist "%REPORT%" > "%REPORT%" echo REPORT=US_BREADTH_PC_R8_AUTO_UPGRADE_LAUNCH
>> "%REPORT%" echo LAUNCH_EXIT_CODE=%CODE%
if not "%CODE%"=="0" (
  >> "%REPORT%" echo NODE_ERROR_BEGIN
  type "%PACKAGE%US_BREADTH_PC_R8_AUTO_NODE_OUTPUT.txt" >> "%REPORT%"
  >> "%REPORT%" echo NODE_ERROR_END
)
echo [INFO] Result: "%REPORT%"
echo [INFO] Upload the result TXT before starting any further action.
pause
endlocal & exit /b %CODE%
:missing_package
echo [STOP] Extract all ZIP files first.
pause
endlocal & exit /b 2
:missing_node
echo [STOP] Approved Node runtime not found.
pause
endlocal & exit /b 2
