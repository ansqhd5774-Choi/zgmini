@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R78 exact two-file repair, then previously approved R77 publisher retry.
rem No task, formula, raw price, ETF roster or other feed changes.
set "R78_NODE=E:\ZGmini\runtime\node.exe"
set "R78_SCRIPT=%~dp0theme-ten-r78-repair-and-retry.mjs"
set "R78_LOG=%~dp0THEME_TEN_R78_REPAIR_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%R78_LOG%" exit /b 3
>"%R78_LOG%" echo REPORT=R78_R51_R37_TWO_FILE_REPAIR_AND_APPROVED_R77_RETRY
>>"%R78_LOG%" echo TASK_CHANGES=0 FORMULA_CHANGES=0 NEW_THEMES=0
echo The existing R51/R37 provisional-date contract will be repaired.
echo The existing approved R54/R8 publisher may then write D1.
echo No scheduled task, source price, formula or theme roster is changed.
set "R78_CONFIRM="
set /p "R78_CONFIRM=Type RUN for the two-file fix and approved publication retry: "
if /I not "%R78_CONFIRM%"=="RUN" goto :cancelled
if not exist "%R78_NODE%" goto :missing
if not exist "%R78_SCRIPT%" goto :missing
"%R78_NODE%" "%R78_SCRIPT%" --once --repair --publish >>"%R78_LOG%" 2>&1
set "R78_EXIT=%ERRORLEVEL%"
>>"%R78_LOG%" echo NODE_EXIT=%R78_EXIT%
goto :done
:cancelled
>>"%R78_LOG%" echo RESULT=NOT_CONFIRMED
set "R78_EXIT=2"
goto :done
:missing
>>"%R78_LOG%" echo RESULT=APPROVED_RUNTIME_OR_SCRIPT_MISSING
set "R78_EXIT=4"
:done
echo RESULT_FILE=%R78_LOG%
type "%R78_LOG%"
pause
exit /b %R78_EXIT%
