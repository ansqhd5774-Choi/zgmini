@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE%" (
 echo STATUS=R59_NODE_NOT_FOUND_STOP
 echo Node path expected: E:\ZGmini\runtime\node.exe
 pause
 exit /b 2
)
if not exist "%~dp0R59_FIND_SOURCE.mjs" (
 echo STATUS=R59_SOURCE_HELPER_MISSING_STOP
 pause
 exit /b 2
)
if not exist "%~dp0market-calendar-fhs-r3-public.mjs" (
 echo STATUS=R59_CONTRACT_MISSING_STOP
 pause
 exit /b 2
)
echo R59.2 annual-only lock; existing PC Core schedule and lock are untouched.
"%NODE%" "%~dp0R59_PC_ANNUAL_PUBLISH.mjs" "%~1"
set "R59_EXIT=%ERRORLEVEL%"
echo R59 exit code: %R59_EXIT%
echo Review MARKET_CALENDAR_R59_PUBLISH_RESULT.txt in this folder.
if not "%R59_EXIT%"=="0" echo STOP: Do not delete existing outputs or retry without reviewing the result.
pause
exit /b %R59_EXIT%
