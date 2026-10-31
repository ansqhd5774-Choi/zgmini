@echo off
setlocal
cd /d "%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE%" (
 echo R59_NODE_MISSING_STOP
 pause
 exit /b 2
)
set "SOURCE=%~1"
if "%SOURCE%"=="" (
 echo R58.3 source folder path required ^(contains PRIVATE_SHADOW.json^).
 set /p "SOURCE=R58.3 folder path: "
)
if "%SOURCE%"=="" (
 echo R59_SOURCE_FOLDER_REQUIRED_STOP
 pause
 exit /b 2
)
"%NODE%" "%~dp0R59_PC_ANNUAL_PUBLISH.mjs" "%SOURCE%"
set "CODE=%ERRORLEVEL%"
pause
exit /b %CODE%
