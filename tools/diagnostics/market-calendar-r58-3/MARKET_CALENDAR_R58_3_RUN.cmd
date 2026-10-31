@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if errorlevel 1 (
 echo STATUS=R58_3_DIR_INACCESSIBLE_STOP
 pause
 exit /b 2
)
set "REPORT=%~dp0MARKET_CALENDAR_R58_3_RESULT.txt"
set "OLD=%~dp0MARKET_CALENDAR_R58_FHS_R3_RESULT.txt"
set "PRIVATE=%~dp0MARKET_CALENDAR_R58_FHS_R3_PRIVATE_SHADOW.json"
set "TRACE=%~dp0MARKET_CALENDAR_R58_3_TRACE_LOCAL.txt"
set "NODE=E:\ZGmini\runtime\node.exe"
echo R58_3_UNIFIED_OFFLINE_PILOT
echo Use only one complete extracted ZIP folder.
if exist "%REPORT%" goto :EXISTS
if exist "%OLD%" goto :EXISTS
if exist "%PRIVATE%" goto :EXISTS
if exist "%TRACE%" goto :EXISTS
if not exist "%NODE%" (
 call :STOP R58_3_APPROVED_NODE_MISSING_STOP
 goto :END
)
if not exist "%~dp0R58_3_LAUNCH.mjs" (
 call :STOP R58_3_LAUNCH_SCRIPT_MISSING_STOP
 goto :END
)
"%NODE%" "%~dp0R58_3_LAUNCH.mjs"
set "RC=%ERRORLEVEL%"
if not exist "%REPORT%" (
 call :STOP R58_3_NODE_NO_REPORT_STOP
 >>"%REPORT%" echo nodeExitCode=%RC%
)
goto :END
:EXISTS
echo STATUS=R58_3_PRIOR_ARTIFACT_EXISTS_STOP
set "RC=2"
goto :END
:STOP
if not exist "%REPORT%" (
 >"%REPORT%" echo AUDIT=MARKET_CALENDAR_R58_3_UNIFIED
 >>"%REPORT%" echo status="%~1"
 >>"%REPORT%" echo executionComplete=false
 >>"%REPORT%" echo providerRequests=0
 >>"%REPORT%" echo dbWrites=0
 >>"%REPORT%" echo d1Writes=0
 >>"%REPORT%" echo publicImportanceStarsChanged=false
)
echo STATUS=%~1
set "RC=2"
exit /b 0
:END
echo.
echo STATUS_FILE=MARKET_CALENDAR_R58_3_RESULT.txt
echo Send only R58_3_RESULT.txt. Keep PRIVATE_SHADOW.json on your PC.
echo Do not repeat if status is STOP or output files exist.
pause
exit /b %RC%
