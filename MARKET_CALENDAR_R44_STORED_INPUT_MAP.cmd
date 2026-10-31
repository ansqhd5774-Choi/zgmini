@echo off
setlocal EnableExtensions
set "ZGM_BUNDLE=%~dp0"
set "ZGM_NODE=E:\ZGmini\runtime\node.exe"
set "ZGM_PC_ROOT=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "ZGM_PC_ROOT=%ZGMINI_PC_HOME%"
set "ZGM_RESULT=%ZGM_BUNDLE%MARKET_CALENDAR_R44_STORED_INPUT_RESULT.txt"
if exist "%ZGM_RESULT%" (
  echo Existing result is preserved: "%ZGM_RESULT%"
  echo Move the old result before running again.
  exit /b 2
)
if not exist "%ZGM_NODE%" (
  echo {"status":"PC_NODE_NOT_FOUND","providerCalls":0,"pcDataWrites":0} > "%ZGM_RESULT%"
  exit /b 3
)
"%ZGM_NODE%" "%ZGM_BUNDLE%market-calendar-r44-stored-input-bridge.mjs" --base="%ZGM_PC_ROOT%" > "%ZGM_RESULT%" 2>&1
set "ZGM_CODE=%ERRORLEVEL%"
echo Result: "%ZGM_RESULT%"
exit /b %ZGM_CODE%
