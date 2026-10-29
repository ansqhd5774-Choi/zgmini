@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "LOG=%~dp0IRAN_NEWS_R50_D1_PUBLISH_RESULT.txt"
set "R46=%~dp0IRAN_NEWS_R45_R46_TEST_RESULT.txt"
set "R49=%~dp0IRAN_NEWS_R49_MEMBERSHIP_PREFLIGHT_RESULT.txt"
set "STAGE=%~dp0IRAN_NEWS_R50_ONE_TIME_STAGE"
set "NODE=E:\ZGmini\runtime\node.exe"
set "PIN=35af18a7f1033b54867890944e66edf18348bdd0"
if exist "%LOG%" (
 echo Existing R50 result. DO_NOT_RERUN. Upload the existing TXT.
 pause
 exit /b 2
)
>"%LOG%" echo R50_ONE_TIME_PUBLISH_BEGIN=YES
>>"%LOG%" echo PINNED_SOURCE=%PIN%
>>"%LOG%" echo R50_ONLY_R41_ARTICLE_METADATA_TABLE=YES
>>"%LOG%" echo NO_R1_NO_SCHEDULER_NO_SCORE_NO_DEPLOY=YES
if not exist "%R46%" goto :r46_missing
if not exist "%R49%" goto :r49_missing
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
call :fetch "tests/iran-news-r50-publish.test.mjs" "d45520e17f8457287a224adeccf669eaf27f355d"
if errorlevel 1 goto :source_failed
>>"%LOG%" echo SOURCE_FILES=12_VERIFIED
>>"%LOG%" echo STEP_1=MOCK_TESTS_BEFORE_ANY_D1_WRITE
"%NODE%" --test "%STAGE%\tests\iran-news-r50-publish.test.mjs" >>"%LOG%" 2>&1
if errorlevel 1 goto :test_failed
>>"%LOG%" echo R50_TESTS=PASS
>>"%LOG%" echo STEP_2=ONE_TIME_APPROVED_R41_D1_INCREMENTAL_PUBLISH
set "ZGMINI_IRAN_NEWS_R50_APPROVED=YES"
"%NODE%" "%STAGE%\scripts\iran-progress\news-metadata-publish-r50.mjs" --apply-approved "%R46%" "%R49%" >>"%LOG%" 2>&1
set "R50_RC=%errorlevel%"
set "ZGMINI_IRAN_NEWS_R50_APPROVED="
>>"%LOG%" echo R50_NODE_EXIT=%R50_RC%
if not "%R50_RC%"=="0" goto :publish_review
>>"%LOG%" echo FINAL_STATUS=R50_D1_READBACK_VERIFIED_API_DEPLOY_PENDING
echo R50 D1 insert and readback verified. Upload result TXT.
pause
exit /b 0
:r46_missing
>>"%LOG%" echo FINAL_STATUS=R46_LOG_MISSING
goto :failed
:r49_missing
>>"%LOG%" echo FINAL_STATUS=R49_LOG_MISSING
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
:publish_review
>>"%LOG%" echo FINAL_STATUS=R50_WRITE_OUTCOME_REQUIRES_D1_READBACK
:failed
echo STOP. Upload result TXT. Never rerun without reviewing D1.
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
