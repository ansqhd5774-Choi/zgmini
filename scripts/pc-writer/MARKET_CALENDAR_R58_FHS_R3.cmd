@echo off
setlocal DisableDelayedExpansion
cd /d "%~dp0"
if errorlevel 1 (
 echo STATUS=R58_OUTPUT_DIRECTORY_UNAVAILABLE_STOP
 pause
 exit /b 2
)
set "R58_RESULT=%~dp0MARKET_CALENDAR_R58_FHS_R3_RESULT.txt"
set "R58_NODE=E:\ZGmini\runtime\node.exe"
set "R58_RUNNER=%~dp0scripts\fhs-r3-private-pilot.mjs"
echo R58_FHS_R3_SAFE_LAUNCH
echo OUTPUT_FOLDER=%~dp0
if exist "%R58_RESULT%" (
 echo STATUS=R58_RESULT_ALREADY_EXISTS_STOP
 echo EXISTING_RESULT_PRESERVED
 pause
 exit /b 2
)
if exist "%~dp0MARKET_CALENDAR_R58_FHS_R3_PRIVATE_SHADOW.json" (
 call :WRITE_STOP R58_PRIVATE_SHADOW_EXISTS_STOP
 pause
 exit /b 2
)
if not exist "%R58_NODE%" (
 call :WRITE_STOP R58_APPROVED_NODE_MISSING_STOP
 pause
 exit /b 2
)
if not exist "%R58_RUNNER%" (
 call :WRITE_STOP R58_PACKAGE_INCOMPLETE_STOP
 pause
 exit /b 2
)
"%R58_NODE%" "%R58_RUNNER%" "E:\ZGmini\data\pc-writer" "%~dp0"
set "R58_EXIT=%ERRORLEVEL%"
if not exist "%R58_RESULT%" (
 call :WRITE_STOP R58_NODE_EXITED_WITHOUT_RESULT_STOP
 set "R58_EXIT=2"
)
if exist "%R58_RESULT%" (
 echo RESULT_PRESENT=%R58_RESULT%
) else (
 echo STATUS=R58_RESULT_WRITE_FAILED_STOP
 echo CHECK_OUTPUT_FOLDER_PERMISSIONS
)
echo EXIT_CODE=%R58_EXIT%
echo.
echo [IMPORTANT] Report only the RESULT.txt. Keep PRIVATE_SHADOW.json on this PC.
pause
exit /b %R58_EXIT%

:WRITE_STOP
if not exist "%R58_RESULT%" (
 >"%R58_RESULT%" echo AUDIT=MARKET_CALENDAR_R58_FHS_R3
 >>"%R58_RESULT%" echo status="%~1"
 >>"%R58_RESULT%" echo executionComplete=false
 >>"%R58_RESULT%" echo providerRequests=0
 >>"%R58_RESULT%" echo dbWrites=0
 >>"%R58_RESULT%" echo d1Writes=0
 >>"%R58_RESULT%" echo publicImportanceStarsChanged=false
 >>"%R58_RESULT%" echo note="LAUNCH_STOP_NO_SCORE_VERIFIED"
)
echo STATUS=%~1
exit /b 0
