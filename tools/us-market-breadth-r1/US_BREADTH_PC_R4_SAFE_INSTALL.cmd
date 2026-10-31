@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PACKAGE=%~dp0"
set "REPORT=%PACKAGE%US_BREADTH_PC_R4_INSTALL_RESULT.txt"
> "%REPORT%" echo REPORT=US_BREADTH_PC_R4_LAUNCH_START
if errorlevel 1 goto readonly_folder
>> "%REPORT%" echo MODE=SAFE_INSTALL_LAUNCH
if not exist "%PACKAGE%safe-install.mjs" goto missing_package

set "NODE="
if defined ZGMINI_NODE_EXE set "NODE=%ZGMINI_NODE_EXE%"
if not defined NODE if exist "E:\ZGmini\runtime\node.exe" set "NODE=E:\ZGmini\runtime\node.exe"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined NODE set "NODE=%%N"
if not defined NODE goto missing_node
if not exist "%NODE%" goto missing_node
"%NODE%" -e "process.exit(Number(process.versions.node.split('.')[0])>=24?0:1)" >nul 2>&1
if errorlevel 1 goto invalid_node

echo [INFO] Running Windows US breadth installer.
"%NODE%" "%PACKAGE%safe-install.mjs" "%PACKAGE%"
set "CODE=%ERRORLEVEL%"
if not exist "%REPORT%" > "%REPORT%" echo REPORT=US_BREADTH_PC_R4_INSTALL_RESULT
>> "%REPORT%" echo LAUNCH_EXIT_CODE=%CODE%
echo [INFO] Report: "%REPORT%"
if not "%CODE%"=="0" echo [STOP] Installation incomplete; see report and error above.
pause
endlocal & exit /b %CODE%

:missing_package
>> "%REPORT%" echo RESULT=BLOCKED
>> "%REPORT%" echo REASON=PACKAGE_FILES_MISSING_EXTRACT_ZIP_FIRST
goto stopped
:missing_node
>> "%REPORT%" echo RESULT=BLOCKED
>> "%REPORT%" echo REASON=NODE_24_NOT_FOUND
goto stopped
:invalid_node
>> "%REPORT%" echo RESULT=BLOCKED
>> "%REPORT%" echo REASON=NODE_24_REQUIRED
goto stopped
:readonly_folder
echo [STOP] Extract the ZIP into a writable folder before running the CMD.
pause
endlocal & exit /b 2
:stopped
echo [STOP] See "%REPORT%". No installation attempted.
pause
endlocal & exit /b 2
