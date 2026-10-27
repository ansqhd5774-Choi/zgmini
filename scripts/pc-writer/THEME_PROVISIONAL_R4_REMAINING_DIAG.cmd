@echo off
setlocal DisableDelayedExpansion
title ZGMINI R4 Provisional Two-Theme Read Only Diagnosis
set "TPR4_RESULT=%~dp0THEME_PROVISIONAL_R4_REMAINING_RESULT.txt"
set "TPR4_SCRIPT=%~dp0THEME_PROVISIONAL_R4_REMAINING_DIAG.mjs"
set "TPR4_NODE=E:\ZGmini\runtime\node.exe"
> "%TPR4_RESULT%" echo REPORT=THEME_PROVISIONAL_R4_REMAINING_READONLY
if errorlevel 1 goto :unwritable
if not exist "%TPR4_SCRIPT%" (
  >> "%TPR4_RESULT%" echo STATUS=SCRIPT_MISSING_EXTRACT_ZIP_FIRST
  goto :finish
)
if not exist "%TPR4_NODE%" (
  >> "%TPR4_RESULT%" echo STATUS=APPROVED_E_DRIVE_NODE_NOT_FOUND
  goto :finish
)
"%TPR4_NODE%" "%TPR4_SCRIPT%" "%TPR4_RESULT%"
if errorlevel 1 >> "%TPR4_RESULT%" echo CMD_STATUS=DIAGNOSTIC_ERROR_REVIEW_ABOVE
:finish
echo.
echo ZGMINI R4 READ ONLY DIAGNOSIS
echo Report: %TPR4_RESULT%
echo.
type "%TPR4_RESULT%"
echo.
echo Send THEME_PROVISIONAL_R4_REMAINING_RESULT.txt to Sumin.
pause
exit /b 0
:unwritable
echo Cannot create TXT in this folder. Extract the ZIP to Desktop.
pause
exit /b 1
