@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ZGMINI_EARNINGS_C_LOG_DIR=%~dp0"
set "LAUNCH_LOG=%~dp0EARNINGS_R4_C_D1_APPLY_LAUNCH_%RANDOM%_%RANDOM%.txt"
> "%LAUNCH_LOG%" echo EARNINGS_R4_C_D1_APPLY_ONCE_LAUNCH
if errorlevel 1 (
  echo ERROR=RESULT_DIRECTORY_NOT_WRITABLE
  pause
  exit /b 1
)
>> "%LAUNCH_LOG%" echo MODE=APPLY_ONCE_APPROVED
>> "%LAUNCH_LOG%" echo APPROVED_KEY=detail:earnings-recession-indicators:v1
>> "%LAUNCH_LOG%" echo PC_CONFIG_AND_GIT_GATES=ENFORCED
set "PROJECT_ROOT="
if defined ZGMINI_EARNINGS_C_PROJECT_ROOT if exist "%ZGMINI_EARNINGS_C_PROJECT_ROOT%\scripts\pc-writer\d1.mjs" set "PROJECT_ROOT=%ZGMINI_EARNINGS_C_PROJECT_ROOT%"
if not defined PROJECT_ROOT if exist "%~dp0scripts\pc-writer\d1.mjs" set "PROJECT_ROOT=%~dp0"
if not defined PROJECT_ROOT if exist "E:\ZGmini\projects\zgmini\scripts\pc-writer\d1.mjs" set "PROJECT_ROOT=E:\ZGmini\projects\zgmini"
if not defined PROJECT_ROOT if exist "E:\ZGmini\projects\scripts\pc-writer\d1.mjs" set "PROJECT_ROOT=E:\ZGmini\projects"
if not defined PROJECT_ROOT for /d %%D in ("E:\ZGmini\projects\*") do if not defined PROJECT_ROOT if exist "%%~fD\scripts\pc-writer\d1.mjs" set "PROJECT_ROOT=%%~fD"
if not defined PROJECT_ROOT for /d %%D in ("E:\ZGmini\projects\*") do for /d %%E in ("%%~fD\*") do if not defined PROJECT_ROOT if exist "%%~fE\scripts\pc-writer\d1.mjs" set "PROJECT_ROOT=%%~fE"
if not defined PROJECT_ROOT call :ask_project
if not defined PROJECT_ROOT (
  >> "%LAUNCH_LOG%" echo ERROR=PROJECT_DIRECTORY_NOT_PROVIDED
  goto :failed
)
if not exist "%PROJECT_ROOT%\scripts\pc-writer\d1.mjs" (
  >> "%LAUNCH_LOG%" echo ERROR=INVALID_PC_PROJECT_ROOT
  goto :failed
)
>> "%LAUNCH_LOG%" echo PROJECT_ROOT=%PROJECT_ROOT%
if not exist "%PROJECT_ROOT%\scripts\pc-writer\EARNINGS_R4_C_D1_MANUAL.mjs" (
  >> "%LAUNCH_LOG%" echo ERROR=R4_C_MAIN_SOURCE_NOT_SYNCED
  echo The approved R4 C script is not present in this PC project.
  echo Synchronize the local project with the approved main first.
  goto :failed
)
where git >nul 2>&1
if errorlevel 1 (
  >> "%LAUNCH_LOG%" echo ERROR=GIT_NOT_AVAILABLE
  goto :failed
)
set "BRANCH="
for /f "delims=" %%B in ('git -C "%PROJECT_ROOT%" branch --show-current 2^>nul') do set "BRANCH=%%B"
if /I not "%BRANCH%"=="main" (
  >> "%LAUNCH_LOG%" echo ERROR=PROJECT_NOT_ON_MAIN
  goto :failed
)
set "SOURCE_SHA="
for /f "delims=" %%H in ('git -C "%PROJECT_ROOT%" rev-parse HEAD 2^>nul') do set "SOURCE_SHA=%%H"
if not defined SOURCE_SHA (
  >> "%LAUNCH_LOG%" echo ERROR=PROJECT_SOURCE_UNRESOLVED
  goto :failed
)
>> "%LAUNCH_LOG%" echo PROJECT_SOURCE=%SOURCE_SHA%
set "NODE_BIN=node"
where node >nul 2>&1
if errorlevel 1 (
  if exist "E:\ZGmini\runtime\node.exe" (
    set "NODE_BIN=E:\ZGmini\runtime\node.exe"
  ) else (
    >> "%LAUNCH_LOG%" echo ERROR=NODE_NOT_AVAILABLE
    goto :failed
  )
)
cd /d "%PROJECT_ROOT%"
"%NODE_BIN%" "scripts\pc-writer\EARNINGS_R4_C_D1_MANUAL.mjs" --apply --confirm-earnings-c-d1-write
set "RUN_EXIT=%ERRORLEVEL%"
>> "%LAUNCH_LOG%" echo MANUAL_EXIT=%RUN_EXIT%
echo.
echo Result TXT is saved NEXT TO THIS CMD FILE.
echo If the gate failed, send the EARNINGS_R4_C_D1_MANUAL_RESULT TXT.
pause
exit /b %RUN_EXIT%
:ask_project
echo Project not found automatically.
echo Paste the full local ZGMINI Git project folder, without quotes.
set /p "PROJECT_ROOT=PROJECT_ROOT: "
exit /b
:failed
echo.
echo PREFLIGHT FAILED - no D1 write was attempted.
echo LAUNCH_LOG=%LAUNCH_LOG%
pause
exit /b 1
