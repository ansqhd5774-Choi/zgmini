@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Approved existing R54 + biotech R8 only. May publish approved D1 output.
rem Guarded by exact private/public date, consent, task window and reader check.
set "R77_NODE=E:\ZGmini\runtime\node.exe"
set "R77_SCRIPT=%~dp0theme-ten-r77-retry-gate.mjs"
set "R77_LOG=%~dp0THEME_TEN_R77_APPROVED_PUBLISH_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%R77_LOG%" exit /b 3
>"%R77_LOG%" echo REPORT=R77_EXISTING_R54_AND_BIOTECH_R8_ONCE
>>"%R77_LOG%" echo TASK_CHANGES=0 FORMULA_CHANGES=0 NEW_THEMES=0
echo This can publish already approved R54 and biotech R8 dated scores to D1.
echo No change to schedules, new theme settings or other seven theme definitions.
set "R77_CONFIRM="
set /p "R77_CONFIRM=Type RUN to perform the approved one-time publication retry: "
if /I not "%R77_CONFIRM%"=="RUN" goto :cancelled
if not exist "%R77_NODE%" goto :missing
if not exist "%R77_SCRIPT%" goto :missing
"%R77_NODE%" "%R77_SCRIPT%" --once >>"%R77_LOG%" 2>&1
set "R77_EXIT=%ERRORLEVEL%"
>>"%R77_LOG%" echo NODE_EXIT=%R77_EXIT%
goto :done
:cancelled
>>"%R77_LOG%" echo RESULT=NOT_CONFIRMED
set "R77_EXIT=2"
goto :done
:missing
>>"%R77_LOG%" echo RESULT=APPROVED_RUNTIME_OR_SCRIPT_MISSING
set "R77_EXIT=4"
:done
echo RESULT_FILE=%R77_LOG%
type "%R77_LOG%"
pause
exit /b %R77_EXIT%
