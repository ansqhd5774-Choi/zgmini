@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "DATA_ROOT=E:\ZGmini\data"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "SOURCE_FILE=%DATA_ROOT%\themes\biotech\source-r8\scripts\pc-writer\theme-biotech-auto-r8.mjs"
if not exist "%NODE_EXE%" exit /b 3
if not exist "%SOURCE_FILE%" exit /b 4
if not exist "%USERPROFILE%\Desktop\" exit /b 5
set "ZGMINI_DATA_ROOT=%DATA_ROOT%"
set "LOG_PATH=%USERPROFILE%\Desktop\BIOTECH_R8_LAST_RUN.txt"
> "%LOG_PATH%" echo REPORT=BIOTECH_R8_SCHEDULED
"%NODE_EXE%" "%SOURCE_FILE%" --once --collect --publish >> "%LOG_PATH%" 2>&1
set "RUN_RESULT=%ERRORLEVEL%"
>> "%LOG_PATH%" echo CMD_EXIT_CODE=%RUN_RESULT%
exit /b %RUN_RESULT%
