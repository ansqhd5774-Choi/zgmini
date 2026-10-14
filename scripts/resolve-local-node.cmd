@echo off
rem Resolve only; never collect, publish, install or change the caller's PATH.
set "NODE="
if defined ZGMINI_NODE_EXE (
  set "NODE=%ZGMINI_NODE_EXE%"
  goto validate
)
if exist "E:\ZGmini\runtime\node.exe" (
  set "NODE=E:\ZGmini\runtime\node.exe"
  goto validate
)
if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE=%ProgramFiles%\nodejs\node.exe"
  goto validate
)
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
  set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
  goto validate
)
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined NODE set "NODE=%%N"
:validate
if not defined NODE goto unavailable
if not exist "%NODE%" goto unavailable
"%NODE%" -e "process.exit(Number(process.versions.node.split('.')[0])>=24?0:1)" >nul 2>&1
if errorlevel 1 goto unavailable
exit /b 0
:unavailable
set "NODE="
echo [AUTOMATION_BLOCKED] Node.js 24+ unavailable. Check E: or set ZGMINI_NODE_EXE to an existing trusted Node executable.
exit /b 2
