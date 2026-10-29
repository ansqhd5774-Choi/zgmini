@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Resync only the already-approved R54 after R78 biotech R8 publication.
rem This does NOT run biotech again, collect raw bars, or modify tasks/formulas.
set "R79_NODE=E:\ZGmini\runtime\node.exe"
set "R79_HELPER=%~dp0theme-ten-r79-r54-resync.mjs"
set "R79_LOG=%~dp0THEME_TEN_R79_R54_ONLY_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%R79_LOG%" goto collision
>"%R79_LOG%" echo REPORT=R79_EXISTING_APPROVED_R54_ONLY_AFTER_BIOTECH
>>"%R79_LOG%" echo TASK_CHANGES=0 FORMULA_CHANGES=0 NEW_THEMES=0 RAW_FALLBACKS=0
if not exist "%R79_NODE%" goto missing
if not exist "%R79_HELPER%" goto missing
"%R79_NODE%" "%R79_HELPER%" --once >>"%R79_LOG%" 2>&1
set "R79_EXIT=%ERRORLEVEL%"
goto done
:missing
>>"%R79_LOG%" echo RESULT=STOP_APPROVED_NODE_OR_HELPER_NOT_FOUND
set "R79_EXIT=2"
goto done
:collision
echo RESULT=STOP_RESULT_FILENAME_COLLISION
pause
exit /b 3
:done
>>"%R79_LOG%" echo NODE_EXIT=%R79_EXIT%
echo RESULT_FILE=%R79_LOG%
type "%R79_LOG%"
pause
exit /b %R79_EXIT%
