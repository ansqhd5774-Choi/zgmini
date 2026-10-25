@echo off
setlocal DisableDelayedExpansion
rem One-click PC source install + bounded anonymous ETF backfill + private score.
rem This launcher pins an already SHA-verified, immutable R3 GitHub release.
rem No D1 writes, publish consent, task registration or existing-nine modifications.
set "DC_SHA=2f0f1a2c1b31e20f9e943e90824885d586448d29"
set "DC_NODE=E:\ZGmini\runtime\node.exe"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "DC_TOOLS=%~dp0theme-optional-stage-r4-tool.mjs"
set "DC_LOG=%~dp0DATA_CENTER_POWER_R4_RESULT.txt"
set "DC_RELEASE=E:\ZGmini\projects\zgmini-theme-optional\releases\%DC_SHA%\scripts\pc-writer"
if not exist "%DC_NODE%" goto node_missing
if not exist "E:\ZGmini\projects" goto projects_missing
if not exist "%ZGMINI_DATA_ROOT%" goto data_missing
>"%DC_LOG%" echo DATA_CENTER_POWER_R4_PRIVATE_PC_BOOTSTRAP
>>"%DC_LOG%" echo PINNED_SOURCE_SHA=%DC_SHA%
curl.exe --fail --location --silent --show-error --retry 0 --connect-timeout 12 --max-time 60 "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%DC_SHA%/scripts/pc-writer/theme-optional-stage.mjs" --output "%DC_TOOLS%" >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
"%DC_NODE%" "%DC_TOOLS%" --source-sha=%DC_SHA% >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
if not exist "%DC_RELEASE%\theme-optional-collect.mjs" goto staged_missing
if not exist "%DC_RELEASE%\theme-data-center-power-r1.mjs" goto staged_missing
if not exist "%DC_RELEASE%\theme-data-center-power-publish-r3.mjs" goto staged_missing
if exist "%ZGMINI_DATA_ROOT%\themes\data-center-power\raw-manifest.json" goto existing_raw
rem Initial raw backfill: 4 or fewer free GETs per call, never blindly retry a failure.
"%DC_NODE%" "%DC_RELEASE%\theme-optional-collect.mjs" --collect data-center-power 2024-01-01 2026-10-22 >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
"%DC_NODE%" "%DC_RELEASE%\theme-optional-collect.mjs" --collect data-center-power 2024-01-01 2026-10-22 >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
"%DC_NODE%" "%DC_RELEASE%\theme-data-center-power-r1.mjs" --score >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
"%DC_NODE%" "%DC_RELEASE%\theme-data-center-power-publish-r3.mjs" --once >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
goto complete
:existing_raw
rem Existing manifests stay untouched except for legitimate new bounded API pages.
"%DC_NODE%" "%DC_RELEASE%\theme-data-center-power-publish-r3.mjs" --once --collect >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
goto complete
:complete
>>"%DC_LOG%" echo RESULT=PRIVATE_PC_SCORE_VERIFIED_NO_D1_NO_SCHEDULER
type "%DC_LOG%"
exit /b 0
:node_missing
echo BLOCKED=E_NODE_MISSING
exit /b 1
:projects_missing
echo BLOCKED=E_PROJECTS_ROOT_MISSING
exit /b 1
:data_missing
echo BLOCKED=E_DATA_ROOT_MISSING
exit /b 1
:staged_missing
>>"%DC_LOG%" echo BLOCKED=IMMUTABLE_SOURCE_STAGE_INCOMPLETE
goto failed
:failed
>>"%DC_LOG%" echo RESULT=BLOCKED_REVIEW_SAME_FOLDER_LOG_NO_BLIND_RETRY
type "%DC_LOG%"
exit /b 1
