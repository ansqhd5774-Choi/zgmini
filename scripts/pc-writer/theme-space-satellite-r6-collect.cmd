@echo off
setlocal DisableDelayedExpansion
rem Bounded R6 price collection: NASA + SPY only, same approved GMH collector.
rem Existing UFO/ROKT/ARKX files and their checkpoints are never recollected/reset.
rem Max 4 free GETs per run. No D1, public writes, scheduler or DNS changes.
rem Extract ZIP to Desktop. Log remains next to this CMD.
set "SS_R6_SOURCE_SHA=016eeedf88926d2e31e504561ddbe0c895389ee3"
set "SS_R6_HASH=845e325813b904e704a7948367855f152a40ab28be9fb874535eadaee9478b25"
set "SS_R6_NODE=E:\ZGmini\runtime\node.exe"
set "SS_R6_DATA=E:\ZGmini\data"
set "SS_R5_SOURCE=E:\ZGmini\projects\zgmini-theme-optional\releases\d82329419a95eb0b77a638c475c7365b3627c2a7\scripts\pc-writer"
set "SS_R6_COLLECT=%~dp0theme-space-satellite-r6-collect.mjs"
set "SS_R6_LOG=%~dp0SPACE_SATELLITE_R6_RESULT.txt"
>"%SS_R6_LOG%" echo REPORT=SPACE_SATELLITE_R6_MISSING_ONLY_BOUNDED_COLLECTION
>>"%SS_R6_LOG%" echo PINNED_R6_SOURCE_SHA=%SS_R6_SOURCE_SHA%
>>"%SS_R6_LOG%" echo SOURCE_WINDOW=2024-01-01_TO_2026-10-23
>>"%SS_R6_LOG%" echo SOURCE_SYMBOLS=NASA_SPY_ONLY_MAX_4_GETS
if not exist "%SS_R6_NODE%" goto node_missing
if not exist "%SS_R6_DATA%" goto data_missing
if not exist "%SS_R5_SOURCE%\theme-space-satellite-adaptive-r2.mjs" goto source_missing
if not exist "%SS_R6_COLLECT%" goto package_missing
"%SS_R6_NODE%" -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:2)" "%SS_R6_COLLECT%" "%SS_R6_HASH%" >>"%SS_R6_LOG%" 2>&1
if errorlevel 1 goto source_hash_error
>>"%SS_R6_LOG%" echo PHASE=READ_ONLY_BEFORE
"%SS_R6_NODE%" "%SS_R5_SOURCE%\theme-space-satellite-adaptive-r2.mjs" --audit >>"%SS_R6_LOG%" 2>&1
if errorlevel 1 goto failed
>>"%SS_R6_LOG%" echo PHASE=COLLECT_ONLY_MISSING_NASA_SPY
"%SS_R6_NODE%" "%SS_R6_COLLECT%" --collect space-satellite 2024-01-01 2026-10-23 >>"%SS_R6_LOG%" 2>&1
if errorlevel 1 goto failed
>>"%SS_R6_LOG%" echo PHASE=READ_ONLY_AFTER
"%SS_R6_NODE%" "%SS_R5_SOURCE%\theme-space-satellite-adaptive-r2.mjs" --audit >>"%SS_R6_LOG%" 2>&1
if errorlevel 1 goto failed
>>"%SS_R6_LOG%" echo RESULT=R6_PRIVATE_BOUNDED_COLLECTION_CYCLE_FINISHED_NO_D1_NO_TASK
type "%SS_R6_LOG%"
exit /b 0
:node_missing
>>"%SS_R6_LOG%" echo BLOCKED=APPROVED_E_NODE_MISSING
goto failed
:data_missing
>>"%SS_R6_LOG%" echo BLOCKED=APPROVED_E_DATA_ROOT_MISSING
goto failed
:source_missing
>>"%SS_R6_LOG%" echo BLOCKED=R5_IMMUTABLE_PRIVATE_AUDITOR_MISSING
goto failed
:package_missing
>>"%SS_R6_LOG%" echo BLOCKED=R6_COLLECTOR_MISSING_FROM_CMD_FOLDER
goto failed
:source_hash_error
>>"%SS_R6_LOG%" echo BLOCKED=R6_COLLECTOR_SHA256_MISMATCH
goto failed
:failed
>>"%SS_R6_LOG%" echo RESULT=BLOCKED_REVIEW_CHECKPOINT_NO_BLIND_RETRY
type "%SS_R6_LOG%"
exit /b 1
