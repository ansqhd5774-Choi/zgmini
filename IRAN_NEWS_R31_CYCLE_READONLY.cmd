@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R31 FIX1: Offline read-only observation with a persistent launcher log.
rem Never run, create, or change a scheduled task.
set "ZG_R31_TOOL=%~dp0scripts\iran-progress\news-display-cycle-verify-r31.mjs"
set "ZG_R31_LOG=%~dp0IRAN_NEWS_R31_LAUNCH_RESULT.txt"
>> "%ZG_R31_LOG%" echo R31_LAUNCH_BEGIN
if errorlevel 1 goto :log_unwritable
if not exist "%ZG_R31_TOOL%" goto :missing_tool
set "ZG_R31_NODE="
where node.exe >nul 2>nul
if not errorlevel 1 set "ZG_R31_NODE=node.exe"
if not defined ZG_R31_NODE if exist "E:\ZGmini\runtime\node.exe" set "ZG_R31_NODE=E:\ZGmini\runtime\node.exe"
if not defined ZG_R31_NODE goto :missing_node
>> "%ZG_R31_LOG%" echo R31_TOOL_AND_NODE_FOUND
"%ZG_R31_NODE%" "%ZG_R31_TOOL%" >> "%ZG_R31_LOG%" 2>&1
set "ZG_R31_RC=%ERRORLEVEL%"
if not "%ZG_R31_RC%"=="0" goto :observation_unverified
>> "%ZG_R31_LOG%" echo FINAL_STATUS=PASS_R31_RECENT_OUTPUT_OBSERVED
echo R31 observation finished. Open the timestamped report in this folder.
echo Launcher log: "%ZG_R31_LOG%"
pause
exit /b 0

:missing_tool
>> "%ZG_R31_LOG%" echo FINAL_STATUS=STOP_R31_PACKAGE_INCOMPLETE
echo STOP: Extract the WHOLE R31 FIX1 ZIP first. The scripts folder is missing.
goto :failed

:missing_node
>> "%ZG_R31_LOG%" echo FINAL_STATUS=STOP_R31_NODE_MISSING
echo STOP: Node was not found on PATH or at E:\ZGmini\runtime\node.exe.
goto :failed

:observation_unverified
>> "%ZG_R31_LOG%" echo FINAL_STATUS=STOP_R31_OBSERVATION_REQUIRES_REVIEW
echo R31 could not confirm a recent R29 observation. See the launcher and report files.
goto :failed

:log_unwritable
echo STOP: Cannot create the launcher log in the extracted ZIP folder.
echo Move the extracted folder to a writable location such as Desktop.
goto :failed

:failed
echo Launcher log path: "%ZG_R31_LOG%"
pause
exit /b 1
