@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "BUNDLE_DIR=%~dp0"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "LOG_PATH=%BUNDLE_DIR%BIOTECH_R7_SETUP_LOG.txt"
> "%LOG_PATH%" echo REPORT=BIOTECH_R7_SETUP
if not exist "%NODE_EXE%" (
  >> "%LOG_PATH%" echo ERROR=NODE_RUNTIME_NOT_FOUND
  exit /b 3
)
"%NODE_EXE%" "%BUNDLE_DIR%theme-biotech-pc-install-r7.mjs" --inspect >> "%LOG_PATH%" 2>&1
if errorlevel 1 (
  >> "%LOG_PATH%" echo ERROR=BUNDLE_PRECHECK_FAILED
  exit /b 4
)
"%NODE_EXE%" "%BUNDLE_DIR%theme-biotech-pc-install-r7.mjs" --install >> "%LOG_PATH%" 2>&1
if errorlevel 1 (
  >> "%LOG_PATH%" echo ERROR=BIOTECH_SOURCE_INSTALL_FAILED
  exit /b 5
)
cscript.exe //nologo "%BUNDLE_DIR%BIOTECH_R7_TASK_MIRROR.js" --inspect >> "%LOG_PATH%" 2>&1
if errorlevel 1 (
  >> "%LOG_PATH%" echo ERROR=SEVEN_THEME_TASK_MIRROR_PRECHECK_FAILED
  exit /b 6
)
"%NODE_EXE%" "%ZGMINI_DATA_ROOT%\themes\biotech\source-r7\scripts\pc-writer\theme-biotech-auto-r7.mjs" --once --collect --publish >> "%LOG_PATH%" 2>&1
if errorlevel 1 (
  >> "%LOG_PATH%" echo ERROR=BIOTECH_R7_INITIAL_CYCLE_NOT_VERIFIED
  exit /b 7
)
cscript.exe //nologo "%BUNDLE_DIR%BIOTECH_R7_TASK_MIRROR.js" --apply >> "%LOG_PATH%" 2>&1
if errorlevel 1 (
  >> "%LOG_PATH%" echo ERROR=BIOTECH_R7_TASK_INSTALL_FAILED
  exit /b 8
)
>> "%LOG_PATH%" echo STATUS=INITIAL_CYCLE_AND_TASK_REGISTERED
exit /b 0
