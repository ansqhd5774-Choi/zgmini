@echo off
setlocal EnableExtensions DisableDelayedExpansion
title ZGMINI M2 - Register Business Quant API Key (Private User)
cd /d "%~dp0"
set "M2_RC=0"
set "M2_NODE="
if exist "E:\ZGmini\runtime\node.exe" set "M2_NODE=E:\ZGmini\runtime\node.exe"
if not defined M2_NODE (
  where node.exe >nul 2>nul
  if not errorlevel 1 set "M2_NODE=node.exe"
)
echo =====================================================
echo ZGMINI M2 - ONE-TIME PRIVATE BUSINESS QUANT API REGISTRATION
echo =====================================================
echo Registration: current Windows user account only.
echo API key will be masked while entering and never written to an M2 file.
echo No PowerShell. No administrator privilege. No purchases.
echo.
if not defined M2_NODE (
  echo ERROR: Node.js not found in PATH or E:\ZGmini\runtime.
  set "M2_RC=3"
  goto DONE
)
if not exist "%~dp0M2_REGISTER_BUSINESSQUANT_KEY.mjs" (
  echo ERROR: MISSING_FILE=M2_REGISTER_BUSINESSQUANT_KEY.mjs
  echo Extract the complete ZIP, then run this CMD from the same folder.
  set "M2_RC=3"
  goto DONE
)
"%M2_NODE%" "%~dp0M2_REGISTER_BUSINESSQUANT_KEY.mjs"
set "M2_RC=%errorlevel%"
:DONE
echo.
echo EXIT_CODE=%M2_RC%
echo This window will remain open until you press a key.
pause
exit /b %M2_RC%
