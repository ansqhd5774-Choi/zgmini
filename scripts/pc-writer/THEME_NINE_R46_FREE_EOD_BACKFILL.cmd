@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE_EXE%" (
  where node.exe >nul 2>nul
  if errorlevel 1 (
    echo STOP: Node runtime was not found.
    pause
    exit /b 2
  )
  set "NODE_EXE=node.exe"
)
if not exist "%~dp0theme-nine-r46-free-eod-backfill.mjs" (
  echo STOP: R46 JS file is missing.
  pause
  exit /b 2
)
echo R46 uses the MarketParquet free EOD manifest. It never changes the existing task.
echo A free API account key may be required. This CMD does not ask for the key.
echo The run can take several minutes. No raw data is uploaded to ChatGPT.
"%NODE_EXE%" "%~dp0theme-nine-r46-free-eod-backfill.mjs" --backfill "%~dp0."
set "RESULT=%ERRORLEVEL%"
echo.
echo Send only THEME_NINE_R46_FREE_EOD_BACKFILL_*_RESULT.txt.
pause
exit /b %RESULT%
