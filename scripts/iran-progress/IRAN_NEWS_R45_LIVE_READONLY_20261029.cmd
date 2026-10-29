@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R45_LOG=%~dp0IRAN_NEWS_R45_LIVE_READONLY_RESULT.txt"
set "R45_DIR=%~dp0IRAN_NEWS_R45_RUNTIME"
set "R45_SCRIPT=%R45_DIR%\news-four-source-probe-r45.mjs"
set "R45_NODE=E:\ZGmini\runtime\node.exe"
set "R45_SHA=dd33dc2310c700676af43917f57527d4692199ea"
if exist "%R45_LOG%" (
  echo Existing result: "%R45_LOG%"
  echo DO_NOT_RERUN. Send existing TXT for review.
  pause
  exit /b 1
)
>"%R45_LOG%" echo R45_READ_ONLY_BEGIN=YES
>>"%R45_LOG%" echo SOURCE_COMMIT=%R45_SHA%
>>"%R45_LOG%" echo NO_D1_NO_SCHEDULE_NO_SCORE_NO_PC_CACHE_WRITES=YES
if not exist "%R45_NODE%" goto :node_missing
if not exist "%R45_DIR%" mkdir "%R45_DIR%" >nul 2>&1
if not exist "%R45_DIR%" goto :mkdir_failed
curl.exe -fLSs --connect-timeout 10 --max-time 35 --output "%R45_SCRIPT%" "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%R45_SHA%/scripts/iran-progress/news-four-source-probe-r45.mjs" >>"%R45_LOG%" 2>&1
if errorlevel 1 goto :download_failed
>>"%R45_LOG%" echo R45_SOURCE_FETCH=PASS
"%R45_NODE%" "%R45_SCRIPT%" --probe >>"%R45_LOG%" 2>&1
set "R45_RC=%errorlevel%"
>>"%R45_LOG%" echo R45_NODE_EXIT=%R45_RC%
>>"%R45_LOG%" echo FINAL_STATUS=READ_ONLY_PROBE_FINISHED
if not "%R45_RC%"=="0" goto :done_failed
echo R45 completed. Send TXT in same folder.
pause
exit /b 0
:node_missing
>>"%R45_LOG%" echo FINAL_STATUS=NODE_MISSING_NO_COLLECTION
 goto :done_failed
:mkdir_failed
>>"%R45_LOG%" echo FINAL_STATUS=STAGING_FOLDER_UNAVAILABLE
 goto :done_failed
:download_failed
>>"%R45_LOG%" echo FINAL_STATUS=DOWNLOAD_FAILED_NO_COLLECTION
 goto :done_failed
:done_failed
echo R45 failed before or during read-only probe. Send result TXT. Do not rerun.
pause
exit /b 1
