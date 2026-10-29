@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R81: verify existing approved R8/seven credential BEFORE patching R54.
rem Reuse R80 gate; no login, secrets, schedules, raw bars or formula changes.
set "R81_NODE=E:\ZGmini\runtime\node.exe"
set "R81_SCRIPT=%~dp0theme-ten-r81-seven-auth-once.mjs"
set "R81_LOG=%~dp0THEME_TEN_R81_AUTH_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%R81_LOG%" goto collision
>"%R81_LOG%" echo REPORT=R81_APPROVED_SEVEN_AUTH_R54_ONLY
>>"%R81_LOG%" echo NEW_THEMES=0 FORMULA_CHANGES=0 SCHEDULE_CHANGES=0 RAW_REWRITES=0
if not exist "%R81_NODE%" goto missing
if not exist "%R81_SCRIPT%" goto missing
"%R81_NODE%" "%R81_SCRIPT%" --once --repair --publish >>"%R81_LOG%" 2>&1
set "R81_EXIT=%ERRORLEVEL%"
goto done
:missing
>>"%R81_LOG%" echo RESULT=STOP_NODE_OR_R81_HELPER_MISSING
set "R81_EXIT=2"
goto done
:collision
echo RESULT=STOP_RESULT_FILENAME_COLLISION
pause
exit /b 3
:done
>>"%R81_LOG%" echo NODE_EXIT=%R81_EXIT%
echo RESULT_FILE=%R81_LOG%
type "%R81_LOG%"
pause
exit /b %R81_EXIT%
