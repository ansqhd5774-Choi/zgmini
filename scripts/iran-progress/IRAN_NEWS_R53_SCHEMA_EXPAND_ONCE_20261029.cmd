@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "LOG=%~dp0IRAN_NEWS_R53_SCHEMA_EXPAND_RESULT.txt"
set "STAGE=%~dp0IRAN_NEWS_R53_SCHEMA_STAGE"
set "NODE=E:\ZGmini\runtime\node.exe"
set "PIN=26521032c1041ac51d61c4b9b7ed1b35514bf8e5"
if exist "%LOG%" (
 echo Existing result found. DO_NOT_RERUN. Upload the existing TXT.
 pause
 exit /b 2
)
>"%LOG%" echo R53_SCHEMA_EXPAND_BEGIN=YES
>>"%LOG%" echo PINNED_SOURCE=%PIN%
>>"%LOG%" echo ONE_TRANSACTION_D1_SCHEMA_ONLY=YES
>>"%LOG%" echo R1_SCORE_SCHEDULER_DEPLOY=UNCHANGED
if not exist "%NODE%" goto :node_missing
if not exist "%STAGE%" mkdir "%STAGE%" >nul 2>&1
if not exist "%STAGE%" goto :stage_failed
call :fetch "scripts/iran-progress/news-metadata-schema-expand-r53.mjs" "6e769bb105984917cda25e60442ab0a23520d345"
if errorlevel 1 goto :source_failed
call :fetch "tests/iran-news-r53-schema-expand.test.mjs" "1ddf78b76c653ebe57040e4da785b74d3bdbbb55"
if errorlevel 1 goto :source_failed
call :fetch "db/migrations/iran-news-r41/0001_article_metadata.sql" "bbea59a37b519357898d0bd87e9713a35eb03c3e"
if errorlevel 1 goto :source_failed
call :fetch "docs/IRAN_NEWS_R41_STAGING_ROWS_20261029.json" "9c1b840602692d7fc28299d187025555ad1a328a"
if errorlevel 1 goto :source_failed
call :fetch "scripts/pc-writer/d1.mjs" "38d43e267b2a1babfc50b41b1fc8e7f371a088ff"
if errorlevel 1 goto :source_failed
call :fetch "scripts/pc-writer/d1-transient.mjs" "c7b37c470da1d9e19e40a3dac4452452602297c0"
if errorlevel 1 goto :source_failed
call :fetch "scripts/pc-writer/d1-diagnostics.mjs" "6bbec7625812989ed500982dc23caa7435e24b27"
if errorlevel 1 goto :source_failed
>>"%LOG%" echo SOURCE_FILES=7_VERIFIED
>>"%LOG%" echo STEP_1=REAL_SCHEMA_NODE_TESTS
"%NODE%" "%STAGE%\tests\iran-news-r53-schema-expand.test.mjs" >>"%LOG%" 2>&1
if errorlevel 1 goto :tests_failed
>>"%LOG%" echo R53_TESTS=PASS
>>"%LOG%" echo STEP_2=REMOTE_D1_READONLY_SCHEMA_PREFLIGHT
"%NODE%" "%STAGE%\scripts\iran-progress\news-metadata-schema-expand-r53.mjs" --preflight >>"%LOG%" 2>&1
if errorlevel 1 goto :preflight_failed
>>"%LOG%" echo STEP_3=APPROVED_ONE_TIME_SCHEMA_EXPANSION
set "ZGMINI_IRAN_NEWS_R53_APPROVED=YES"
"%NODE%" "%STAGE%\scripts\iran-progress\news-metadata-schema-expand-r53.mjs" --apply-approved >>"%LOG%" 2>&1
set "R53_RC=%errorlevel%"
set "ZGMINI_IRAN_NEWS_R53_APPROVED="
if not "%R53_RC%"=="0" goto :write_review
>>"%LOG%" echo FINAL_STATUS=R53_11_SOURCE_SCHEMA_VERIFIED
echo R53 completed. Upload result TXT. Do not run R50.
pause
exit /b 0
:node_missing
>>"%LOG%" echo FINAL_STATUS=NODE_MISSING_NO_WRITE
goto :failed
:stage_failed
>>"%LOG%" echo FINAL_STATUS=STAGING_DIR_UNAVAILABLE_NO_WRITE
goto :failed
:source_failed
>>"%LOG%" echo FINAL_STATUS=SOURCE_OR_HASH_FAILED_NO_WRITE
goto :failed
:tests_failed
>>"%LOG%" echo FINAL_STATUS=TESTS_FAILED_NO_WRITE
goto :failed
:preflight_failed
>>"%LOG%" echo FINAL_STATUS=SCHEMA_PREFLIGHT_FAILED_NO_WRITE
goto :failed
:write_review
>>"%LOG%" echo FINAL_STATUS=SCHEMA_WRITE_OUTCOME_REQUIRES_READBACK_NO_RETRY
:failed
echo R53 stopped or needs review. Upload TXT. Never rerun automatically.
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
