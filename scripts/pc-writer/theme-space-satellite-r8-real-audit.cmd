@echo off
setlocal DisableDelayedExpansion
rem R8: read-only NASA/UFO plus existing data-center SPY real-score audit.
rem Unzip all seven files into the SAME Desktop folder and run this CMD.
rem No provider requests, no score writes, D1, schedule, or production changes.
set "SS_R8_NODE=E:\ZGmini\runtime\node.exe"
set "SS_R8_DATA=E:\ZGmini\data"
set "SS_R8_LOG=%~dp0SPACE_SATELLITE_R8_REAL_AUDIT_RESULT.txt"
>"%SS_R8_LOG%" echo REPORT=SPACE_SATELLITE_R8_REAL_DATA_READ_ONLY_AUDIT
>>"%SS_R8_LOG%" echo SHARED_SPY_SOURCE=data-center-power
>>"%SS_R8_LOG%" echo PROVIDER_GETS=0
if not exist "%SS_R8_NODE%" goto node_missing
if not exist "%SS_R8_DATA%" goto data_missing
if not exist "%~dp0theme-space-satellite-r8-real-audit.mjs" goto package_missing
if not exist "%~dp0theme-space-satellite-adaptive-r2.mjs" goto package_missing
if not exist "%~dp0theme-optional-score-r188.mjs" goto package_missing
if not exist "%~dp0theme-optional-adaptive-r2.mjs" goto package_missing
if not exist "%~dp0theme-optional-pair-weight-r3.mjs" goto package_missing
if not exist "%~dp0theme-shared-spy-readonly-r1.mjs" goto package_missing
call :verify theme-space-satellite-r8-real-audit.mjs 3ad33f14b1417a053f7722b88d5be20bcce89790a81fd662626ffb17aacfb189
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
set "ZGMINI_DATA_ROOT=%SS_R8_DATA%"
>>"%SS_R8_LOG%" echo PHASE=LOCAL_SHA_VERIFIED_READ_ONLY_PAIR_AUDIT
"%SS_R8_NODE%" "%~dp0theme-space-satellite-r8-real-audit.mjs" --audit >>"%SS_R8_LOG%" 2>&1
if errorlevel 1 goto audit_blocked
>>"%SS_R8_LOG%" echo RESULT=PRIVATE_REAL_DATA_AUDIT_REPORTED_NO_PUBLICATION
type "%SS_R8_LOG%"
exit /b 0
:verify
"%SS_R8_NODE%" -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:2)" "%~dp0%~1" "%~2" >>"%SS_R8_LOG%" 2>&1
exit /b %errorlevel%
:node_missing
>>"%SS_R8_LOG%" echo BLOCKED=APPROVED_NODE_MISSING
goto failed
:data_missing
>>"%SS_R8_LOG%" echo BLOCKED=APPROVED_DATA_ROOT_MISSING
goto failed
:package_missing
>>"%SS_R8_LOG%" echo BLOCKED=REQUIRED_AUDIT_SOURCE_MISSING_FROM_CMD_FOLDER
goto failed
:hash_mismatch
>>"%SS_R8_LOG%" echo BLOCKED=AUDIT_SOURCE_SHA256_MISMATCH
goto failed
:audit_blocked
>>"%SS_R8_LOG%" echo BLOCKED=CHECK_PRIVATE_DATA_COVERAGE_OR_SOURCE
:failed
>>"%SS_R8_LOG%" echo RESULT=BLOCKED_NO_RECOLLECTION_NO_RETRY_REQUIRED
type "%SS_R8_LOG%"
exit /b 1
