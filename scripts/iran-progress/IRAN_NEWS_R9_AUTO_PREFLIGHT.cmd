@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R9 read-only: four GOV.UK topic feeds, official content metadata, local Ollama tags.
rem No news cache, R3/R5 score ledger, scheduler, D1 or website writes.
set "ZG_R9_LOG=%~dp0IRAN_NEWS_R9_AUTO_PREFLIGHT_RESULT.txt"
set "ZG_R9_STAGE=%~dp0IRAN_NEWS_R9_READONLY_RUNTIME"
set "ZG_R9_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/7c2ba05ca8217c0be93966553c10a30ede733af2"
set "ZG_R9_OWN_STAGE=0"
> "%ZG_R9_LOG%" echo ZGMINI IRAN NEWS R9 - AUTOMATIC PUBLICATION READINESS - READ ONLY
>> "%ZG_R9_LOG%" echo Source SHA: 7c2ba05ca8217c0be93966553c10a30ede733af2
>> "%ZG_R9_LOG%" echo Topics: Iran OR Saudi OR Yemen OR Houthi
>> "%ZG_R9_LOG%" echo Scope: 4 feeds, official first-published metadata samples, Ollama /api/tags
if exist "%ZG_R9_STAGE%" (
 >> "%ZG_R9_LOG%" echo STOP: R9 helper directory exists. Existing data preserved.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R9_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R9_OWN_STAGE=1"
mkdir "%ZG_R9_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-auto-preflight-r9.mjs" "scripts\iran-progress\news-display-auto-preflight-r9.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
>> "%ZG_R9_LOG%" echo [1] Four GOV.UK topic feed and local Ollama read-only preflight
node "%ZG_R9_STAGE%\scripts\iran-progress\news-display-auto-preflight-r9.mjs" --read-only >> "%ZG_R9_LOG%" 2>&1
if errorlevel 1 goto :failed
call :cleanup
>> "%ZG_R9_LOG%" echo FINAL_STATUS=PASS_R9_READ_ONLY_READY_FOR_REVIEW
echo R9 preflight finished. Upload IRAN_NEWS_R9_AUTO_PREFLIGHT_RESULT.txt.
exit /b 0

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R9_RAW%/%~1" --output "%ZG_R9_STAGE%\%~2" >> "%ZG_R9_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R9_LOG%" echo ERROR: helper download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R9_STAGE%\scripts\iran-progress\news-display-auto-preflight-r9.mjs" del /q "%ZG_R9_STAGE%\scripts\iran-progress\news-display-auto-preflight-r9.mjs" >nul 2>nul
if exist "%ZG_R9_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R9_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R9_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R9_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R9_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R9_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R9_STAGE%\scripts\iran-progress" rmdir "%ZG_R9_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R9_STAGE%\scripts" rmdir "%ZG_R9_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R9_STAGE%\lib\iran-progress" rmdir "%ZG_R9_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R9_STAGE%\lib" rmdir "%ZG_R9_STAGE%\lib" >nul 2>nul
if exist "%ZG_R9_STAGE%" rmdir "%ZG_R9_STAGE%" >nul 2>nul
exit /b 0

:failed
if "%ZG_R9_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R9_LOG%" echo FINAL_STATUS=STOP_R9_READ_ONLY_PRECHECK
echo R9 preflight stopped. Upload IRAN_NEWS_R9_AUTO_PREFLIGHT_RESULT.txt.
exit /b 1
