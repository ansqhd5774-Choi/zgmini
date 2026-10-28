@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Read-only report of existing R47/R48 and R54 cycle logs.
rem No data collection, calculation, publication, task or configuration change.
set "R56_ROOT=%~dp0"
set "R56_R48=E:\ZGmini\data\pc-writer\theme-nine-r48"
set "R56_R54=E:\ZGmini\data\pc-writer\theme-nine-r54\logs"
set "R56_OUT=%R56_ROOT%THEME_NINE_R56_EXISTING_LOGS_%RANDOM%_%RANDOM%.txt"
if exist "%R56_OUT%" goto :collision
>"%R56_OUT%" echo REPORT=THEME_NINE_R56_EXISTING_LOGS_READ_ONLY
>>"%R56_OUT%" echo STARTED=%DATE% %TIME%
>>"%R56_OUT%" echo DATA_COLLECTION=NO
>>"%R56_OUT%" echo D1_WRITES=0
>>"%R56_OUT%" echo TASK_CHANGES=0

set "R56_R48_LAST="
if exist "%R56_R48%\" for /f "delims=" %%F in ('dir /b /a:-d /o:-d "%R56_R48%\THEME_NINE_R48_PRIVATE_CYCLE_*.txt" 2^>nul') do if not defined R56_R48_LAST set "R56_R48_LAST=%%F"
if not defined R56_R48_LAST goto :no_r48
>>"%R56_OUT%" echo R48_LOG=%R56_R48%\%R56_R48_LAST%
type "%R56_R48%\%R56_R48_LAST%" >>"%R56_OUT%" 2>&1
goto :r54
:no_r48
>>"%R56_OUT%" echo R48_LOG=NOT_FOUND

:r54
set "R56_R54_LAST="
if exist "%R56_R54%\" for /f "delims=" %%F in ('dir /b /a:-d /o:-d "%R56_R54%\THEME_NINE_R54_CYCLE_*.txt" 2^>nul') do if not defined R56_R54_LAST set "R56_R54_LAST=%%F"
if not defined R56_R54_LAST goto :no_r54
>>"%R56_OUT%" echo R54_LOG=%R56_R54%\%R56_R54_LAST%
type "%R56_R54%\%R56_R54_LAST%" >>"%R56_OUT%" 2>&1
goto :done
:no_r54
>>"%R56_OUT%" echo R54_LOG=NOT_FOUND

:done
>>"%R56_OUT%" echo RESULT=EXISTING_LOGS_COLLECTED_NO_ACTION
echo RESULT_FILE=%R56_OUT%
type "%R56_OUT%"
pause
exit /b 0

:collision
echo RESULT=STOP_RESULT_FILENAME_COLLISION
pause
exit /b 2
