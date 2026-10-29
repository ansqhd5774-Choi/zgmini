@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "LOG=%~dp0IRAN_NEWS_R47_D1_PREFLIGHT_RESULT.txt"
set "EVIDENCE=%~dp0IRAN_NEWS_R45_R46_TEST_RESULT.txt"
set "STAGE=%~dp0IRAN_NEWS_R47_READONLY_STAGE"
set "NODE=E:\ZGmini\runtime\node.exe"
set "PIN=9c5e3b2dbdfc7749bfa9510ee446b9d4cf47b2a5"
if exist "%LOG%" (
 echo Existing R47 result found. DO NOT RERUN. Upload prior TXT.
 pause
 exit /b 2
)
>"%LOG%" echo R47_D1_READ_ONLY_BEGIN=YES
>>"%LOG%" echo PINNED_SOURCE=%PIN%
>>"%LOG%" echo D1_WRITES=DISABLED
>>"%LOG%" echo PC_CACHE_SCHEDULER_SCORE_DEPLOYMENT_CHANGES=DISABLED
if not exist "%EVIDENCE%" goto :evidence_missing
if not exist "%NODE%" goto :node_missing
if not exist "%STAGE%" mkdir "%STAGE%" >nul 2>&1
if not exist "%STAGE%" goto :stage_failed
call :fetch "scripts/iran-progress/news-metadata-preflight-r47.mjs" "f5ec89f7d6469c08aa98bddbe5c10b8c58df43f2"
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
call :fetch "tests/iran-news-r47-preflight.test.mjs" "3e1eb2ed641723cc388d9f9e77a0968631c14b95"
if errorlevel 1 goto :source_failed
>>"%LOG%" echo SOURCE_FILES=9_VERIFIED
>>"%LOG%" echo TEST_STAGE=R47_MOCK_D1_AND_EVIDENCE_TEST
"%NODE%" --test "%STAGE%\tests\iran-news-r47-preflight.test.mjs" >>"%LOG%" 2>&1
if errorlevel 1 goto :test_failed
>>"%LOG%" echo R47_TESTS=PASS
>>"%LOG%" echo D1_STAGE=REMOTE_READ_ONLY_PREFLIGHT
"%NODE%" "%STAGE%\scripts\iran-progress\news-metadata-preflight-r47.mjs" --preflight "%EVIDENCE%" >>"%LOG%" 2>&1
if errorlevel 1 goto :preflight_review
>>"%LOG%" echo FINAL_STATUS=R47_PREFLIGHT_READY_NO_D1_WRITE
echo R47 D1 read-only preflight complete. Upload result TXT.
pause
exit /b 0
:evidence_missing
>>"%LOG%" echo FINAL_STATUS=R46_RESULT_MISSING_MOVE_TXT_BESIDE_CMD
goto :failed
:node_missing
>>"%LOG%" echo FINAL_STATUS=APPROVED_NODE_MISSING
goto :failed
:stage_failed
>>"%LOG%" echo FINAL_STATUS=STAGING_DIR_UNAVAILABLE
goto :failed
:source_failed
>>"%LOG%" echo FINAL_STATUS=R47_SOURCE_FETCH_OR_IDENTITY_FAILED
goto :failed
:test_failed
>>"%LOG%" echo FINAL_STATUS=R47_TESTS_FAILED_NO_D1_WRITE
goto :failed
:preflight_review
>>"%LOG%" echo FINAL_STATUS=R47_PREFLIGHT_NOT_READY_NO_D1_WRITE
:failed
echo Read-only R47 did not pass. Upload TXT; do not rerun automatically.
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
