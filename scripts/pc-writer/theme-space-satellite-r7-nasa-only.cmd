@echo off
setlocal DisableDelayedExpansion
rem R7 opt-in NASA-only free bounded collection. NO UFO OR SPY REQUESTS.
rem Unzip two files together onto Desktop. Log is next to this CMD.
rem Never retries failed calls, never publishes D1, no scheduled task changes.
set "SS_R7_NODE=E:\ZGmini\runtime\node.exe"
set "SS_R7_DATA=E:\ZGmini\data"
set "SS_R7_JS=%~dp0theme-space-satellite-r7-nasa-only.mjs"
set "SS_R7_LOG=%~dp0SPACE_SATELLITE_R7_NASA_RESULT.txt"
set "SS_R7_SHA=d7346a52898b2c57d612d5b9ce11e7721dc45ab718ff1e883fba47281027877e"
>"%SS_R7_LOG%" echo REPORT=SPACE_SATELLITE_R7_NASA_ONLY
>>"%SS_R7_LOG%" echo SYMBOL=NASA_ONLY_NO_UFO_NO_SPY
>>"%SS_R7_LOG%" echo WINDOW=2026-03-30_TO_2026-10-23
>>"%SS_R7_LOG%" echo MAX_PROVIDER_GETS=4_PER_MANUAL_RUN
if not exist "%SS_R7_NODE%" goto node_missing
if not exist "%SS_R7_DATA%" goto data_missing
if not exist "%SS_R7_JS%" goto package_missing
"%SS_R7_NODE%" -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:2)" "%SS_R7_JS%" "%SS_R7_SHA%" >>"%SS_R7_LOG%" 2>&1
if errorlevel 1 goto hash_mismatch
>>"%SS_R7_LOG%" echo PHASE=PRIVATE_NASA_ONLY_COLLECTION
set "ZGMINI_DATA_ROOT=%SS_R7_DATA%"
"%SS_R7_NODE%" "%SS_R7_JS%" --collect space-satellite 2026-03-30 2026-10-23 >>"%SS_R7_LOG%" 2>&1
if errorlevel 1 goto failed
>>"%SS_R7_LOG%" echo RESULT=NASA_PRIVATE_RAW_CYCLE_FINISHED_VERIFY_ACTUAL_COVERAGE_NEXT
type "%SS_R7_LOG%"
exit /b 0
:node_missing
>>"%SS_R7_LOG%" echo BLOCKED=APPROVED_E_NODE_MISSING
goto failed
:data_missing
>>"%SS_R7_LOG%" echo BLOCKED=APPROVED_E_DATA_ROOT_MISSING
goto failed
:package_missing
>>"%SS_R7_LOG%" echo BLOCKED=NASA_JS_MISSING_FROM_CMD_FOLDER
goto failed
:hash_mismatch
>>"%SS_R7_LOG%" echo BLOCKED=NASA_JS_SHA256_MISMATCH
goto failed
:failed
>>"%SS_R7_LOG%" echo RESULT=BLOCKED_REVIEW_LOCAL_CHECKPOINT_NO_BLIND_RETRY
type "%SS_R7_LOG%"
exit /b 1
