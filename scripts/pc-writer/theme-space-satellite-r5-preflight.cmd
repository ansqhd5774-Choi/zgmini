@echo off
setlocal DisableDelayedExpansion
rem Read-only inspection of Space/Satellite PC prices after immutable code staging.
rem Never collects ETF prices, publishes, registers tasks, or edits existing nine.
rem Keep this CMD on Desktop. Result TXT and downloaded helper stay beside CMD.
set "SS_R5_HELPER_SHA=6770912321ca70c842fc618b45b10fa591b0f099"
set "SS_R5_HELPER_HASH=430b556baf02f1a27529520efaf90abc7cd172b636efd5e30d0b1694253ae260"
set "SS_R5_NODE=E:\ZGmini\runtime\node.exe"
set "SS_R5_HELPER=%~dp0theme-space-satellite-r5-preflight.mjs"
set "SS_R5_LOG=%~dp0SPACE_SATELLITE_R5_RESULT.txt"
>"%SS_R5_LOG%" echo REPORT=SPACE_SATELLITE_R5_PRIVATE_PC_PREFLIGHT
>>"%SS_R5_LOG%" echo PINNED_HELPER_SHA=%SS_R5_HELPER_SHA%
>>"%SS_R5_LOG%" echo PINNED_SOURCE_SHA=d82329419a95eb0b77a638c475c7365b3627c2a7
if not exist "%SS_R5_NODE%" goto node_missing
if not exist "E:\ZGmini\projects" goto projects_missing
if not exist "E:\ZGmini\data" goto data_missing
if exist "%SS_R5_HELPER%" goto verify_helper
curl.exe --fail --location --silent --show-error --retry 0 --connect-timeout 12 --max-time 60 "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%SS_R5_HELPER_SHA%/scripts/pc-writer/theme-space-satellite-r5-preflight.mjs" --output "%SS_R5_HELPER%" >>"%SS_R5_LOG%" 2>&1
if errorlevel 1 goto failed
:verify_helper
"%SS_R5_NODE%" -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:2)" "%SS_R5_HELPER%" "%SS_R5_HELPER_HASH%" >>"%SS_R5_LOG%" 2>&1
if errorlevel 1 goto helper_hash_error
"%SS_R5_NODE%" "%SS_R5_HELPER%" --preflight >>"%SS_R5_LOG%" 2>&1
if errorlevel 1 goto failed
>>"%SS_R5_LOG%" echo RESULT=PRIVATE_PREFLIGHT_COMPLETE_NO_PRICE_COLLECTION_NO_D1_NO_TASK
type "%SS_R5_LOG%"
exit /b 0
:node_missing
>>"%SS_R5_LOG%" echo BLOCKED=APPROVED_E_NODE_MISSING
goto failed
:projects_missing
>>"%SS_R5_LOG%" echo BLOCKED=APPROVED_E_PROJECTS_MISSING
goto failed
:data_missing
>>"%SS_R5_LOG%" echo BLOCKED=APPROVED_E_DATA_ROOT_MISSING
goto failed
:helper_hash_error
>>"%SS_R5_LOG%" echo BLOCKED=PINNED_HELPER_SHA256_MISMATCH_REVIEW_FILE
goto failed
:failed
>>"%SS_R5_LOG%" echo RESULT=BLOCKED_NO_BLIND_RETRY_REVIEW_SAME_FOLDER_LOG
type "%SS_R5_LOG%"
exit /b 1
