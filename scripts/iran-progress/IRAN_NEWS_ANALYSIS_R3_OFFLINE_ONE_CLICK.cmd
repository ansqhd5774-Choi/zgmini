@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Offline R3 fix for the already approved, isolated Iran news analysis PC checkout.
rem No collector, scoring, scheduled task, or other D1 key may be changed here.
set "ZG_LOG=%~dp0IRAN_NEWS_ANALYSIS_R3_RESULT.txt"
set "ZG_PKG=%~dp0"
set "ZG_TARGET=E:\ZGmini\projects\iran-news-analysis-r1-56eec668"
set "ZG_DATA=E:\ZGmini\data\iran-progress-r13"
set "ZG_A=%ZG_TARGET%\scripts\iran-progress\news-r26-source-evidence-r1.mjs"
set "ZG_B=%ZG_TARGET%\scripts\iran-progress\news-r41-auto-interpret-r1.mjs"
set "ZG_C=%ZG_TARGET%\scripts\iran-progress\news-analysis-scheduled-r1.mjs"
set "ZG_A_OLD=925fe69372758273da92baf221403138e9770d910bddae7c272b8de991b2e914"
set "ZG_B_OLD=45bdbe0ec4c3902c4389ba431fff4c132eb09b73b17bd5b7cdf3db23ce0a35b8"
set "ZG_C_OLD=63488a9987ef736f2f7deec50605e2b160b074f1515221dd7289c45b0b93a673"
set "ZG_A_NEW=b6c27451807cb265dc5e24b7d2b9400b6e4ba3682dff1016973079d3ec1810af"
set "ZG_B_NEW=2affa5c9ffb31aae2c9ec405a00dbca2adc51cd3289dee186720ee4449bbe333"
set "ZG_C_NEW=58f2b3f5376cca4554069555d968b91d83c1b6033a9411cab0aa1e9cc5a1e168"
set "ZG_CHECK_SHA=1236d97ca5e33fef4cf661d39aaabdd6d06bad0b2537897a24fb2c13c870612b"
set "ZG_RUNID=%RANDOM%_%RANDOM%"
set "ZG_A_BAK=%ZG_A%.%ZG_RUNID%.r3.bak"
set "ZG_B_BAK=%ZG_B%.%ZG_RUNID%.r3.bak"
set "ZG_C_BAK=%ZG_C%.%ZG_RUNID%.r3.bak"
set "ZG_CACHE=%ZG_DATA%\news-analysis-r1-cache.json"
set "ZG_STAGE=%ZG_DATA%\news-analysis-r1-public-staged.json"
set "ZG_CACHE_TEST=%ZG_DATA%\news-analysis-r3-preview-cache-%ZG_RUNID%.json"
set "ZG_STAGE_TEST=%ZG_DATA%\news-analysis-r3-preview-stage-%ZG_RUNID%.json"
set "ZG_PUB_LOG=%ZG_DATA%\news-analysis-r3-publish-%ZG_RUNID%.txt"
set "ZG_INSTALLED=0"
>"%ZG_LOG%" echo IRAN NEWS ANALYSIS R3 OFFLINE SOURCE RECOVERY
if errorlevel 1 goto cannot_log
>>"%ZG_LOG%" echo BRANCH=codex/ui-improvements
if not exist "%ZG_A%" goto missing
if not exist "%ZG_B%" goto missing
if not exist "%ZG_C%" goto missing
if not exist "%ZG_DATA%\" goto missing
if not exist "%ZG_STAGE%" goto missing
where certutil.exe >nul 2>&1
if errorlevel 1 goto tools_missing
if not exist "%ZG_PKG%news-r26-source-evidence-r1.mjs" goto package_missing
if not exist "%ZG_PKG%news-r41-auto-interpret-r1.mjs" goto package_missing
if not exist "%ZG_PKG%news-analysis-scheduled-r1.mjs" goto package_missing
if not exist "%ZG_PKG%news-analysis-r3-pc-check.mjs" goto package_missing
call "%ZG_TARGET%\scripts\resolve-local-node.cmd" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto tools_missing
"%NODE%" --version >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto tools_missing

>>"%ZG_LOG%" echo [1] VERIFY EXACT PACKAGE AND KNOWN INSTALLED CODE
certutil.exe -hashfile "%ZG_PKG%news-r26-source-evidence-r1.mjs" SHA256 | findstr /I /C:"%ZG_A_NEW%" >nul
if errorlevel 1 goto package_invalid
certutil.exe -hashfile "%ZG_PKG%news-r41-auto-interpret-r1.mjs" SHA256 | findstr /I /C:"%ZG_B_NEW%" >nul
if errorlevel 1 goto package_invalid
certutil.exe -hashfile "%ZG_PKG%news-analysis-scheduled-r1.mjs" SHA256 | findstr /I /C:"%ZG_C_NEW%" >nul
if errorlevel 1 goto package_invalid
certutil.exe -hashfile "%ZG_PKG%news-analysis-r3-pc-check.mjs" SHA256 | findstr /I /C:"%ZG_CHECK_SHA%" >nul
if errorlevel 1 goto package_invalid
certutil.exe -hashfile "%ZG_A%" SHA256 | findstr /I /C:"%ZG_A_OLD%" >nul
if errorlevel 1 goto unknown_a
certutil.exe -hashfile "%ZG_B%" SHA256 | findstr /I /C:"%ZG_B_OLD%" >nul
if errorlevel 1 goto unknown_b
certutil.exe -hashfile "%ZG_C%" SHA256 | findstr /I /C:"%ZG_C_OLD%" >nul
if errorlevel 1 goto unknown_c
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" --inspect >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto schedule_blocked
"%NODE%" --check "%ZG_PKG%news-r26-source-evidence-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto package_invalid
"%NODE%" --check "%ZG_PKG%news-r41-auto-interpret-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto package_invalid
"%NODE%" --check "%ZG_PKG%news-analysis-scheduled-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto package_invalid
"%NODE%" --check "%ZG_PKG%news-analysis-r3-pc-check.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto package_invalid

>>"%ZG_LOG%" echo [2] BACKUP ALL THREE EXISTING SOURCE FILES
copy /B "%ZG_A%" "%ZG_A_BAK%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto backup_failed
copy /B "%ZG_B%" "%ZG_B_BAK%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto backup_failed
copy /B "%ZG_C%" "%ZG_C_BAK%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto backup_failed
set "ZG_INSTALLED=1"
copy /Y /B "%ZG_PKG%news-r26-source-evidence-r1.mjs" "%ZG_A%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_code
copy /Y /B "%ZG_PKG%news-r41-auto-interpret-r1.mjs" "%ZG_B%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_code
copy /Y /B "%ZG_PKG%news-analysis-scheduled-r1.mjs" "%ZG_C%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_code
certutil.exe -hashfile "%ZG_A%" SHA256 | findstr /I /C:"%ZG_A_NEW%" >nul
if errorlevel 1 goto restore_code
certutil.exe -hashfile "%ZG_B%" SHA256 | findstr /I /C:"%ZG_B_NEW%" >nul
if errorlevel 1 goto restore_code
certutil.exe -hashfile "%ZG_C%" SHA256 | findstr /I /C:"%ZG_C_NEW%" >nul
if errorlevel 1 goto restore_code

>>"%ZG_LOG%" echo [3] PREVIEW ON PRIVATE COPIES ONLY
if exist "%ZG_CACHE%" copy /B "%ZG_CACHE%" "%ZG_CACHE_TEST%" >>"%ZG_LOG%" 2>&1
if exist "%ZG_CACHE%" if not exist "%ZG_CACHE_TEST%" goto restore_code
"%NODE%" "%ZG_B%" --mode=cycle --feed-url=https://zgmini.kr/api/outbreak-news/iran/r41 --cache="%ZG_CACHE_TEST%" --output="%ZG_STAGE_TEST%" --model=gemma3:4b --max-new=16 >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_code
"%NODE%" "%ZG_PKG%news-analysis-r3-pc-check.mjs" preview "%ZG_STAGE%" "%ZG_STAGE_TEST%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_code
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-publication-r1.mjs" --input="%ZG_STAGE_TEST%" --mode=dry-run >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_code

>>"%ZG_LOG%" echo [4] PUBLISH ONLY NEW VERIFIED ANALYSIS SNAPSHOT
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-publication-r1.mjs" --input="%ZG_STAGE_TEST%" --mode=publish >"%ZG_PUB_LOG%" 2>&1
if errorlevel 1 goto publish_uncertain
type "%ZG_PUB_LOG%" >>"%ZG_LOG%"
"%NODE%" "%ZG_PKG%news-analysis-r3-pc-check.mjs" publish "%ZG_PUB_LOG%" 1 >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto publish_uncertain
>>"%ZG_LOG%" echo [5] PRESERVE OLD STATE AND ADOPT VERIFIED PREVIEW
if exist "%ZG_CACHE%" copy /B "%ZG_CACHE%" "%ZG_CACHE%.%ZG_RUNID%.r3.bak" >>"%ZG_LOG%" 2>&1
if exist "%ZG_STAGE%" copy /B "%ZG_STAGE%" "%ZG_STAGE%.%ZG_RUNID%.r3.bak" >>"%ZG_LOG%" 2>&1
copy /Y /B "%ZG_CACHE_TEST%" "%ZG_CACHE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto state_uncertain
copy /Y /B "%ZG_STAGE_TEST%" "%ZG_STAGE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto state_uncertain
>>"%ZG_LOG%" echo FINAL_STATUS=R3_READBACK_VERIFIED
goto success

:restore_code
>>"%ZG_LOG%" echo ERROR=PREVIEW_OR_INSTALL_FAILED_RESTORE_KNOWN_CODE
if "%ZG_INSTALLED%"=="1" if exist "%ZG_A_BAK%" copy /Y /B "%ZG_A_BAK%" "%ZG_A%" >>"%ZG_LOG%" 2>&1
if "%ZG_INSTALLED%"=="1" if exist "%ZG_B_BAK%" copy /Y /B "%ZG_B_BAK%" "%ZG_B%" >>"%ZG_LOG%" 2>&1
if "%ZG_INSTALLED%"=="1" if exist "%ZG_C_BAK%" copy /Y /B "%ZG_C_BAK%" "%ZG_C%" >>"%ZG_LOG%" 2>&1
goto blocked
:publish_uncertain
>>"%ZG_LOG%" echo ERROR=PUBLICATION_NOT_VERIFIED_CODE_INSTALLED_LOCAL_CACHE_UNCHANGED
goto blocked
:state_uncertain
>>"%ZG_LOG%" echo ERROR=D1_VERIFIED_BUT_LOCAL_STATE_COPY_FAILED_CHECK_BACKUPS
goto blocked
:missing
>>"%ZG_LOG%" echo ERROR=APPROVED_TARGET_OR_STAGED_STATE_MISSING
goto blocked
:tools_missing
>>"%ZG_LOG%" echo ERROR=NODE_OR_CERTUTIL_MISSING
goto blocked
:package_missing
>>"%ZG_LOG%" echo ERROR=ZIP_CONTENT_MISSING
goto blocked
:package_invalid
>>"%ZG_LOG%" echo ERROR=PACKAGE_SHA256_OR_SYNTAX_INVALID
goto blocked
:unknown_a
>>"%ZG_LOG%" echo ERROR=INSTALLED_R26_SHA256_NOT_PINNED
goto blocked
:unknown_b
>>"%ZG_LOG%" echo ERROR=INSTALLED_R41_SHA256_NOT_PINNED
goto blocked
:unknown_c
>>"%ZG_LOG%" echo ERROR=INSTALLED_SCHEDULER_SHA256_NOT_PINNED
goto blocked
:schedule_blocked
>>"%ZG_LOG%" echo ERROR=ANALYSIS_SCHEDULE_INSPECTION_FAILED
goto blocked
:backup_failed
>>"%ZG_LOG%" echo ERROR=SOURCE_BACKUP_FAILED_NO_REPLACEMENT
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
