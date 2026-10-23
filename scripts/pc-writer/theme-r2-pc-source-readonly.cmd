@echo off
setlocal
cd /d "%~dp0"
echo THEME R2 EXISTING PC SOURCE INVENTORY - READ ONLY
if exist "E:\ZGmini\runtime\node.exe" (
  "E:\ZGmini\runtime\node.exe" "%~dp0theme-r2-pc-source-readonly.mjs"
) else (
  node "%~dp0theme-r2-pc-source-readonly.mjs"
)
echo.
echo Output beside CMD: THEME_R2_PC_SOURCE_RESULT.json
echo No data/provider/DB/API/production changes.
pause
endlocal
