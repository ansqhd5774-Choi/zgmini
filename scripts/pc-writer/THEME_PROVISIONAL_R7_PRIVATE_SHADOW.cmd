@echo off
setlocal DisableDelayedExpansion
title ZGMINI Provisional R7 Private Score Shadow
set "TPR7_OUT=%~dp0THEME_PROVISIONAL_R7_PRIVATE_SHADOW_RESULT.txt"
set "TPR7_SCRIPT=%~dp0THEME_PROVISIONAL_R7_PRIVATE_SHADOW.mjs"
set "TPR7_NODE=E:\ZGmini\runtime\node.exe"
> "%TPR7_OUT%" echo REPORT=THEME_PROVISIONAL_R7_PRIVATE_SHADOW
if errorlevel 1 goto :unwritable
if not exist "%TPR7_SCRIPT%" (
  >> "%TPR7_OUT%" echo R7_STATUS=SCRIPT_MISSING_EXTRACT_COMPLETE_ZIP
  goto :finished
)
if not exist "%~dp0r7_approved\theme-space-satellite-basket-r27-pure.mjs" (
  >> "%TPR7_OUT%" echo R7_STATUS=APPROVED_MODULES_MISSING_EXTRACT_COMPLETE_ZIP
  goto :finished
)
if not exist "%TPR7_NODE%" (
  >> "%TPR7_OUT%" echo R7_STATUS=APPROVED_E_DRIVE_NODE_NOT_FOUND
  goto :finished
)
"%TPR7_NODE%" "%TPR7_SCRIPT%" "%TPR7_OUT%"
if errorlevel 1 >> "%TPR7_OUT%" echo CMD_STATUS=REVIEW_DIAGNOSTIC_ERROR
:finished
echo.
echo ZGMINI R7 private-only calculation completed.
echo Result: %TPR7_OUT%
echo.
type "%TPR7_OUT%"
echo.
echo Send THEME_PROVISIONAL_R7_PRIVATE_SHADOW_RESULT.txt to Sumin.
pause
exit /b 0
:unwritable
echo Cannot create TXT here. Extract the ZIP to Desktop.
pause
exit /b 1
