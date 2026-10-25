@echo off
setlocal DisableDelayedExpansion
rem R9 private shadow of original R8 and generalized R4 maturity weights.
rem Extract all nine package files together on Desktop and run this CMD.
rem No API calls, source writes, scheduler, D1 or public publication.
set "SS_R9_NODE=E:\ZGmini\runtime\node.exe"
set "SS_R9_DATA=E:\ZGmini\data"
set "SS_R9_LOG=%~dp0SPACE_SATELLITE_R9_PRIVATE_SHADOW_RESULT.txt"
>"%SS_R9_LOG%" echo REPORT=SPACE_SATELLITE_R9_PRIVATE_RELATIVE_SHADOW
>>"%SS_R9_LOG%" echo SHARED_SPY_SOURCE=data-center-power
>>"%SS_R9_LOG%" echo PROVIDER_GETS=0
if not exist "%SS_R9_NODE%" goto node_missing
if not exist "%SS_R9_DATA%" goto data_missing
if not exist "%~dp0theme-space-satellite-r9-relative-audit.mjs" goto package_missing
if not exist "%~dp0theme-space-satellite-r8-real-audit.mjs" goto package_missing
if not exist "%~dp0theme-space-satellite-adaptive-r2.mjs" goto package_missing
if not exist "%~dp0theme-optional-score-r188.mjs" goto package_missing
if not exist "%~dp0theme-optional-adaptive-r2.mjs" goto package_missing
if not exist "%~dp0theme-optional-pair-weight-r3.mjs" goto package_missing
if not exist "%~dp0theme-optional-relative-weight-r4.mjs" goto package_missing
if not exist "%~dp0theme-shared-spy-readonly-r1.mjs" goto package_missing
call :verify theme-space-satellite-r9-relative-audit.mjs 4b1d3aa6264b9ae645970e7b516df2ecf3dc2c54f77eed35a97554021a38fd31
if errorlevel 1 goto hash_mismatch
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
call :verify theme-optional-relative-weight-r4.mjs da7f2d54329488bc6b61c2729a4c4d16b60da95b697c9f36784b86b769340af7
if errorlevel 1 goto hash_mismatch
call :verify theme-shared-spy-readonly-r1.mjs 663d3414fc49231b93f7f42071d8b2e9d219e11f8e50385d63066790e2db6f1d
if errorlevel 1 goto hash_mismatch
set "ZGMINI_DATA_ROOT=%SS_R9_DATA%"
>>"%SS_R9_LOG%" echo PHASE=LOCAL_SHA_VERIFIED_PRIVATE_SHADOW_NO_PUBLICATION
"%SS_R9_NODE%" "%~dp0theme-space-satellite-r9-relative-audit.mjs" --audit >>"%SS_R9_LOG%" 2>&1
if errorlevel 1 goto audit_blocked
>>"%SS_R9_LOG%" echo RESULT=R9_PRIVATE_SHADOW_REPORTED_NO_DATA_CHANGE
type "%SS_R9_LOG%"
exit /b 0
:verify
"%SS_R9_NODE%" -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:2)" "%~dp0%~1" "%~2" >>"%SS_R9_LOG%" 2>&1
exit /b %errorlevel%
:node_missing
>>"%SS_R9_LOG%" echo BLOCKED=APPROVED_NODE_MISSING
goto failed
:data_missing
>>"%SS_R9_LOG%" echo BLOCKED=APPROVED_DATA_ROOT_MISSING
goto failed
:package_missing
>>"%SS_R9_LOG%" echo BLOCKED=REQUIRED_AUDIT_SOURCE_MISSING_FROM_CMD_FOLDER
goto failed
:hash_mismatch
>>"%SS_R9_LOG%" echo BLOCKED=AUDIT_SOURCE_SHA256_MISMATCH
goto failed
:audit_blocked
>>"%SS_R9_LOG%" echo BLOCKED=PRIVATE_SHADOW_CHECK_COVERAGE_OR_PARITY
:failed
>>"%SS_R9_LOG%" echo RESULT=BLOCKED_NO_RECOLLECTION_NO_RETRY_REQUIRED
type "%SS_R9_LOG%"
exit /b 1
