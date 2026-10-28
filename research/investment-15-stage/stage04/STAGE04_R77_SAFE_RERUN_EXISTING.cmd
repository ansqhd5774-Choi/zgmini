@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Re-run the existing R77 five-topic Stage04 Ollama bundle on this Windows PC.
rem Copy first so the last verified R77 JSON/TXT/diagnostic remain unchanged.
rem No score formula, publisher list, scheduled task, or installation changes.

set "ZG_R77_SOURCE=%USERPROFILE%\Desktop\ZGMINI_R77_OLLAMA_OFFICIAL_SITEMAP_WINDOWS_20261028"
if not "%~1"=="" set "ZG_R77_SOURCE=%~1"
if exist "%~dp0run-ollama-forecast-r72-safe.mjs" set "ZG_R77_SOURCE=%~dp0."
set "ZG_R77_RUN=%USERPROFILE%\Desktop\ZGMINI_R77_RERUN_%RANDOM%_%RANDOM%"

if not exist "%ZG_R77_SOURCE%\STAGE04_OLLAMA_R72_RUN_AND_DIAGNOSE.cmd" goto missing_bundle
if not exist "%ZG_R77_SOURCE%\run-ollama-forecast-r72-safe.mjs" goto missing_bundle
if exist "%ZG_R77_RUN%" goto collision

echo SOURCE=%ZG_R77_SOURCE%
echo NEW_RUN_FOLDER=%ZG_R77_RUN%
echo Copying original R77 bundle; old results will not be overwritten.
robocopy "%ZG_R77_SOURCE%" "%ZG_R77_RUN%" /E /XJ /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto copy_failed
if not exist "%ZG_R77_RUN%\STAGE04_OLLAMA_R72_RUN_AND_DIAGNOSE.cmd" goto copy_failed
if not exist "%ZG_R77_RUN%\run-ollama-forecast-r72-safe.mjs" goto copy_failed

echo.
echo Running the original Stage04 R77 Ollama program (5 existing topics).
echo The existing Stage04 CMD will pause after execution; press a key to return.
call "%ZG_R77_RUN%\STAGE04_OLLAMA_R72_RUN_AND_DIAGNOSE.cmd"
set "ZG_R77_EXIT=%ERRORLEVEL%"
echo.
echo REEXECUTION_FOLDER=%ZG_R77_RUN%
echo REEXECUTION_EXIT_CODE=%ZG_R77_EXIT%
echo SEND_1=%ZG_R77_RUN%\R72_EXECUTION_DIAGNOSTIC.txt
echo SEND_2=%ZG_R77_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.json
echo SEND_3=%ZG_R77_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt
echo Original R77 results are unchanged.
pause
exit /b %ZG_R77_EXIT%

:missing_bundle
echo R77_SAFE_RERUN_BLOCKED=SOURCE_BUNDLE_MISSING
echo EXPECTED_FOLDER=%ZG_R77_SOURCE%
echo This CMD requires the original R77 full ZIP extraction folder.
pause
exit /b 2

:collision
echo R77_SAFE_RERUN_BLOCKED=DESTINATION_ALREADY_EXISTS
echo DESTINATION=%ZG_R77_RUN%
pause
exit /b 2

:copy_failed
echo R77_SAFE_RERUN_FAILED=COPY_FAILED
echo DESTINATION=%ZG_R77_RUN%
pause
exit /b 1
