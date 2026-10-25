@echo off
setlocal DisableDelayedExpansion
rem R6: current-main Cloudflare Git Build check -> new tenth-key D1 publish ->
rem      API readback -> only tenth existing task runner cutover.
rem Human publisher opt-in is mandatory; unconfirmed anonymous rights stay false.
set "DC_NODE=E:\ZGmini\runtime\node.exe"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "DC_TOOL=%~dp0theme-optional-stage-r6-tool.mjs"
set "DC_LOG=%~dp0DATA_CENTER_POWER_R6_RESULT.txt"
set "DC_STAGE_LOG=%~dp0DATA_CENTER_POWER_R6_STAGE_RESULT.txt"
set "DC_RUNNER=%~dp0DATA_CENTER_POWER_R5_SCHEDULED.cmd"
if not exist "%DC_NODE%" goto node_missing
if not exist "%ZGMINI_DATA_ROOT%" goto data_missing
if not exist "%DC_RUNNER%" goto runner_missing
>"%DC_LOG%" echo DATA_CENTER_POWER_R6_PUBLISH_WITH_EXPLICIT_CONSENT
>>"%DC_LOG%" echo STARTED=%DATE% %TIME%
curl.exe --fail --location --silent --show-error --retry 0 --connect-timeout 12 --max-time 60 "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/main/scripts/pc-writer/theme-optional-stage.mjs" --output "%DC_TOOL%" >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
"%DC_NODE%" "%DC_TOOL%" >"%DC_STAGE_LOG%" 2>&1
if errorlevel 1 goto stage_failed
set "DC_SHA="
for /f "usebackq tokens=1,* delims==" %%A in ("%DC_STAGE_LOG%") do if /i "%%A"=="sourceSha" set "DC_SHA=%%B"
if not defined DC_SHA goto source_missing
set "DC_SOURCE=E:\ZGmini\projects\zgmini-theme-optional\releases\%DC_SHA%\scripts\pc-writer"
>>"%DC_LOG%" echo STAGED_SOURCE_SHA=%DC_SHA%
if not exist "%DC_SOURCE%\theme-data-center-power-gate-r6.mjs" goto source_missing
if not exist "%DC_SOURCE%\theme-data-center-power-cutover-r6.mjs" goto source_missing
if not exist "%DC_SOURCE%\theme-data-center-power-publish-r3.mjs" goto source_missing
"%DC_NODE%" "%DC_SOURCE%\theme-data-center-power-gate-r6.mjs" --once --source-sha=%DC_SHA% >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
"%DC_NODE%" "%DC_SOURCE%\theme-data-center-power-publish-r3.mjs" --once >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
echo.
echo WARNING: GetMarketHistory anonymous derived-work publishing rights are unconfirmed.
echo Terms give distribution rights subject to an account being in good standing.
echo No account or license proof is invented. This is an explicit publisher risk choice.
echo Type ACCEPT only if you authorize publishing the tenth derived score and its scheduled updates.
set "DC_ACCEPT="
set /p DC_ACCEPT=Type ACCEPT to publish:
if /i not "%DC_ACCEPT%"=="ACCEPT" goto consent_missing
>>"%DC_LOG%" echo EXPLICIT_PUBLISHER_CONSENT=ACCEPT
"%DC_NODE%" "%DC_SOURCE%\theme-data-center-power-publish-r3.mjs" --once --collect --publish --accept-anonymous-license-risk >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
"%DC_NODE%" "%DC_SOURCE%\theme-data-center-power-gate-r6.mjs" --once --source-sha=%DC_SHA% --verify-public >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
"%DC_NODE%" "%DC_SOURCE%\theme-data-center-power-cutover-r6.mjs" --apply "%DC_RUNNER%" "%DC_SHA%" >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
>>"%DC_LOG%" echo RESULT=TENTH_PUBLIC_API_AND_SCHEDULE_RUNNER_VERIFIED_NEXT_REGULAR_RUN_PENDING
type "%DC_LOG%"
exit /b 0
:node_missing
echo BLOCKED=APPROVED_NODE_MISSING
exit /b 1
:data_missing
echo BLOCKED=APPROVED_DATA_ROOT_MISSING
exit /b 1
:runner_missing
echo BLOCKED=R5_SCHEDULED_RUNNER_MISSING_KEEP_IN_ORIGINAL_DESKTOP_FOLDER
exit /b 1
:stage_failed
type "%DC_STAGE_LOG%"
goto failed
:source_missing
>>"%DC_LOG%" echo BLOCKED=R6_SOURCE_SHA_OR_FILES_NOT_STAGED
goto failed
:consent_missing
>>"%DC_LOG%" echo RESULT=NOT_PUBLISHED_NO_CONSENT
type "%DC_LOG%"
exit /b 2
:failed
>>"%DC_LOG%" echo RESULT=BLOCKED_REVIEW_LOG_NO_BLIND_RETRY
type "%DC_LOG%"
exit /b 1
