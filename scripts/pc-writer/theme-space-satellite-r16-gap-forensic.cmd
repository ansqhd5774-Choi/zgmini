@echo off
setlocal DisableDelayedExpansion
rem R16 explains missing ETF 15h sessions and R2 metric gaps, all candidates.
rem Reads E:\ZGmini\data; NO network, data writes, aggregation or publication.
rem Unzip nine files to one Desktop folder. Run CMD once for evidence.
set "R16_NODE=E:\ZGmini\runtime\node.exe"
set "R16_DATA=E:\ZGmini\data"
set "R16_LOG=%~dp0SPACE_SATELLITE_R16_GAP_FORENSIC_RESULT.txt"
>>"%R16_LOG%" echo REPORT=SPACE_SATELLITE_R16_PC_READ_ONLY_GAP_FORENSIC
>>"%R16_LOG%" echo RUN_STARTED=%DATE% %TIME%
>>"%R16_LOG%" echo PROVIDER_GETS=0
>>"%R16_LOG%" echo PC_DATA_WRITES=0
if not exist "%R16_NODE%" goto node_missing
if not exist "%R16_DATA%" goto data_missing
if not exist "%~dp0theme-space-satellite-r16-gap-forensic.mjs" goto file_missing
if not exist "%~dp0theme-space-satellite-r13-local-universe-audit.mjs" goto file_missing
if not exist "%~dp0theme-space-satellite-r12-provider-probe.mjs" goto file_missing
if not exist "%~dp0theme-space-satellite-adaptive-r2.mjs" goto file_missing
if not exist "%~dp0theme-optional-score-r188.mjs" goto file_missing
if not exist "%~dp0theme-optional-adaptive-r2.mjs" goto file_missing
if not exist "%~dp0theme-optional-pair-weight-r3.mjs" goto file_missing
if not exist "%~dp0theme-shared-spy-readonly-r1.mjs" goto file_missing
call :verify theme-space-satellite-r16-gap-forensic.mjs 8647f080cbfb6f3748645d9b53f938784f180b963ad594defd73eb7e27c7a8b3
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
call :verify theme-shared-spy-readonly-r1.mjs 663d3414fc49231b93f7f42071d8b2e9d219e11f8e50385d63066790e2db6f1d
if errorlevel 1 goto hash_mismatch
set "ZGMINI_DATA_ROOT=%R16_DATA%"
>>"%R16_LOG%" echo PHASE=ALL_CODE_SHA256_VERIFIED
"%R16_NODE%" "%~dp0theme-space-satellite-r16-gap-forensic.mjs" --audit >>"%R16_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%R16_LOG%" echo RESULT=PRIVATE_GAP_CAUSES_AUDITED_NO_SCORE_CHANGES
type "%R16_LOG%"
exit /b 0
:verify
"%R16_NODE%" -e "const c=require('node:crypto');const f=require('node:fs');process.exit(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex')===process.argv[2]?0:2)" "%~dp0%~1" "%~2" >>"%R16_LOG%" 2>&1
exit /b %errorlevel%
:node_missing
>>"%R16_LOG%" echo BLOCKED=PC_NODE_RUNTIME_MISSING
goto failed
:data_missing
>>"%R16_LOG%" echo BLOCKED=PC_DATA_ROOT_MISSING
goto failed
:file_missing
>>"%R16_LOG%" echo BLOCKED=PACKAGE_FILE_MISSING
goto failed
:hash_mismatch
>>"%R16_LOG%" echo BLOCKED=PACKAGE_SHA256_MISMATCH
goto failed
:blocked
>>"%R16_LOG%" echo BLOCKED=PC_READ_ONLY_GAP_AUDIT_FAILED
:failed
>>"%R16_LOG%" echo RESULT=BLOCKED_NO_DATA_OR_PUBLIC_CHANGE
type "%R16_LOG%"
exit /b 1
