@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R45_LOG=%~dp0IRAN_NEWS_R45_FIX1_RESULT.txt"
set "R45_DIR=%~dp0IRAN_NEWS_R45_FIX1_RUNTIME"
set "R45_SCRIPT=%R45_DIR%\news-four-source-probe-r45.mjs"
set "R45_NODE=E:\ZGmini\runtime\node.exe"
set "R45_SHA=50115a57bfde25f9f8681a0a28dde9b525f0d174"
set "R45_BLOB=5d8d032458cd8d7440b248054cfb5249bad0c1e8"
if exist "%R45_LOG%" (
 echo Result already exists. DO NOT RERUN. Upload prior TXT.
 pause
 exit /b 1
)
>"%R45_LOG%" echo R45_FIX1_READ_ONLY_BEGIN=YES
>>"%R45_LOG%" echo SOURCE_COMMIT=%R45_SHA%
>>"%R45_LOG%" echo NO_D1_NO_SCHEDULER_NO_SCORE_NO_PC_CACHE_WRITES=YES
if not exist "%R45_NODE%" goto :node_missing
if not exist "%R45_DIR%" mkdir "%R45_DIR%" >nul 2>&1
if not exist "%R45_DIR%" goto :staging_failed
curl.exe -fLSs --retry 0 --connect-timeout 10 --max-time 45 --output "%R45_SCRIPT%" "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%R45_SHA%/scripts/iran-progress/news-four-source-probe-r45.mjs" >>"%R45_LOG%" 2>&1
if errorlevel 1 goto :download_failed
"%R45_NODE%" -e "const f=require('node:fs').readFileSync(process.argv[1]);const h=require('node:crypto').createHash('sha1').update('blob '+f.length+'\0').update(f).digest('hex');process.exit(h===process.argv[2]?0:1)" "%R45_SCRIPT%" "%R45_BLOB%" >>"%R45_LOG%" 2>&1
if errorlevel 1 goto :hash_failed
>>"%R45_LOG%" echo R45_GIT_BLOB_IDENTITY=PASS
"%R45_NODE%" "%R45_SCRIPT%" --probe >>"%R45_LOG%" 2>&1
set "R45_RC=%errorlevel%"
>>"%R45_LOG%" echo R45_NODE_EXIT=%R45_RC%
if not "%R45_RC%"=="0" goto :probe_failed
>>"%R45_LOG%" echo FINAL_STATUS=READ_ONLY_PROBE_FINISHED
echo Read-only probe completed. Send FIX1 TXT.
pause
exit /b 0
:node_missing
>>"%R45_LOG%" echo FINAL_STATUS=NODE_MISSING
goto :failed
:staging_failed
>>"%R45_LOG%" echo FINAL_STATUS=STAGING_FAILED
goto :failed
:download_failed
>>"%R45_LOG%" echo FINAL_STATUS=DOWNLOAD_FAILED
goto :failed
:hash_failed
>>"%R45_LOG%" echo FINAL_STATUS=SOURCE_IDENTITY_FAILED
goto :failed
:probe_failed
>>"%R45_LOG%" echo FINAL_STATUS=PROBE_EXIT_NONZERO
:failed
echo Read-only probe did not complete normally. Upload FIX1 TXT; do not rerun.
pause
exit /b 1
