@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R71: safe preflight + ONE existing private-only R48 cycle. NO task or D1 changes.
set "R71_HOME=%~dp0"
set "R71_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "R71_NODE=E:\ZGmini\runtime\node.exe"
set "R71_LOG=%R71_HOME%THEME_NINE_R71_PRIVATE_RECOVERY_%RANDOM%_%RANDOM%.txt"
if exist "%R71_LOG%" exit /b 2
>"%R71_LOG%" echo REPORT=THEME_NINE_R71_EXISTING_PRIVATE_CYCLE_ONCE
>>"%R71_LOG%" echo D1_WRITES_BY_WRAPPER=0
>>"%R71_LOG%" echo TASK_WRITES_BY_WRAPPER=0
"%R71_NODE%" "%R71_HOME%theme-nine-r71-private-recovery-once.mjs" --check >>"%R71_LOG%" 2>&1
if errorlevel 1 goto :stop
echo.
echo R71 can run the installed R48 private data collection ONE time.
echo It may call GetMarketHistory and update private E: files only.
echo It does not edit scheduled tasks, D1, or public scores.
set "R71_CONFIRM="
set /p R71_CONFIRM=Type RUN to continue: 
if /I not "%R71_CONFIRM%"=="RUN" goto :cancel
"%R71_NODE%" "%R71_HOME%theme-nine-r71-private-recovery-once.mjs" --run >>"%R71_LOG%" 2>&1
if errorlevel 1 goto :stop
>>"%R71_LOG%" echo RESULT=R71_PRIVATE_RUN_RETURNED_ZERO_CHECK_SOURCE_DAY
goto :done
:cancel
>>"%R71_LOG%" echo RESULT=R71_CHECK_ONLY_CANCELLED
goto :done
:stop
>>"%R71_LOG%" echo RESULT=R71_STOP_CHECK_REPORT
:done
type "%R71_LOG%"
echo RESULT_FILE=%R71_LOG%
exit /b 0
