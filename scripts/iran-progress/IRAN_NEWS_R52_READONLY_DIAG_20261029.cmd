@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "LOG=%~dp0IRAN_NEWS_R52_PREWRITE_DIAG_RESULT.txt"
set "R46=%~dp0IRAN_NEWS_R45_R46_TEST_RESULT.txt"
set "R49=%~dp0IRAN_NEWS_R49_MEMBERSHIP_PREFLIGHT_RESULT.txt"
set "R50=%~dp0IRAN_NEWS_R50_RECOVERY_PUBLISH_RESULT.txt"
set "R51=%~dp0IRAN_NEWS_R51_READBACK_RESULT.txt"
set "STAGE=%~dp0IRAN_NEWS_R52_READONLY_STAGE"
set "NODE=E:\ZGmini\runtime\node.exe"
set "PIN=c35c8caf5c2d11f107f99c7f78cb987d7c43ab87"
if exist "%LOG%" (
 echo Existing R50 result. DO_NOT_RERUN. Upload the existing TXT.
 pause
 exit /b 2
)
>"%LOG%" echo R52_PREWRITE_DIAG_BEGIN=YES
>>"%LOG%" echo PINNED_SOURCE=%PIN%
>>"%LOG%" echo R52_SELECT_ONLY_NO_MUTATION=YES
>>"%LOG%" echo NO_R1_NO_SCHEDULER_NO_SCORE_NO_DEPLOY=YES
if not exist "%R46%" goto :r46_missing
if not exist "%R49%" goto :r49_missing
if not exist "%R50%" goto :r50_missing
if not exist "%R51%" goto :r51_missing
if not exist "%NODE%" goto :node_missing
if not exist "%STAGE%" mkdir "%STAGE%" >nul 2>&1
if not exist "%STAGE%" goto :stage_failed
call :fetch "scripts/iran-progress/news-metadata-publish-r50.mjs" "569a2d6bdb1b53be202026dc586211c170cb76dc"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-metadata-preflight-r47.mjs" "431153ab420e47584078f70b1530878446a4d6e4"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-metadata-baseline-diagnose-r48.mjs" "c64a6ee902a796b1dd90b375dfde52a676b8bef8"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-metadata-incremental-r45.mjs" "92690d06754f778214229e75defdcd03a602390f"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-metadata-stage-r41.mjs" "701752262c236203743d6b496de0fee509e7d9ee"
if errorlevel 1 goto :source_failed
call :fetch "lib/iran-progress/news-metadata-r41.mjs" "d295d8323b0df82658f4ae302880f613b816eef0"
if errorlevel 1 goto :source_failed
call :fetch "lib/iran-progress/news-display-r1.mjs" "3670b10ce9d14f93fed791cf690a00a868b83cee"
if errorlevel 1 goto :source_failed
call :fetch "docs/IRAN_NEWS_R41_STAGING_ROWS_20261029.json" "9c1b840602692d7fc28299d187025555ad1a328a"
if errorlevel 1 goto :source_failed
call :fetch "scripts/pc-writer/d1.mjs" "38d43e267b2a1babfc50b41b1fc8e7f371a088ff"
if errorlevel 1 goto :source_failed
call :fetch "scripts/pc-writer/d1-transient.mjs" "c7b37c470da1d9e19e40a3dac4452452602297c0"
if errorlevel 1 goto :source_failed
call :fetch "scripts/pc-writer/d1-diagnostics.mjs" "6bbec7625812989ed500982dc23caa7435e24b27"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-metadata-readback-r51.mjs" "8a624a15623b0fa340b032af79f715d942f7a29f"
if errorlevel 1 goto :source_failed
call :fetch "tests/iran-news-r51-readback.test.mjs" "f67020cedaaf259cd02959f6055992f5b21d9917"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-r50-failure-readonly-r52.mjs" "9c3e6308b57c3b0d3ef6f4a395503491732c3712"
if errorlevel 1 goto :source_failed
call :fetch "tests/iran-news-r52-prewrite.test.mjs" "0935a1e8ab0b093075ec264ff676f6369a9ccc2c"
if errorlevel 1 goto :source_failed
>>"%LOG%" echo SOURCE_FILES=15_VERIFIED
>>"%LOG%" echo STEP_1=READONLY_MOCK_TESTS
"%NODE%" --test "%STAGE%\tests\iran-news-r52-prewrite.test.mjs" >>"%LOG%" 2>&1
if errorlevel 1 goto :test_failed
>>"%LOG%" echo R52_TESTS=PASS
>>"%LOG%" echo STEP_2=R50_PREWRITE_READONLY_PHASE_DIAG
"%NODE%" "%STAGE%\scripts\iran-progress\news-r50-failure-readonly-r52.mjs" --diagnose "%R46%" "%R49%" "%R50%" "%R51%" >>"%LOG%" 2>&1
set "R52_RC=%errorlevel%"
>>"%LOG%" echo R51_NODE_EXIT=%R52_RC%
if not "%R52_RC%"=="0" goto :readback_review
>>"%LOG%" echo FINAL_STATUS=R52_PREWRITE_DIAG_RECORDED_NO_D1_WRITE
echo R52 phase check complete. Upload result TXT; do not run R50 again.
pause
exit /b 0
:r46_missing
>>"%LOG%" echo FINAL_STATUS=R46_LOG_MISSING
goto :failed
:r49_missing
>>"%LOG%" echo FINAL_STATUS=R49_LOG_MISSING
goto :failed
:r51_missing
>>"%LOG%" echo FINAL_STATUS=R51_PREVIOUS_RESULT_MISSING
goto :failed
:r50_missing
>>"%LOG%" echo FINAL_STATUS=R50_RECOVERY_RESULT_MISSING
goto :failed
:node_missing
>>"%LOG%" echo FINAL_STATUS=NODE_MISSING
goto :failed
:stage_failed
>>"%LOG%" echo FINAL_STATUS=STAGING_DIR_UNAVAILABLE
goto :failed
:source_failed
>>"%LOG%" echo FINAL_STATUS=SOURCE_OR_HASH_FAILED_NO_WRITE
goto :failed
:test_failed
>>"%LOG%" echo FINAL_STATUS=TEST_FAILED_NO_WRITE
goto :failed
:readback_review
>>"%LOG%" echo FINAL_STATUS=R52_DIAGNOSTIC_REVIEW_NO_WRITE
:failed
echo R51 READ ONLY stopped or needs review. Upload TXT. Do not rerun automatically.
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
