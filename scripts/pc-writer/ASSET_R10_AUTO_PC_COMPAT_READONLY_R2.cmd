@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if defined ZGMINI_NODE_EXE set "NODE_EXE=%ZGMINI_NODE_EXE%"
set "RESULT=%~dp0ASSET_R10_AUTO_PC_COMPAT_R2_RESULT_%RANDOM%.txt"
if not exist "%NODE_EXE%" (
  echo FINAL_STATUS=STOP_APPROVED_NODE_MISSING>"%RESULT%"
  echo Expected existing Node: "%NODE_EXE%" >>"%RESULT%"
  type "%RESULT%"
  pause
  exit /b 2
)
"%NODE_EXE%" "%~dp0ASSET_R10_AUTO_PC_COMPAT_READONLY_R2.mjs" >"%RESULT%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"
type "%RESULT%"
echo.
echo Read-only result: "%RESULT%"
echo No PC source, schedule, config, provider or D1 change attempted.
pause
exit /b %EXIT_CODE%
