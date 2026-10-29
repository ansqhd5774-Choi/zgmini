@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "LOG=%~dp0IRAN_NEWS_R55_RECOVERY_PUBLISH_RESULT.txt"
set "STAGE=%~dp0IRAN_NEWS_R55_VERIFIED_STAGE"
set "PRIOR=%~dp0IRAN_NEWS_R54_EIGHT_PUBLISH_RESULT.txt"
set "R46=%~dp0IRAN_NEWS_R45_R46_TEST_RESULT.txt"
set "R49=%~dp0IRAN_NEWS_R49_MEMBERSHIP_PREFLIGHT_RESULT.txt"
set "NODE=E:\ZGmini\runtime\node.exe"
set "PIN=d4b9630dda46fd721a38358b0237afd4632b4765"
if exist "%LOG%" (
 echo Existing result found. DO_NOT_RERUN. Upload the existing TXT.
 pause
 exit /b 2
)
>"%LOG%" echo R55_RECOVERY_AFTER_PROVEN_NO_WRITE_BEGIN=YES
>>"%LOG%" echo PINNED_SOURCE=%PIN%
>>"%LOG%" echo ONLY_NEW_ARAB_NEWS_R41_METADATA=YES
>>"%LOG%" echo R1_SCORE_SCHEDULER_DEPLOY=UNCHANGED
>>"%LOG%" echo NEVER_AUTOMATICALLY_RETRY_WRITE=YES
if not exist "%NODE%" goto :node_missing
if not exist "%PRIOR%" goto :prior_missing
call :sha256 "%PRIOR%" "14bd5f5b893f17e4f98941d2c15f2b1da9201f774a60de3013fff495a2d4d260"
if errorlevel 1 goto :prior_not_verified
>>"%LOG%" echo PRIOR_R54_PREWRITE_STOP=VERIFIED
if not exist "%R46%" goto :r46_missing
call :sha256 "%R46%" "1206ecb624dc3ef5d258f7280f22f4cc37ada3ff848e7c395ed69430f2c0094a"
if errorlevel 1 goto :evidence_hash_failed
if not exist "%R49%" goto :r49_missing
call :sha256 "%R49%" "9343c1c5f75a5881e708937ef0ad969742e0411ea0f715d4f505cdf0a897d8c8"
if errorlevel 1 goto :evidence_hash_failed
>>"%LOG%" echo R46_R49_EVIDENCE_HASHES=VERIFIED
if not exist "%STAGE%" mkdir "%STAGE%" >nul 2>&1
if not exist "%STAGE%" goto :stage_failed
call :fetch "scripts/iran-progress/news-metadata-publish-r54.mjs" "908697ea63ba25e4594733d9a4810fa653019b0f"
if errorlevel 1 goto :source_failed
call :fetch "tests/iran-news-r54-publish.test.mjs" "c7cb4984e758066e193244de91e02b20ecb3e3c5"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-metadata-schema-expand-r53.mjs" "6e769bb105984917cda25e60442ab0a23520d345"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-metadata-preflight-r47.mjs" "431153ab420e47584078f70b1530878446a4d6e4"
if errorlevel 1 goto :source_failed
call :fetch "scripts/iran-progress/news-metadata-publish-r50.mjs" "569a2d6bdb1b53be202026dc586211c170cb76dc"
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
>>"%LOG%" echo SOURCE_FILES=14_VERIFIED
>>"%LOG%" echo STEP_1=SCHEMA_AND_ATOMIC_INSERT_TESTS
"%NODE%" "%STAGE%\tests\iran-news-r54-publish.test.mjs" >>"%LOG%" 2>&1
if errorlevel 1 goto :test_failed
>>"%LOG%" echo R54_TESTS=PASS
>>"%LOG%" echo STEP_2=FRESH_D1_11_SOURCE_READONLY_INSPECTION
"%NODE%" "%STAGE%\scripts\iran-progress\news-metadata-publish-r54.mjs" --inspect >>"%LOG%" 2>&1
if errorlevel 1 goto :inspect_failed
if not exist "%R46%" goto :r46_missing
if not exist "%R49%" goto :r49_missing
>>"%LOG%" echo STEP_3=EIGHT_EXACT_IDS_READONLY_PREFLIGHT
"%NODE%" "%STAGE%\scripts\iran-progress\news-metadata-publish-r54.mjs" --preflight "%R46%" "%R49%" >>"%LOG%" 2>&1
if errorlevel 1 goto :preflight_failed
>>"%LOG%" echo STEP_4=APPROVED_ATOMIC_SINGLE_REQUEST_OR_NOOP_IF_ALREADY_STORED
set "ZGMINI_IRAN_NEWS_R54_APPROVED=YES"
"%NODE%" "%STAGE%\scripts\iran-progress\news-metadata-publish-r54.mjs" --apply-approved "%R46%" "%R49%" >>"%LOG%" 2>&1
set "R54_RC=%errorlevel%"
set "ZGMINI_IRAN_NEWS_R54_APPROVED="
>>"%LOG%" echo R54_NODE_EXIT=%R54_RC%
if not "%R54_RC%"=="0" goto :write_review
>>"%LOG%" echo FINAL_STATUS=R55_READBACK_VERIFIED_OR_EIGHT_ALREADY_STORED_CHECK_JSON
echo R55 returned successfully. Upload result TXT for D1 and public API verification.
pause
exit /b 0
:prior_missing
>>"%LOG%" echo FINAL_STATUS=PRIOR_R54_RESULT_MISSING_NO_WRITE
goto :failed
:prior_not_verified
>>"%LOG%" echo FINAL_STATUS=PRIOR_R54_RESULT_NOT_PROVEN_NO_WRITE
goto :failed
:evidence_hash_failed
>>"%LOG%" echo FINAL_STATUS=ORIGINAL_EVIDENCE_HASH_MISMATCH_NO_WRITE
goto :failed
:node_missing
>>"%LOG%" echo FINAL_STATUS=NODE_MISSING_NO_WRITE
goto :failed
:stage_failed
>>"%LOG%" echo FINAL_STATUS=STAGING_DIR_UNAVAILABLE_NO_WRITE
goto :failed
:source_failed
>>"%LOG%" echo FINAL_STATUS=SOURCE_OR_HASH_FAILED_NO_WRITE
goto :failed
:test_failed
>>"%LOG%" echo FINAL_STATUS=TESTS_FAILED_NO_WRITE
goto :failed
:inspect_failed
>>"%LOG%" echo FINAL_STATUS=D1_SCHEMA_INSPECTION_FAILED_NO_WRITE
goto :failed
:r46_missing
>>"%LOG%" echo FINAL_STATUS=R46_EVIDENCE_MISSING_NO_WRITE
goto :failed
:r49_missing
>>"%LOG%" echo FINAL_STATUS=R49_EVIDENCE_MISSING_NO_WRITE
goto :failed
:preflight_failed
>>"%LOG%" echo FINAL_STATUS=EIGHT_MEMBERSHIP_PREFLIGHT_STOP_NO_WRITE
goto :failed
:write_review
>>"%LOG%" echo FINAL_STATUS=WRITE_OUTCOME_REQUIRES_FRESH_D1_READBACK_NO_RETRY
:failed
echo STOP. Upload result TXT. Do not rerun this script.
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
:sha256
"%NODE%" -e "const fs=require('node:fs'),c=require('node:crypto');const b=fs.readFileSync(process.argv[1]);const h=c.createHash('sha256').update(b).digest('hex');process.exit(h===process.argv[2]?0:3)" "%~1" "%~2" >>"%LOG%" 2>&1
exit /b %errorlevel%
