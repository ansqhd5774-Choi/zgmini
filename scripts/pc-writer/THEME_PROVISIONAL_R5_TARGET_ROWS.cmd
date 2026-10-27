@echo off
setlocal DisableDelayedExpansion
title ZGMINI Provisional R5 Read-Only Parquet Rows
set "TPR5_OUT=%~dp0THEME_PROVISIONAL_R5_TARGET_ROWS_RESULT.txt"
set "TPR5_SCRIPT=%~dp0THEME_PROVISIONAL_R5_TARGET_ROWS.mjs"
set "TPR5_NODE=E:\ZGmini\runtime\node.exe"
> "%TPR5_OUT%" echo REPORT=THEME_PROVISIONAL_R5_TARGET_ROWS_READONLY
if errorlevel 1 goto :unwritable
if not exist "%TPR5_SCRIPT%" (
  >> "%TPR5_OUT%" echo STATUS=SCRIPT_MISSING_EXTRACT_BOTH_FILES
  goto :finished
)
if not exist "%TPR5_NODE%" (
  >> "%TPR5_OUT%" echo STATUS=APPROVED_E_DRIVE_NODE_NOT_FOUND
  goto :finished
)
"%TPR5_NODE%" "%TPR5_SCRIPT%" "%TPR5_OUT%"
if errorlevel 1 >> "%TPR5_OUT%" echo CMD_STATUS=REVIEW_DIAGNOSTIC_ERROR
:finished
echo.
echo ZGMINI R5 read-only inspection completed.
echo Result: %TPR5_OUT%
echo.
type "%TPR5_OUT%"
echo.
echo Send THEME_PROVISIONAL_R5_TARGET_ROWS_RESULT.txt to Sumin.
pause
exit /b 0
:unwritable
echo Cannot create TXT here. Extract the ZIP contents to Desktop.
pause
exit /b 1
