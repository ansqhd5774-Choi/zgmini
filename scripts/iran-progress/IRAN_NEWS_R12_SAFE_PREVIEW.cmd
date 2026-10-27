@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R12: read-only article-by-article official rights and safe display preview.
rem Only title, source link and neutral source-grounded one-line summary output.
rem R13 scheduler, VBS, R3/R5 score ledger, PC cache, D1 and website unchanged.
set "ZG_R12_LOG=%~dp0IRAN_NEWS_R12_SAFE_PREVIEW_RESULT.txt"
set "ZG_R12_STAGE=%~dp0IRAN_NEWS_R12_READONLY_RUNTIME"
set "ZG_R12_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/fc367e6939ebb0578519de66b10f20a49b3af077"
set "ZG_R12_OWN_STAGE=0"
> "%ZG_R12_LOG%" echo ZGMINI IRAN NEWS R12 - OFFICIAL RIGHTS AND SAFE DISPLAY READ-ONLY PREVIEW
>> "%ZG_R12_LOG%" echo Source SHA: fc367e6939ebb0578519de66b10f20a49b3af077
>> "%ZG_R12_LOG%" echo Topics: Iran OR Saudi OR Yemen OR Houthi
>> "%ZG_R12_LOG%" echo No Ollama free-form summaries are published; no score, cache, D1 or scheduler writes.
if exist "%ZG_R12_STAGE%" (
 >> "%ZG_R12_LOG%" echo STOP: R12 helper folder already exists. Existing files preserved.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R12_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R12_OWN_STAGE=1"
mkdir "%ZG_R12_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-safe-preview-r12.mjs" "scripts\iran-progress\news-display-safe-preview-r12.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-model-shadow-r10.mjs" "scripts\iran-progress\news-display-model-shadow-r10.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-r1.mjs" "scripts\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
>> "%ZG_R12_LOG%" echo [1] Official first published timestamps and 14-day candidate URLs
>> "%ZG_R12_LOG%" echo [2] Publisher, OGL footer and body third-party rights text checks
>> "%ZG_R12_LOG%" echo [3] Safe neutral preview: exact source title and four topic names only
node "%ZG_R12_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" --read-only >> "%ZG_R12_LOG%" 2>&1
if errorlevel 1 goto :failed
call :cleanup
>> "%ZG_R12_LOG%" echo FINAL_STATUS=PASS_R12_SAFE_PREVIEW_READ_ONLY
echo R12 safe preview finished. Upload IRAN_NEWS_R12_SAFE_PREVIEW_RESULT.txt.
exit /b 0

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R12_RAW%/%~1" --output "%ZG_R12_STAGE%\%~2" >> "%ZG_R12_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R12_LOG%" echo ERROR: module download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R12_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" del /q "%ZG_R12_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" >nul 2>nul
if exist "%ZG_R12_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" del /q "%ZG_R12_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" >nul 2>nul
if exist "%ZG_R12_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R12_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R12_STAGE%\scripts\iran-progress\news-display-r1.mjs" del /q "%ZG_R12_STAGE%\scripts\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R12_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R12_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R12_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R12_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R12_STAGE%\scripts\iran-progress" rmdir "%ZG_R12_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R12_STAGE%\scripts" rmdir "%ZG_R12_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R12_STAGE%\lib\iran-progress" rmdir "%ZG_R12_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R12_STAGE%\lib" rmdir "%ZG_R12_STAGE%\lib" >nul 2>nul
if exist "%ZG_R12_STAGE%" rmdir "%ZG_R12_STAGE%" >nul 2>nul
exit /b 0

:failed
if "%ZG_R12_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R12_LOG%" echo FINAL_STATUS=STOP_R12_SAFE_PREVIEW_READ_ONLY
echo R12 safe preview stopped. Upload IRAN_NEWS_R12_SAFE_PREVIEW_RESULT.txt.
exit /b 1
