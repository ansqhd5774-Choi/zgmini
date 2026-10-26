@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if "%~1"=="" (
  echo ERROR: JSON input path required. Drag a R2 input JSON onto this CMD or pass a full path.
  echo Input schema: THEME_ETF_R2_LOCAL_PRICE_AUM_INPUT_V1
  pause
  exit /b 2
)
if exist "E:\ZGmini\runtime\node.exe" (
  "E:\ZGmini\runtime\node.exe" "%~dp0theme-r2-shadow-readonly.mjs" --input "%~f1"
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo ERROR: Node.js executable not found.
    pause
    exit /b 3
  )
  node "%~dp0theme-r2-shadow-readonly.mjs" --input "%~f1"
)
echo.
echo Result file is in the same folder as this CMD: THEME_R2_SHADOW_RESULT.json
pause
endlocal
