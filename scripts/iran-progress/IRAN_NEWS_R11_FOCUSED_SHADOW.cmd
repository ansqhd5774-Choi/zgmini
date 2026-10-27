@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R11: read-only targeted-paragraph comparison for 2 local Ollama models.
rem No PC cache, D1, R3/R5 ledger, scheduler, VBS or website changes.
set "ZG_R11_LOG=%~dp0IRAN_NEWS_R11_FOCUSED_SHADOW_RESULT.txt"
set "ZG_R11_STAGE=%~dp0IRAN_NEWS_R11_READONLY_RUNTIME"
set "ZG_R11_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/6e3bd1b24737c969f033d44c2c7cd005e3677d08"
set "ZG_R11_OWN_STAGE=0"
> "%ZG_R11_LOG%" echo ZGMINI IRAN NEWS R11 - TOPIC-FOCUSED OLLAMA SHADOW - READ ONLY
>> "%ZG_R11_LOG%" echo Source SHA: 6e3bd1b24737c969f033d44c2c7cd005e3677d08
>> "%ZG_R11_LOG%" echo Keywords: Iran OR Saudi OR Yemen OR Houthi; targeted source paragraphs only
>> "%ZG_R11_LOG%" echo Models: gemma3:4b, qwen3:4b; sample limit 2 articles x 2 models
if exist "%ZG_R11_STAGE%" (
 >> "%ZG_R11_LOG%" echo STOP: R11 helper folder exists. Existing data preserved.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R11_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R11_OWN_STAGE=1"
mkdir "%ZG_R11_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-focused-shadow-r11.mjs" "scripts\iran-progress\news-display-focused-shadow-r11.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-model-shadow-r10.mjs" "scripts\iran-progress\news-display-model-shadow-r10.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
>> "%ZG_R11_LOG%" echo [1] Latest official first-publication date and topic candidate discovery
>> "%ZG_R11_LOG%" echo [2] Targeted passage summary, impact and Korean language checks
node "%ZG_R11_STAGE%\scripts\iran-progress\news-display-focused-shadow-r11.mjs" --read-only >> "%ZG_R11_LOG%" 2>&1
if errorlevel 1 goto :failed
call :cleanup
>> "%ZG_R11_LOG%" echo FINAL_STATUS=PASS_R11_READ_ONLY_FOCUSED_SHADOW
echo R11 topic shadow finished. Upload IRAN_NEWS_R11_FOCUSED_SHADOW_RESULT.txt.
exit /b 0

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R11_RAW%/%~1" --output "%ZG_R11_STAGE%\%~2" >> "%ZG_R11_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R11_LOG%" echo ERROR: module download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R11_STAGE%\scripts\iran-progress\news-display-focused-shadow-r11.mjs" del /q "%ZG_R11_STAGE%\scripts\iran-progress\news-display-focused-shadow-r11.mjs" >nul 2>nul
if exist "%ZG_R11_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" del /q "%ZG_R11_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" >nul 2>nul
if exist "%ZG_R11_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R11_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R11_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R11_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R11_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R11_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R11_STAGE%\scripts\iran-progress" rmdir "%ZG_R11_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R11_STAGE%\scripts" rmdir "%ZG_R11_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R11_STAGE%\lib\iran-progress" rmdir "%ZG_R11_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R11_STAGE%\lib" rmdir "%ZG_R11_STAGE%\lib" >nul 2>nul
if exist "%ZG_R11_STAGE%" rmdir "%ZG_R11_STAGE%" >nul 2>nul
exit /b 0

:failed
if "%ZG_R11_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R11_LOG%" echo FINAL_STATUS=STOP_R11_READ_ONLY_FOCUSED_SHADOW
echo R11 topic shadow stopped. Upload IRAN_NEWS_R11_FOCUSED_SHADOW_RESULT.txt.
exit /b 1
