@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R80: install ONE pinned PC D1 publisher fix, then call approved R54 ONCE.
rem No biotech rerun, no raw collection, no scheduler/formula changes.
set "R80_NODE=E:\ZGmini\runtime\node.exe"
set "R80_HELPER=%~dp0theme-ten-r80-rebase-once.mjs"
set "R80_LOG=%~dp0THEME_TEN_R80_PATCH_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%R80_LOG%" goto collision
>"%R80_LOG%" echo REPORT=R80_R54_SAME_DATE_LEGACY_PROVISIONAL_CAS_REPAIR
>>"%R80_LOG%" echo TASK_CHANGES=0 FORMULA_CHANGES=0 NEW_THEMES=0 RAW_FALLBACKS=0
if not exist "%R80_NODE%" goto missing
if not exist "%R80_HELPER%" goto missing
"%R80_NODE%" "%R80_HELPER%" --once --repair --publish >>"%R80_LOG%" 2>&1
set "R80_EXIT=%ERRORLEVEL%"
goto done
:missing
>>"%R80_LOG%" echo RESULT=STOP_NODE_OR_HELPER_MISSING
set "R80_EXIT=2"
goto done
:collision
echo RESULT=STOP_RESULT_FILENAME_COLLISION
pause
exit /b 3
:done
>>"%R80_LOG%" echo NODE_EXIT=%R80_EXIT%
echo RESULT_FILE=%R80_LOG%
type "%R80_LOG%"
pause
exit /b %R80_EXIT%
