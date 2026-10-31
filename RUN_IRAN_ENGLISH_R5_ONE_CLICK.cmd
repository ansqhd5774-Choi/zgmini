@echo off
setlocal DisableDelayedExpansion
title ZGMINI - IRAN ENGLISH R5 SAFE PREVIEW
echo.
echo ZGMINI IRAN ENGLISH R5 - SAFE ONE-CLICK PREVIEW
echo Shadow diagnostics only. No public score, database, or scheduler changes.
echo.
set "ZG_R5_NODE="
if defined ZGMINI_NODE_EXE set "ZG_R5_NODE=%ZGMINI_NODE_EXE%"
if not defined ZG_R5_NODE if exist "E:\ZGmini\runtime\node.exe" set "ZG_R5_NODE=E:\ZGmini\runtime\node.exe"
if not defined ZG_R5_NODE if exist "%ProgramFiles%\nodejs\node.exe" set "ZG_R5_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined ZG_R5_NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "ZG_R5_NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined ZG_R5_NODE for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined ZG_R5_NODE set "ZG_R5_NODE=%%N"
if not defined ZG_R5_NODE goto no_node
if not exist "%ZG_R5_NODE%" goto no_node
"%ZG_R5_NODE%" -e "process.exit(Number(process.versions.node.split('.')[0])>=24?0:1)" >nul 2>&1
if errorlevel 1 goto no_node
if "%~1"=="" (
  "%ZG_R5_NODE%" "%~dp0tools\iran-r5-oneclick-setup.mjs"
) else (
  "%ZG_R5_NODE%" "%~dp0tools\iran-r5-oneclick-setup.mjs" "%~1"
)
set "ZG_R5_EXIT=%ERRORLEVEL%"
echo.
echo Result: %~dp0IRAN_ENGLISH_SCORE_R5_INSTALL_RESULT.txt
if not "%ZG_R5_EXIT%"=="0" echo [BLOCKED] Check the result file. Existing scheduled tasks were not changed.
echo.
pause
exit /b %ZG_R5_EXIT%
:no_node
echo ZGMINI IRAN ENGLISH R5 - NODE PRECHECK FAILED >"%~dp0IRAN_ENGLISH_SCORE_R5_INSTALL_RESULT.txt"
echo ERROR=NODE_24_OR_HIGHER_NOT_AVAILABLE >>"%~dp0IRAN_ENGLISH_SCORE_R5_INSTALL_RESULT.txt"
echo FINAL_STATUS=BLOCKED_NO_SCORE_OR_TASK_CHANGE >>"%~dp0IRAN_ENGLISH_SCORE_R5_INSTALL_RESULT.txt"
type "%~dp0IRAN_ENGLISH_SCORE_R5_INSTALL_RESULT.txt"
echo.
pause
exit /b 2
