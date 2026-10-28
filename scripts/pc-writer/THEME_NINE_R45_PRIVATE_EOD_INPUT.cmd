@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE_EXE%" (
  where node.exe >nul 2>nul
  if errorlevel 1 (
    echo STOP: Node runtime not found. No collection or source changes were made.
    pause
    exit /b 2
  )
  set "NODE_EXE=node.exe"
)
if not exist "%~dp0theme-nine-r45-private-eod-feed.mjs" (
  echo STOP: R45 script missing in the extracted folder.
  pause
  exit /b 2
)
if not exist "%~dp0theme-nine-r20-approved-candidates.json" (
  echo STOP: Approved R20 roster missing in the extracted folder.
  pause
  exit /b 2
)
"%NODE_EXE%" "%~dp0theme-nine-r45-private-eod-feed.mjs" --export "%~dp0"
set "RESULT=%ERRORLEVEL%"
echo.
echo R45 finished. Please send only THEME_NINE_R45_PRIVATE_EOD_INPUT_*_RESULT.txt.
echo The JSON file is the private EOD input and is NOT a public R32 score.
pause
exit /b %RESULT%
