@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Incremental, offline R3.1 retry. Preserves R41 collection, R5, schedule and existing READY cards.
set "ZG_LOG=%~dp0IRAN_NEWS_ANALYSIS_R3_1_RESULT.txt"
set "ZG_PKG=%~dp0"
set "ZG_TARGET=E:\ZGmini\projects\iran-news-analysis-r1-56eec668"
set "ZG_DATA=E:\ZGmini\data\iran-progress-r13"
set "ZG_SOURCE=%ZG_TARGET%\scripts\iran-progress\news-r41-auto-interpret-r1.mjs"
set "ZG_OLD_SHA=2affa5c9ffb31aae2c9ec405a00dbca2adc51cd3289dee186720ee4449bbe333"
set "ZG_NEW_SHA=434c5baa191c32da6bbb1b6e42c4e789bea6ea617e236c1f8a574c3f14d7d711"
set "ZG_HELPER_SHA=1236d97ca5e33fef4cf661d39aaabdd6d06bad0b2537897a24fb2c13c870612b"
set "ZG_RUNID=%RANDOM%_%RANDOM%"
set "ZG_BAK=%ZG_SOURCE%.%ZG_RUNID%.r3-1.bak"
set "ZG_CACHE=%ZG_DATA%\news-analysis-r1-cache.json"
set "ZG_STAGE=%ZG_DATA%\news-analysis-r1-public-staged.json"
set "ZG_CACHE_TEST=%ZG_DATA%\news-analysis-r3-1-cache-%ZG_RUNID%.json"
set "ZG_STAGE_TEST=%ZG_DATA%\news-analysis-r3-1-stage-%ZG_RUNID%.json"
set "ZG_PUB_LOG=%ZG_DATA%\news-analysis-r3-1-publish-%ZG_RUNID%.txt"
set "ZG_UPDATED=0"
>"%ZG_LOG%" echo IRAN NEWS R3.1 OLLAMA BOUNDED RETRY
if errorlevel 1 goto cannot_log
if not exist "%ZG_SOURCE%" goto missing
if not exist "%ZG_STAGE%" goto missing
if not exist "%ZG_DATA%\" goto missing
if not exist "%ZG_PKG%news-r41-auto-interpret-r1.mjs" goto missing_package
if not exist "%ZG_PKG%news-analysis-r3-pc-check.mjs" goto missing_package
call "%ZG_TARGET%\scripts\resolve-local-node.cmd" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto tools_missing

>>"%ZG_LOG%" echo [1] VALIDATE EXACT R3 BASELINE AND R3.1 PACKAGE
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_OLD_SHA%" >nul
if errorlevel 1 goto old_mismatch
certutil.exe -hashfile "%ZG_PKG%news-r41-auto-interpret-r1.mjs" SHA256 | findstr /I /C:"%ZG_NEW_SHA%" >nul
if errorlevel 1 goto new_mismatch
certutil.exe -hashfile "%ZG_PKG%news-analysis-r3-pc-check.mjs" SHA256 | findstr /I /C:"%ZG_HELPER_SHA%" >nul
if errorlevel 1 goto new_mismatch
"%NODE%" --check "%ZG_PKG%news-r41-auto-interpret-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto new_mismatch
"%NODE%" --check "%ZG_PKG%news-analysis-r3-pc-check.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto new_mismatch
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" --inspect >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto schedule_blocked

>>"%ZG_LOG%" echo [2] BACK UP OLD MODEL SOURCE AND INSTALL R3.1
copy /B "%ZG_SOURCE%" "%ZG_BAK%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto backup_failed
set "ZG_UPDATED=1"
copy /Y /B "%ZG_PKG%news-r41-auto-interpret-r1.mjs" "%ZG_SOURCE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_NEW_SHA%" >nul
if errorlevel 1 goto restore

>>"%ZG_LOG%" echo [3] PRIVATE R3.1 PREVIEW -- RETAIN OLD READY ITEMS
if exist "%ZG_CACHE%" copy /B "%ZG_CACHE%" "%ZG_CACHE_TEST%" >>"%ZG_LOG%" 2>&1
if exist "%ZG_CACHE%" if not exist "%ZG_CACHE_TEST%" goto restore
"%NODE%" "%ZG_SOURCE%" --mode=cycle --feed-url=https://zgmini.kr/api/outbreak-news/iran/r41 --cache="%ZG_CACHE_TEST%" --output="%ZG_STAGE_TEST%" --model=gemma3:4b --max-new=16 >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto preview_blocked
"%NODE%" "%ZG_PKG%news-analysis-r3-pc-check.mjs" preview "%ZG_STAGE%" "%ZG_STAGE_TEST%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto preview_blocked
"%NODE%" -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const b=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));if(b.items.length<=a.items.length){console.log('R3_1_NO_ADDITIONAL_READY');process.exitCode=2;}else console.log('R3_1_NEW_READY='+String(b.items.length-a.items.length));" "%ZG_STAGE%" "%ZG_STAGE_TEST%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto no_new_ready
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-publication-r1.mjs" --input="%ZG_STAGE_TEST%" --mode=dry-run >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto preview_blocked

>>"%ZG_LOG%" echo [4] PUBLISH VERIFIABLE NEW RESULT TO ISOLATED D1 KEY
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-publication-r1.mjs" --input="%ZG_STAGE_TEST%" --mode=publish >"%ZG_PUB_LOG%" 2>&1
if errorlevel 1 goto publish_uncertain
type "%ZG_PUB_LOG%" >>"%ZG_LOG%"
"%NODE%" "%ZG_PKG%news-analysis-r3-pc-check.mjs" publish "%ZG_PUB_LOG%" 5 >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto publish_uncertain
>>"%ZG_LOG%" echo [5] ADOPT VERIFIED PRIVATE CACHE AND STAGED SNAPSHOT
if exist "%ZG_CACHE%" copy /B "%ZG_CACHE%" "%ZG_CACHE%.%ZG_RUNID%.r3-1.bak" >>"%ZG_LOG%" 2>&1
if exist "%ZG_STAGE%" copy /B "%ZG_STAGE%" "%ZG_STAGE%.%ZG_RUNID%.r3-1.bak" >>"%ZG_LOG%" 2>&1
copy /Y /B "%ZG_CACHE_TEST%" "%ZG_CACHE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto local_state_uncertain
copy /Y /B "%ZG_STAGE_TEST%" "%ZG_STAGE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto local_state_uncertain
>>"%ZG_LOG%" echo FINAL_STATUS=R3_1_PUBLISHED_READBACK_VERIFIED
goto success

:no_new_ready
>>"%ZG_LOG%" echo FINAL_STATUS=R3_1_RETRY_INSTALLED_NO_NEW_READY
goto success
:preview_blocked
>>"%ZG_LOG%" echo ERROR=R3_1_PREVIEW_BLOCKED_OLD_READY_PRESERVED
>>"%ZG_LOG%" echo FINAL_STATUS=R3_1_CODE_INSTALLED_PREVIEW_BLOCKED
goto blocked
:publish_uncertain
>>"%ZG_LOG%" echo ERROR=R3_1_PUBLICATION_UNCERTAIN_DO_NOT_CLAIM_SUCCESS
goto blocked
:local_state_uncertain
>>"%ZG_LOG%" echo ERROR=D1_VERIFIED_LOCAL_STATE_COPY_FAILED_CHECK_BACKUPS
goto blocked
:restore
if "%ZG_UPDATED%"=="1" if exist "%ZG_BAK%" copy /Y /B "%ZG_BAK%" "%ZG_SOURCE%" >>"%ZG_LOG%" 2>&1
>>"%ZG_LOG%" echo ERROR=SOURCE_RESTORED_AFTER_INSTALL_FAILURE
goto blocked
:missing
>>"%ZG_LOG%" echo ERROR=APPROVED_PC_SOURCE_OR_STAGED_FILE_MISSING
goto blocked
:missing_package
>>"%ZG_LOG%" echo ERROR=OFFLINE_PACKAGE_INCOMPLETE
goto blocked
:tools_missing
>>"%ZG_LOG%" echo ERROR=LOCAL_NODE_RESOLUTION_FAILED
goto blocked
:old_mismatch
>>"%ZG_LOG%" echo ERROR=INSTALLED_R3_SOURCE_SHA256_MISMATCH_NO_OVERWRITE
goto blocked
:new_mismatch
>>"%ZG_LOG%" echo ERROR=R3_1_PACKAGE_SHA256_OR_SYNTAX_MISMATCH
goto blocked
:schedule_blocked
>>"%ZG_LOG%" echo ERROR=EXISTING_ANALYSIS_SCHEDULE_INSPECT_FAILED
goto blocked
:backup_failed
>>"%ZG_LOG%" echo ERROR=SOURCE_BACKUP_FAILED_NO_OVERWRITE
goto blocked
:blocked
>>"%ZG_LOG%" echo FINAL_STATUS=BLOCKED_CHECK_LOG
type "%ZG_LOG%"
echo.
echo Log: "%ZG_LOG%"
pause
exit /b 1
:success
type "%ZG_LOG%"
echo.
echo Log: "%ZG_LOG%"
pause
exit /b 0
:cannot_log
echo ERROR=CANNOT_CREATE_LOG
pause
exit /b 1
