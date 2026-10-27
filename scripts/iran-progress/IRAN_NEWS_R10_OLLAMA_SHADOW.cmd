@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R10 read-only: all four GOV.UK discovery feeds and 2x2 local Ollama trial.
rem No D1, news cache, task, VBS, R3/R5 score ledger or website writes.
set "ZG_R10_LOG=%~dp0IRAN_NEWS_R10_OLLAMA_SHADOW_RESULT.txt"
set "ZG_R10_STAGE=%~dp0IRAN_NEWS_R10_READONLY_RUNTIME"
set "ZG_R10_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/030c2fc7acdbf41858d7ef8f9e5f8c27e02c9858"
set "ZG_R10_OWN_STAGE=0"
> "%ZG_R10_LOG%" echo ZGMINI IRAN NEWS R10 - 4 TOPIC OLLAMA QUALITY AND SPEED SHADOW
>> "%ZG_R10_LOG%" echo Source SHA: 030c2fc7acdbf41858d7ef8f9e5f8c27e02c9858
>> "%ZG_R10_LOG%" echo Scope: Iran OR Saudi OR Yemen OR Houthi; no R13 or D1 changes
>> "%ZG_R10_LOG%" echo Ollama sample cap: 2 articles x 2 local models, no full text saved in log
if exist "%ZG_R10_STAGE%" (
 >> "%ZG_R10_LOG%" echo STOP: R10 runtime folder exists. Existing data preserved.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R10_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R10_OWN_STAGE=1"
mkdir "%ZG_R10_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-model-shadow-r10.mjs" "scripts\iran-progress\news-display-model-shadow-r10.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
>> "%ZG_R10_LOG%" echo [1] Official first-published metadata for all discovered feed candidates
>> "%ZG_R10_LOG%" echo [2] Comparing local gemma3:4b and qwen3:4b on up to two recent articles
node "%ZG_R10_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" --read-only >> "%ZG_R10_LOG%" 2>&1
if errorlevel 1 goto :failed
call :cleanup
>> "%ZG_R10_LOG%" echo FINAL_STATUS=PASS_R10_READ_ONLY_SHADOW
echo R10 shadow finished. Upload IRAN_NEWS_R10_OLLAMA_SHADOW_RESULT.txt.
exit /b 0

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R10_RAW%/%~1" --output "%ZG_R10_STAGE%\%~2" >> "%ZG_R10_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R10_LOG%" echo ERROR: module download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R10_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" del /q "%ZG_R10_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" >nul 2>nul
if exist "%ZG_R10_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R10_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R10_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R10_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R10_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R10_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R10_STAGE%\scripts\iran-progress" rmdir "%ZG_R10_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R10_STAGE%\scripts" rmdir "%ZG_R10_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R10_STAGE%\lib\iran-progress" rmdir "%ZG_R10_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R10_STAGE%\lib" rmdir "%ZG_R10_STAGE%\lib" >nul 2>nul
if exist "%ZG_R10_STAGE%" rmdir "%ZG_R10_STAGE%" >nul 2>nul
exit /b 0

:failed
if "%ZG_R10_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R10_LOG%" echo FINAL_STATUS=STOP_R10_READ_ONLY_SHADOW
echo R10 shadow stopped. Upload IRAN_NEWS_R10_OLLAMA_SHADOW_RESULT.txt.
exit /b 1
