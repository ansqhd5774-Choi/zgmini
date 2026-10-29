@echo off
setlocal
cd /d "%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE%" (
 echo R38_NODE_RUNTIME_NOT_FOUND
 exit /b 2
)
"%NODE%" "%~dp0market-calendar-r38-census-inventory.mjs"
set "RC=%ERRORLEVEL%"
echo R38_RESULT=%~dp0MARKET_CALENDAR_R38_CENSUS_INVENTORY_RESULT.txt
exit /b %RC%
