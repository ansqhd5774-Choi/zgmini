@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R82: One read-only PC diagnosis; NO provider, D1, or task writes.
set "R82_NODE=E:\ZGmini\runtime\node.exe"
set "R82_DATA=E:\ZGmini\data"
set "R82_SCRIPT=%~dp0theme-ten-r82-optional-runtime-readonly.mjs"
set "R82_SHA=63c60244b916b8bdcc0c30ad1fa182e8046dec8bc7b0121be6c629fbc319bad8"
set "R82_LOG=%~dp0THEME_TEN_R82_DIAG_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%R82_LOG%" goto collision
>"%R82_LOG%" echo REPORT=THEME_TEN_R82_OPTIONAL_RUNTIME_READONLY
>>"%R82_LOG%" echo NEW_THEMES=0 FORMULA_CHANGES=0 SCHEDULE_CHANGES=0 RAW_WRITES=0 D1_WRITES=0
if not exist "%R82_NODE%" goto missing
if not exist "%R82_DATA%" goto missing
if not exist "%R82_SCRIPT%" goto missing
"%R82_NODE%" -e "const f=require('node:fs');const c=require('node:crypto');process.exit(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:2)" "%R82_SCRIPT%" "%R82_SHA%" >>"%R82_LOG%" 2>&1
if errorlevel 1 goto hash
>>"%R82_LOG%" echo SOURCE_SHA256_VERIFIED=YES
"%R82_NODE%" "%R82_SCRIPT%" --read-only >>"%R82_LOG%" 2>&1
set "R82_EXIT=%ERRORLEVEL%"
>>"%R82_LOG%" echo NODE_EXIT=%R82_EXIT%
type "%R82_LOG%"
echo.
echo Attach THEME_TEN_R82_DIAG_RESULT_*.txt to ChatGPT. Do not rerun after STOP.
pause
exit /b %R82_EXIT%
:hash
>>"%R82_LOG%" echo STOP_R82=SOURCE_SHA_MISMATCH
goto failed
:missing
>>"%R82_LOG%" echo STOP_R82=NODE_DATA_OR_SCRIPT_MISSING
goto failed
:collision
echo STOP_R82=RESULT_FILE_COLLISION
pause
exit /b 1
:failed
>>"%R82_LOG%" echo NODE_EXIT=1
type "%R82_LOG%"
pause
exit /b 1
