@echo off
setlocal DisableDelayedExpansion
title ZGMINI Provisional R6 Price Bridge Read-Only
set "TPR6_OUT=%~dp0THEME_PROVISIONAL_R6_PRICE_BRIDGE_RESULT.txt"
set "TPR6_SCRIPT=%~dp0THEME_PROVISIONAL_R6_PRICE_BRIDGE.mjs"
set "TPR6_NODE=E:\ZGmini\runtime\node.exe"
> "%TPR6_OUT%" echo REPORT=THEME_PROVISIONAL_R6_PRICE_BRIDGE_READONLY
if errorlevel 1 goto :unwritable
if not exist "%TPR6_SCRIPT%" (
  >> "%TPR6_OUT%" echo STATUS=SCRIPT_MISSING_EXTRACT_BOTH_FILES
  goto :finished
)
if not exist "%TPR6_NODE%" (
  >> "%TPR6_OUT%" echo STATUS=APPROVED_E_DRIVE_NODE_NOT_FOUND
  goto :finished
)
"%TPR6_NODE%" "%TPR6_SCRIPT%" "%TPR6_OUT%"
if errorlevel 1 >> "%TPR6_OUT%" echo CMD_STATUS=REVIEW_DIAGNOSTIC_ERROR
:finished
echo.
echo ZGMINI R6 read-only price bridge inspection completed.
echo Result: %TPR6_OUT%
echo.
type "%TPR6_OUT%"
echo.
echo Send THEME_PROVISIONAL_R6_PRICE_BRIDGE_RESULT.txt to Sumin.
pause
exit /b 0
:unwritable
echo Cannot create TXT here. Extract the ZIP contents to Desktop.
pause
exit /b 1
