@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R85: three independent R82 full 21-topic Windows/Ollama runs, each in its own NEW folder.
rem Does not modify R77/R78-R82 originals, public site, scores, or trading settings.
rem Usage: double-click, or pass the quoted full path of the existing complete R77 folder.

set "ZG_R77=%USERPROFILE%\Desktop\ZGMINI_R77_OLLAMA_OFFICIAL_SITEMAP_WINDOWS_20261028"
if not "%~1"=="" set "ZG_R77=%~1"
set "ZG_NODE=E:\ZGmini\runtime\node.exe"
if exist "%ZG_NODE%" goto node_ready
where node >nul 2>nul
if errorlevel 1 goto blocked_node
set "ZG_NODE=node"
:node_ready

if not exist "%ZG_R77%\run-ollama-forecast-r72-safe.mjs" goto blocked_r77
if not exist "%ZG_R77%\run-ollama-forecast-r71.mjs" goto blocked_r77
if not exist "%~dp0STAGE04_R82_21_TOPICS_VALIDATE.cmd" goto blocked_package
if not exist "%~dp0stage04-r85-repeat-audit.mjs" goto blocked_package
for %%F in (
  "keyword-growth-speed-r25-readonly.mjs"
  "forecast-source-audit-r82-supplement.mjs"
  "official-publisher-ollama-adapters-r71.mjs"
  "stage04-r63-official-address-hints-r78.mjs"
  "ollama-forecast-pipeline-r70.mjs"
  "run-ollama-forecast-r71.mjs"
  "stage04-r78-criteria-regression.test.mjs"
  "ollama-forecast-pipeline-r70.test.mjs"
  "official-publisher-ollama-adapters-r71.test.mjs"
) do if not exist "%~dp0%%~F" goto blocked_package

set "ZG_TAG=%RANDOM%_%RANDOM%"
set "ZG_PREFIX=%~dp0STAGE04_R85_REPEAT_%ZG_TAG%"
set "ZG_LOG1=%ZG_PREFIX%_RUN1_CONSOLE.txt"
set "ZG_LOG2=%ZG_PREFIX%_RUN2_CONSOLE.txt"
set "ZG_LOG3=%ZG_PREFIX%_RUN3_CONSOLE.txt"
if exist "%ZG_LOG1%" goto blocked_collision
if exist "%ZG_LOG2%" goto blocked_collision
if exist "%ZG_LOG3%" goto blocked_collision

echo [R85] New full 21-topic R82/Ollama collection: 3 sequential independent runs.
echo [R85] Each run may take several minutes. Do not close this window.
echo [R85] Original R77 and previous R82 reports will be preserved.
echo [R85] Source folder: "%ZG_R77%"
set "STAGE04_R85_REPEAT_NONINTERACTIVE=1"
call :run_one 1 "%ZG_LOG1%"
call :run_one 2 "%ZG_LOG2%"
call :run_one 3 "%ZG_LOG3%"
set "STAGE04_R85_REPEAT_NONINTERACTIVE="

echo [R85] Comparing three full results independently...
"%ZG_NODE%" "%~dp0stage04-r85-repeat-audit.mjs" "%ZG_LOG1%" "%ZG_LOG2%" "%ZG_LOG3%" "%ZG_PREFIX%"
set "ZG_AUDIT_EXIT=%ERRORLEVEL%"
echo.
echo SEND_R85_RESULT_JSON=%ZG_PREFIX%_RESULT.json
echo SEND_R85_RESULT_TXT=%ZG_PREFIX%_RESULT.txt
echo SEND_RUN1_CONSOLE=%ZG_LOG1%
echo SEND_RUN2_CONSOLE=%ZG_LOG2%
echo SEND_RUN3_CONSOLE=%ZG_LOG3%
echo RESULT_EXIT_CODE=%ZG_AUDIT_EXIT%
echo Note: R85 compares repeatability; it does not invent final M4 or select themes.
pause
exit /b %ZG_AUDIT_EXIT%

:run_one
echo [R85] Starting new Ollama run %~1 of 3...
call "%~dp0STAGE04_R82_21_TOPICS_VALIDATE.cmd" "%ZG_R77%" >"%~2" 2>&1
set "ZG_ONE_EXIT=%ERRORLEVEL%"
echo [R85] Run %~1 completed, exit=%ZG_ONE_EXIT%, console log="%~2"
exit /b 0

:blocked_node
echo RESULT=BLOCKED_NODE_NOT_FOUND
goto blocked
:blocked_r77
echo RESULT=BLOCKED_ORIGINAL_R77_FOLDER_MISSING
echo Expected: "%ZG_R77%"
goto blocked
:blocked_package
echo RESULT=BLOCKED_R82_R85_PACKAGE_FILES_MISSING_NEXT_TO_CMD
goto blocked
:blocked_collision
echo RESULT=BLOCKED_LOG_FILENAME_COLLISION
:blocked
echo No Ollama run was started. Original data unchanged.
pause
exit /b 2
