@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "LOG=%~dp0IRAN_NEWS_R45_R46_TEST_RESULT.txt"
set "STAGE=%~dp0IRAN_NEWS_R45_R46_TEST_STAGE"
set "NODE=E:\ZGmini\runtime\node.exe"
set "PIN=485c9a08b37270b5cc35260829e81adda3e19bc7"
if exist "%LOG%" (
 echo Existing R46 result detected. DO NOT RERUN. Upload that TXT.
 pause
 exit /b 2
)
>"%LOG%" echo R46_READ_ONLY_TEST_BEGIN=YES
>>"%LOG%" echo PINNED_SOURCE=%PIN%
>>"%LOG%" echo PC_CORE_D1_SCHEDULER_PUBLIC_WRITES=DISABLED
if not exist "%NODE%" goto :node_missing
if not exist "%STAGE%" mkdir "%STAGE%" >nul 2>&1
if not exist "%STAGE%" goto :stage_missing
call :fetch "scripts/iran-progress/news-r45-optional-readonly.mjs" "6477f4a0bf9487827d1726328cf4386b151b6201"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-four-source-probe-r45.mjs" "d116c9b74cee11fa6e69327e04a1e0597f1c12c7"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-display-source-registry-r26.mjs" "b036c4bb08dbb63b95daba492374df37af8d087b"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-display-multisource-audit-r24.mjs" "b0ba07f9f4c0f8252c25aa7743832efba651e745"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-display-article-audit-r25.mjs" "b20c6cee1c96f6b00489f52b1cbb0a5bd374e46d"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-display-discover-r1.mjs" "3565cf542db5cc695958ba75adec3fbd62b74ff4"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/sources.mjs" "7b618a4cb566da0867879510568be3c3aa100d70"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-metadata-incremental-r45.mjs" "92690d06754f778214229e75defdcd03a602390f"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-metadata-stage-r41.mjs" "701752262c236203743d6b496de0fee509e7d9ee"
if errorlevel 1 goto :source_failed
call :fetch "lib/iran-progress/news-display-r1.mjs" "3670b10ce9d14f93fed791cf690a00a868b83cee"
if errorlevel 1 goto :source_failed
call :fetch "lib/iran-progress/news-metadata-r41.mjs" "d295d8323b0df82658f4ae302880f613b816eef0"
if errorlevel 1 goto :source_failed
call :fetch "worker/iran-news-metadata-public-r41.mjs" "c5e6c2eceb9b0eb70e77c19d74befdfd12524c1a"
if errorlevel 1 goto :source_failed
call :fetch "tests/iran-news-four-source-r45.test.mjs" "4a754e5c59913904494515a45569ce952a90869b"
if errorlevel 1 goto :source_failed
call :fetch "tests/iran-news-four-source-parsers-r45.test.mjs" "1fbb8c4a233e33fb165e7dffa6207e094b87b3b2"
if errorlevel 1 goto :source_failed
call :fetch "tests/iran-news-r45-optional-integration.test.mjs" "88316bacc3dc95f4a7a8de79c178bde2d6b52fc9"
if errorlevel 1 goto :source_failed
call :fetch "tests/iran-news-r45-api-coverage.test.mjs" "bde2ec3a2f2092c035d6c21bf49a4e48fc5214bc"
if errorlevel 1 goto :source_failed
call :fetch "tests/iran-news-r45-incremental.test.mjs" "61a61158e4019cf7fd8c1bcf56f864e718cfa7b5"
if errorlevel 1 goto :source_failed
call :fetch "tests/iran-news-metadata-r41.test.mjs" "c070aff846b158b298fe271c3a6b9dfc21ce9a80"
if errorlevel 1 goto :source_failed
call :fetch "docs/IRAN_NEWS_R40_FULL_AUDIT_20261029.json" "d1fd4ba19f183953f249c48cfec446a1b89acba2"
if errorlevel 1 goto :source_failed
call :fetch "db/migrations/iran-news-r41/0001_article_metadata.sql" "bbea59a37b519357898d0bd87e9713a35eb03c3e"
if errorlevel 1 goto :source_failed
>>"%LOG%" echo SOURCE_FILES=20_VERIFIED
>>"%LOG%" echo STAGE_1=NODE_TESTS
"%NODE%" --test --test-concurrency=4 "%STAGE%\tests\iran-news-four-source-r45.test.mjs" "%STAGE%\tests\iran-news-four-source-parsers-r45.test.mjs" "%STAGE%\tests\iran-news-r45-optional-integration.test.mjs" "%STAGE%\tests\iran-news-r45-api-coverage.test.mjs" "%STAGE%\tests\iran-news-r45-incremental.test.mjs" "%STAGE%\tests\iran-news-metadata-r41.test.mjs" >>"%LOG%" 2>&1
if errorlevel 1 goto :test_failed
>>"%LOG%" echo NODE_TESTS=PASS
>>"%LOG%" echo STAGE_2=ARABNEWS_R24_R25_LIVE_READONLY
"%NODE%" "%STAGE%\scripts\iran-progress\news-r45-optional-readonly.mjs" --probe >>"%LOG%" 2>&1
if errorlevel 1 goto :probe_failed
>>"%LOG%" echo FINAL_STATUS=R46_TESTS_PASS_PROBE_RECORDED
echo R46 finished. Upload IRAN_NEWS_R45_R46_TEST_RESULT.txt.
pause
exit /b 0
:node_missing
>>"%LOG%" echo FINAL_STATUS=NODE_MISSING
goto :failed
:stage_missing
>>"%LOG%" echo FINAL_STATUS=STAGING_DIR_FAILURE
goto :failed
:source_failed
>>"%LOG%" echo FINAL_STATUS=PINNED_SOURCE_FETCH_OR_HASH_FAILED
goto :failed
:test_failed
>>"%LOG%" echo FINAL_STATUS=NODE_TESTS_FAILED_NO_PUBLISH
goto :failed
:probe_failed
>>"%LOG%" echo FINAL_STATUS=LIVE_READONLY_PROBE_FAILED_NO_PUBLISH
goto :failed
:failed
echo R46 not complete. Do not retry automatically; upload TXT.
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
