@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PACKAGE=%~dp0"
set "REPORT=%PACKAGE%US_BREADTH_PC_R6_MANUAL_RESULT.txt"
> "%REPORT%" echo REPORT=US_BREADTH_PC_R6_MANUAL_LAUNCH
if errorlevel 1 goto readonly_folder
>> "%REPORT%" echo MODE=ONE_SHOT_US_ONLY
if not exist "%PACKAGE%us-manual.mjs" goto missing_package
if not exist "E:\ZGmini\runtime\node.exe" goto missing_node
"E:\ZGmini\runtime\node.exe" -e "process.exit(Number(process.versions.node.split('.')[0])>=24?0:1)" >nul 2>&1
if errorlevel 1 goto invalid_node

echo [INFO] US breadth manual retry (R6) started.
"E:\ZGmini\runtime\node.exe" "%PACKAGE%us-manual.mjs" > "%PACKAGE%US_BREADTH_PC_R6_NODE_OUTPUT.txt" 2>&1
set "CODE=%ERRORLEVEL%"
if not exist "%REPORT%" > "%REPORT%" echo REPORT=US_BREADTH_PC_R6_MANUAL_RESULT
>> "%REPORT%" echo LAUNCH_EXIT_CODE=%CODE%
if not "%CODE%"=="0" (
  >> "%REPORT%" echo NODE_ERROR_BEGIN
  type "%PACKAGE%US_BREADTH_PC_R6_NODE_OUTPUT.txt" >> "%REPORT%"
  >> "%REPORT%" echo NODE_ERROR_END
)
echo [INFO] Result: "%REPORT%"
echo [INFO] Send the result TXT for verification.
pause
endlocal & exit /b %CODE%

:missing_package
>> "%REPORT%" echo RESULT=BLOCKED
>> "%REPORT%" echo REASON=PACKAGE_FILES_MISSING_EXTRACT_ZIP_FIRST
goto stopped
:missing_node
>> "%REPORT%" echo RESULT=BLOCKED
>> "%REPORT%" echo REASON=APPROVED_NODE_NOT_FOUND
goto stopped
:invalid_node
>> "%REPORT%" echo RESULT=BLOCKED
>> "%REPORT%" echo REASON=NODE_24_REQUIRED
goto stopped
:readonly_folder
echo [STOP] Extract the ZIP into a writable folder before starting.
pause
endlocal & exit /b 2
:stopped
echo [STOP] See "%REPORT%". No collection attempted.
pause
endlocal & exit /b 2
