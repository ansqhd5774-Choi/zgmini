@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "LOG=%~dp0IRAN_NEWS_R48_BASELINE_READONLY_RESULT.txt"
set "STAGE=%~dp0IRAN_NEWS_R48_READONLY_STAGE"
set "NODE=E:\ZGmini\runtime\node.exe"
set "PIN=f020b2f1ed0adc58fcfab97fb4f821820f2ae547"
if exist "%LOG%" (
 echo Existing R48 result. DO_NOT_RERUN; upload existing TXT.
 pause
 exit /b 2
)
>"%LOG%" echo R48_READ_ONLY_BEGIN=YES
>>"%LOG%" echo PINNED_SOURCE=%PIN%
>>"%LOG%" echo DB_WRITES_DEPLOYMENT_SCHEDULER_SCORE=DISABLED
if not exist "%NODE%" goto :node_missing
if not exist "%STAGE%" mkdir "%STAGE%" >nul 2>&1
if not exist "%STAGE%" goto :stage_missing
call :fetch "scripts/iran-progress/news-metadata-baseline-diagnose-r48.mjs" "c64a6ee902a796b1dd90b375dfde52a676b8bef8"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-metadata-baseline-diagnose-r48.test.mjs" "22837989cd3b16fa340ecd7f58be379fb3a3655c"
if errorlevel 1 goto :source_failed
call :fetch "docs/IRAN_NEWS_R41_STAGING_ROWS_20261029.json" "9c1b840602692d7fc28299d187025555ad1a328a"
if errorlevel 1 goto :source_failed
call :fetch "scripts/pc-writer/d1.mjs" "38d43e267b2a1babfc50b41b1fc8e7f371a088ff"
if errorlevel 1 goto :source_failed
call :fetch "scripts/pc-writer/d1-transient.mjs" "c7b37c470da1d9e19e40a3dac4452452602297c0"
if errorlevel 1 goto :source_failed
call :fetch "scripts/pc-writer/d1-diagnostics.mjs" "6bbec7625812989ed500982dc23caa7435e24b27"
if errorlevel 1 goto :source_failed
>>"%LOG%" echo SOURCE_FILES=6_VERIFIED
>>"%LOG%" echo STAGE_1=R48_LOCAL_FIXTURE_TESTS
"%NODE%" --test "%STAGE%\scripts\iran-progress\news-metadata-baseline-diagnose-r48.test.mjs" >>"%LOG%" 2>&1
if errorlevel 1 goto :test_failed
>>"%LOG%" echo R48_TESTS=PASS
>>"%LOG%" echo STAGE_2=EXISTING_D1_READONLY_SELECTS
"%NODE%" "%STAGE%\scripts\iran-progress\news-metadata-baseline-diagnose-r48.mjs" --diagnose >>"%LOG%" 2>&1
if errorlevel 1 goto :baseline_review
>>"%LOG%" echo FINAL_STATUS=R48_REMOTE_DIAG_DONE_NO_D1_WRITE
echo R48 finished. Upload result TXT.
pause
exit /b 0
:node_missing
>>"%LOG%" echo FINAL_STATUS=APPROVED_NODE_MISSING
goto :failed
:stage_missing
>>"%LOG%" echo FINAL_STATUS=STAGING_FAILED
goto :failed
:source_failed
>>"%LOG%" echo FINAL_STATUS=R48_PINNED_SOURCE_OR_HASH_FAILED
goto :failed
:test_failed
>>"%LOG%" echo FINAL_STATUS=R48_TEST_FAILED_NO_REMOTE_WRITE
goto :failed
:baseline_review
>>"%LOG%" echo FINAL_STATUS=R48_REMOTE_BASELINE_REQUIRES_REVIEW
goto :failed
:failed
echo No write has been attempted. Send result TXT. DO_NOT_RERUN.
pause
exit /b 1
:fetch
setlocal
set "REL=%~1"
set "BLOB=%~2"
set "DEST=%STAGE%\%REL:/=\%"
for %%F in ("%DEST%") do if not exist "%%~dpF" mkdir "%%~dpF" >nul 2>&1
if not exist "%STAGE%" (endlocal & exit /b 1)
curl.exe -fLSs --retry 0 --connect-timeout 12 --max-time 60 --output "%DEST%" "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%PIN%/%REL%" >>"%LOG%" 2>&1
if errorlevel 1 (
 >>"%LOG%" echo FETCH_ERROR:%REL%
 endlocal & exit /b 1
)
"%NODE%" -e "const fs=require('node:fs'),c=require('node:crypto');const b=fs.readFileSync(process.argv[1]);const h=c.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');process.exit(h===process.argv[2]?0:3)" "%DEST%" "%BLOB%" >>"%LOG%" 2>&1
if errorlevel 1 (
 >>"%LOG%" echo HASH_ERROR:%REL%
 endlocal & exit /b 1
)
endlocal & exit /b 0
