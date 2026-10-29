@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R83: restore existing missing data-center R5 scheduled runner only.
rem Never create/modify Task Scheduler definitions or publish to D1.
set "R83_NODE=E:\ZGmini\runtime\node.exe"
set "R83_SCRIPT=%~dp0theme-ten-r83-dc-runner-restore.mjs"
set "R83_R5_TOOL=%~dp0theme-data-center-power-task-r5.mjs"
set "R83_SHA=ea85a99eb662b329f20ed1ecfba9dd653a15341b6861e7758fa868efff222f4d"
set "R83_TOOL_SHA=197ef4760931d787d8857a4579e13b6f94d5d1bd2c5c20424ce685e60c8f1426"
set "R83_LOG=%~dp0THEME_TEN_R83_DC_RESTORE_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%R83_LOG%" goto collision
>"%R83_LOG%" echo REPORT=THEME_TEN_R83_DC_RUNNER_RESTORE
>>"%R83_LOG%" echo NEW_THEMES=0 FORMULA_CHANGES=0 TASK_CHANGES=0 D1_WRITES=0
if not exist "%R83_NODE%" goto missing
if not exist "%R83_SCRIPT%" goto missing
if not exist "%R83_R5_TOOL%" goto missing
"%R83_NODE%" -e "const f=require('node:fs'),c=require('node:crypto');process.exit(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:2)" "%R83_SCRIPT%" "%R83_SHA%" >>"%R83_LOG%" 2>&1
if errorlevel 1 goto hash
"%R83_NODE%" -e "const f=require('node:fs'),c=require('node:crypto');process.exit(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:2)" "%R83_R5_TOOL%" "%R83_TOOL_SHA%" >>"%R83_LOG%" 2>&1
if errorlevel 1 goto hash
>>"%R83_LOG%" echo R83_AND_R5_SOURCE_SHA256_VERIFIED=YES
"%R83_NODE%" "%R83_SCRIPT%" --restore-once >>"%R83_LOG%" 2>&1
set "R83_EXIT=%ERRORLEVEL%"
>>"%R83_LOG%" echo NODE_EXIT=%R83_EXIT%
type "%R83_LOG%"
echo.
echo Send THEME_TEN_R83_DC_RESTORE_RESULT_*.txt to ChatGPT.
echo Do not rerun automatically after STOP or REVIEW.
pause
exit /b %R83_EXIT%
:hash
>>"%R83_LOG%" echo STOP_R83=SOURCE_SHA_MISMATCH
goto failed
:missing
>>"%R83_LOG%" echo STOP_R83=NODE_OR_BUNDLE_SOURCE_MISSING
goto failed
:collision
echo STOP_R83=RESULT_FILE_COLLISION
pause
exit /b 1
:failed
>>"%R83_LOG%" echo NODE_EXIT=1
type "%R83_LOG%"
pause
exit /b 1
