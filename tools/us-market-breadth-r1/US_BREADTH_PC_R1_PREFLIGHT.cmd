@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PACKAGE=%~dp0"
set "NODE="
if defined ZGMINI_NODE_EXE set "NODE=%ZGMINI_NODE_EXE%"
if not defined NODE if exist "E:\ZGmini\runtime\node.exe" set "NODE=E:\ZGmini\runtime\node.exe"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined NODE set "NODE=%%N"
if not defined NODE goto blocked
if not exist "%NODE%" goto blocked
"%NODE%" -e "process.exit(Number(process.versions.node.split('.')[0])>=24?0:1)" >nul 2>&1
if errorlevel 1 goto blocked
if not exist "%PACKAGE%preflight.mjs" goto blocked
"%NODE%" "%PACKAGE%preflight.mjs" "%PACKAGE%US_BREADTH_PC_R1_PREFLIGHT_RESULT.txt"
set "CODE=%ERRORLEVEL%"
echo RESULT_FILE=%PACKAGE%US_BREADTH_PC_R1_PREFLIGHT_RESULT.txt
if not "%CODE%"=="0" echo [STOP] See the result file. No source, database, or scheduler was changed.
endlocal & exit /b %CODE%
:blocked
echo [STOP] Node 24+ or preflight.mjs unavailable. No installation attempted.
endlocal & exit /b 2
