@echo off
setlocal
cd /d "%~dp0"
echo THEME R2 R131 TARGETED SOURCE VALIDATION - READ ONLY
if exist "E:\ZGmini\runtime\node.exe" (
  "E:\ZGmini\runtime\node.exe" "%~dp0theme-r2-r131-price-readiness.mjs"
) else (
  node "%~dp0theme-r2-r131-price-readiness.mjs"
)
echo.
echo Output beside CMD: THEME_R2_R131_PRICE_READINESS_RESULT.json
echo No provider, DB, scheduler, or production changes.
pause
endlocal
