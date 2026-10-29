@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "LOG=%~dp0IRAN_NEWS_R49_MEMBERSHIP_PREFLIGHT_RESULT.txt"
set "EVIDENCE=%~dp0IRAN_NEWS_R45_R46_TEST_RESULT.txt"
set "STAGE=%~dp0IRAN_NEWS_R49_READONLY_STAGE"
set "NODE=E:\ZGmini\runtime\node.exe"
set "PIN=1c36f385d55d4fb97d380f33105b7e930ba6efe1"
if exist "%LOG%" (
 echo Existing result found. DO_NOT_RERUN. Send the existing TXT.
 pause
 exit /b 2
)
>"%LOG%" echo R49_MEMBERSHIP_PREFLIGHT_BEGIN=YES
>>"%LOG%" echo PINNED_SOURCE=%PIN%
>>"%LOG%" echo D1_WRITES_SCHEDULER_SCORE_DEPLOY=DISABLED
if not exist "%EVIDENCE%" goto :evidence_missing
if not exist "%NODE%" goto :node_missing
if not exist "%STAGE%" mkdir "%STAGE%" >nul 2>&1
if not exist "%STAGE%" goto :stage_failed
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
call :fetch "scripts/pc-writer/d1.mjs" "38d43e267b2a1babfc50b41b1fc8e7f371a088ff"
if errorlevel 1 goto :source_failed
call :fetch "scripts/pc-writer/d1-transient.mjs" "c7b37c470da1d9e19e40a3dac4452452602297c0"
if errorlevel 1 goto :source_failed
call :fetch "scripts/pc-writer/d1-diagnostics.mjs" "6bbec7625812989ed500982dc23caa7435e24b27"
if errorlevel 1 goto :source_failed
call :fetch "docs/IRAN_NEWS_R41_STAGING_ROWS_20261029.json" "9c1b840602692d7fc28299d187025555ad1a328a"
if errorlevel 1 goto :source_failed
call :fetch "tests/iran-news-r47-preflight.test.mjs" "d39f64b281f0d95822082de5693631e41ef6eca2"
if errorlevel 1 goto :source_failed
>>"%LOG%" echo SOURCE_FILES=11_VERIFIED
>>"%LOG%" echo STAGE_1=MEMBERSHIP_NODE_TESTS
"%NODE%" --test "%STAGE%\tests\iran-news-r47-preflight.test.mjs" >>"%LOG%" 2>&1
if errorlevel 1 goto :test_failed
>>"%LOG%" echo MEMBERSHIP_TESTS=PASS
>>"%LOG%" echo STAGE_2=REMOTE_READONLY_D1_CHECK
"%NODE%" "%STAGE%\scripts\iran-progress\news-metadata-preflight-r47.mjs" --preflight "%EVIDENCE%" >>"%LOG%" 2>&1
if errorlevel 1 goto :preflight_review
>>"%LOG%" echo FINAL_STATUS=R49_MEMBERSHIP_PREFLIGHT_READY_NO_WRITE
echo R49 is ready. Upload the TXT; do not start any D1 write.
pause
exit /b 0
:evidence_missing
>>"%LOG%" echo FINAL_STATUS=R46_EVIDENCE_FILE_MISSING
goto :failed
:node_missing
>>"%LOG%" echo FINAL_STATUS=NODE_MISSING
goto :failed
:stage_failed
>>"%LOG%" echo FINAL_STATUS=STAGING_DIR_UNAVAILABLE
goto :failed
:source_failed
>>"%LOG%" echo FINAL_STATUS=PINNED_SOURCE_OR_HASH_FAILED
goto :failed
:test_failed
>>"%LOG%" echo FINAL_STATUS=MEMBERSHIP_TESTS_FAILED
goto :failed
:preflight_review
>>"%LOG%" echo FINAL_STATUS=R49_PREFLIGHT_NEEDS_REVIEW_NO_WRITE
:failed
echo R49 did not pass. Upload result TXT; DO_NOT_RERUN.
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
