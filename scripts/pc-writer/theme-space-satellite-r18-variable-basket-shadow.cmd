@echo off
setlocal DisableDelayedExpansion
rem R18: existing NY15 individual ETF scores + UNAPPROVED unlimited-count R4-A shadow.
rem READ ONLY: no provider calls, no proxy fallback, no data or public writes.
rem Extract all 11 files to one Desktop folder. Run once, share adjacent log.
set "R18_NODE=E:\ZGmini\runtime\node.exe"
set "R18_DATA=E:\ZGmini\data"
set "R18_LOG=%~dp0SPACE_SATELLITE_R18_VARIABLE_BASKET_RESULT.txt"
>>"%R18_LOG%" echo REPORT=SPACE_SATELLITE_R18_PC_PRIVATE_VARIABLE_BASKET_SHADOW
>>"%R18_LOG%" echo RUN_STARTED=%DATE% %TIME%
>>"%R18_LOG%" echo PROVIDER_GETS=0
>>"%R18_LOG%" echo PC_DATA_WRITES=0
if not exist "%R18_NODE%" goto node_missing
if not exist "%R18_DATA%" goto data_missing
if not exist "%~dp0theme-space-satellite-r18-variable-basket-shadow.mjs" goto file_missing
if not exist "%~dp0theme-space-satellite-r15-all-etf-score-audit.mjs" goto file_missing
if not exist "%~dp0theme-space-satellite-r13-local-universe-audit.mjs" goto file_missing
if not exist "%~dp0theme-space-satellite-r12-provider-probe.mjs" goto file_missing
if not exist "%~dp0theme-space-satellite-adaptive-r2.mjs" goto file_missing
if not exist "%~dp0theme-optional-score-r188.mjs" goto file_missing
if not exist "%~dp0theme-optional-adaptive-r2.mjs" goto file_missing
if not exist "%~dp0theme-optional-pair-weight-r3.mjs" goto file_missing
if not exist "%~dp0theme-optional-relative-weight-r4.mjs" goto file_missing
if not exist "%~dp0theme-shared-spy-readonly-r1.mjs" goto file_missing
call :verify theme-space-satellite-r18-variable-basket-shadow.mjs 772cf058724347d57495f9151ca650af6147a85385fb58990b5b169b94b9c000
if errorlevel 1 goto hash_mismatch
call :verify theme-space-satellite-r15-all-etf-score-audit.mjs 8a71a72863cd4b660394b5d33fe209b7284cad8e63ad17edb459e6a4016c09a9
if errorlevel 1 goto hash_mismatch
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
call :verify theme-optional-relative-weight-r4.mjs 4474c6339273b8885333aa04102b4d0c8e4bf52dcb1201e249f9fc68e185c8e2
if errorlevel 1 goto hash_mismatch
call :verify theme-shared-spy-readonly-r1.mjs 663d3414fc49231b93f7f42071d8b2e9d219e11f8e50385d63066790e2db6f1d
if errorlevel 1 goto hash_mismatch
set "ZGMINI_DATA_ROOT=%R18_DATA%"
>>"%R18_LOG%" echo PHASE=ALL_CODE_SHA256_VERIFIED
"%R18_NODE%" "%~dp0theme-space-satellite-r18-variable-basket-shadow.mjs" --audit >>"%R18_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%R18_LOG%" echo RESULT=PRIVATE_UNLIMITED_COUNT_BASKET_SHADOW_NO_OPERATION_CHANGE
type "%R18_LOG%"
exit /b 0
:verify
"%R18_NODE%" -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:2)" "%~dp0%~1" "%~2" >>"%R18_LOG%" 2>&1
exit /b %errorlevel%
:node_missing
>>"%R18_LOG%" echo BLOCKED=PC_NODE_RUNTIME_MISSING
goto failed
:data_missing
>>"%R18_LOG%" echo BLOCKED=PC_DATA_ROOT_MISSING
goto failed
:file_missing
>>"%R18_LOG%" echo BLOCKED=PACKAGE_FILE_MISSING
goto failed
:hash_mismatch
>>"%R18_LOG%" echo BLOCKED=PACKAGE_SHA256_MISMATCH
goto failed
:blocked
>>"%R18_LOG%" echo BLOCKED=R18_READ_ONLY_SHADOW_FAILED
:failed
>>"%R18_LOG%" echo RESULT=BLOCKED_NO_DATA_OR_PUBLIC_CHANGE
type "%R18_LOG%"
exit /b 1
