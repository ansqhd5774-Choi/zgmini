@echo off
setlocal DisableDelayedExpansion
rem R13 read-only PC SHA/SPY audit for every available space ETF candidate.
rem Unzip the eight package files into one Desktop folder; run this CMD there.
rem Reads E:\ZGmini\data. Writes ONLY the report beside this CMD.
rem NO HTTP/API, no data/scheduler/DB/publication changes.
set "R13_NODE=E:\ZGmini\runtime\node.exe"
set "R13_DATA=E:\ZGmini\data"
set "R13_LOG=%~dp0SPACE_SATELLITE_R13_EXISTING_RAW_RESULT.txt"
>"%R13_LOG%" echo REPORT=SPACE_SATELLITE_R13_LOCAL_UNIVERSE_READ_ONLY_AUDIT
>>"%R13_LOG%" echo NETWORK_GETS=0
>>"%R13_LOG%" echo PC_DATA_WRITES=0
if not exist "%R13_NODE%" goto node_missing
if not exist "%R13_DATA%" goto data_missing
if not exist "%~dp0theme-space-satellite-r13-local-universe-audit.mjs" goto file_missing
if not exist "%~dp0theme-space-satellite-r12-provider-probe.mjs" goto file_missing
if not exist "%~dp0theme-space-satellite-adaptive-r2.mjs" goto file_missing
if not exist "%~dp0theme-optional-score-r188.mjs" goto file_missing
if not exist "%~dp0theme-optional-adaptive-r2.mjs" goto file_missing
if not exist "%~dp0theme-optional-pair-weight-r3.mjs" goto file_missing
if not exist "%~dp0theme-shared-spy-readonly-r1.mjs" goto file_missing
call :verify theme-space-satellite-r13-local-universe-audit.mjs fe8c51b9e3eeb0943a6456c206cc35d32676782745f240d812103c25427464f9
if errorlevel 1 goto hash_mismatch
call :verify theme-space-satellite-r12-provider-probe.mjs 9e1eaae4505ee3f3678844908dae34d87ec18e09432ed10b48234c078c1eae34
if errorlevel 1 goto hash_mismatch
call :verify theme-space-satellite-adaptive-r2.mjs 1a955d148c3a3d328d3d12048235525b1250cd54c4a1a169be8e6b88722ef586
if errorlevel 1 goto hash_mismatch
call :verify theme-optional-score-r188.mjs 36d45cd82af507f5b75a5a96413c626b50c830ca2aa1291bbb64f113cd0e3366
if errorlevel 1 goto hash_mismatch
call :verify theme-optional-adaptive-r2.mjs f794f5a2005ab8da34fbd12b1e16e0519445cfadca034e29d9cb8d0dfffc3cd3
if errorlevel 1 goto hash_mismatch
call :verify theme-optional-pair-weight-r3.mjs bcaa39ef0351c5f65acaba2560c1234b215c43e223003742e919a9b01a0904d6
if errorlevel 1 goto hash_mismatch
call :verify theme-shared-spy-readonly-r1.mjs 663d3414fc49231b93f7f42071d8b2e9d219e11f8e50385d63066790e2db6f1d
if errorlevel 1 goto hash_mismatch
set "ZGMINI_DATA_ROOT=%R13_DATA%"
>>"%R13_LOG%" echo PHASE=ALL_CODE_SHA256_VERIFIED
"%R13_NODE%" "%~dp0theme-space-satellite-r13-local-universe-audit.mjs" --audit >>"%R13_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%R13_LOG%" echo RESULT=PC_EXISTING_RAW_COVERAGE_AUDITED_NOT_SCORED
type "%R13_LOG%"
exit /b 0
:verify
"%R13_NODE%" -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:2)" "%~dp0%~1" "%~2" >>"%R13_LOG%" 2>&1
exit /b %errorlevel%
:node_missing
>>"%R13_LOG%" echo BLOCKED=PC_NODE_RUNTIME_MISSING
goto failed
:data_missing
>>"%R13_LOG%" echo BLOCKED=PC_DATA_ROOT_MISSING
goto failed
:file_missing
>>"%R13_LOG%" echo BLOCKED=PACKAGE_FILE_MISSING
goto failed
:hash_mismatch
>>"%R13_LOG%" echo BLOCKED=PACKAGE_SHA256_MISMATCH
goto failed
:blocked
>>"%R13_LOG%" echo BLOCKED=READ_ONLY_PC_MANIFEST_OR_SPY_VALIDATION
:failed
>>"%R13_LOG%" echo RESULT=BLOCKED_NO_DATA_CHANGE_NO_AUTOMATIC_RETRY
type "%R13_LOG%"
exit /b 1
