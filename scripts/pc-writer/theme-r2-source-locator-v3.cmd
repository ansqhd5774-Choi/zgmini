@echo off
setlocal
cd /d "%~dp0"
echo THEME R2 V3 SOURCE FILE LOCATOR - METADATA ONLY
if exist "E:\ZGmini\runtime\node.exe" (
  "E:\ZGmini\runtime\node.exe" "%~dp0theme-r2-source-locator-v3.mjs"
) else (
  node "%~dp0theme-r2-source-locator-v3.mjs"
)
echo.
echo Output beside CMD: THEME_R2_SOURCE_LOCATOR_RESULT.json
echo No file content, provider, DB, API or production changes.
pause
endlocal
