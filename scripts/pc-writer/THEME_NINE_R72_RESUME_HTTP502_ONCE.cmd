@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R72: inspect, snapshot backup, clear ONE exact 502 flag, retry existing R48.
rem Mutates only the approved private R35 checkpoint, not raw pages or D1.
set "R72_HOME=%~dp0"
set "R72_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "R72_NODE=E:\ZGmini\runtime\node.exe"
set "R72_LOG=%R72_HOME%THEME_NINE_R72_RECOVER_%RANDOM%_%RANDOM%.txt"
if exist "%R72_LOG%" exit /b 2
>"%R72_LOG%" echo REPORT=THEME_NINE_R72_HTTP502_PRIVATE_RESUME
"%R72_NODE%" "%R72_HOME%theme-nine-r72-transient-checkpoint-recover.mjs" --inspect >>"%R72_LOG%" 2>&1
if errorlevel 1 goto :stop
echo.
echo The last private run stopped at HTTP 502 after saving raw pages.
echo R72 will BACK UP one failed checkpoint, clear only its 502 failure marker,
echo and retry existing R48 ONCE. No raw deletion, D1, or task changes.
set "R72_CONFIRM="
set /p R72_CONFIRM=Type RESUME to continue: 
if /I not "%R72_CONFIRM%"=="RESUME" goto :cancel
"%R72_NODE%" "%R72_HOME%theme-nine-r72-transient-checkpoint-recover.mjs" --recover-and-run >>"%R72_LOG%" 2>&1
if errorlevel 1 goto :stop
>>"%R72_LOG%" echo RESULT=R72_PRIVATE_RETRY_RETURNED_ZERO_CHECK_DATES
goto :done
:cancel
>>"%R72_LOG%" echo RESULT=R72_INSPECTION_ONLY_CANCELLED
goto :done
:stop
>>"%R72_LOG%" echo RESULT=R72_STOP_OR_RETRY_INCOMPLETE
:done
type "%R72_LOG%"
echo RESULT_FILE=%R72_LOG%
exit /b 0
