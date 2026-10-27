@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R17: local Ollama title and exact excerpt translation review only.
rem No D1 writes, no PC cache writes, no R13/R15 task modifications.
set "ZG_R17_LOG=%~dp0IRAN_NEWS_R17_KOREAN_TRANSLATION_RESULT.txt"
set "ZG_R17_STAGE=%~dp0IRAN_NEWS_R17_READONLY_RUNTIME"
set "ZG_R17_SHA=4f5eb3aeb4a759b461fed4986c05738d31bbc5f6"
set "ZG_R17_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_R17_SHA%"
set "ZG_R17_REPORT=%ZG_R17_STAGE%\report.json"
set "ZG_R17_OWN_STAGE=0"
> "%ZG_R17_LOG%" echo ZGMINI IRAN NEWS R17 - KOREAN TRANSLATION PREVIEW ONLY
>> "%ZG_R17_LOG%" echo Pinned source SHA: %ZG_R17_SHA%
>> "%ZG_R17_LOG%" echo Existing published English news stays unchanged. Nothing is deployed or published.
if exist "%ZG_R17_STAGE%" (
 >> "%ZG_R17_LOG%" echo STOP: R17 stage already exists. Existing files preserved.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R17_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R17_OWN_STAGE=1"
mkdir "%ZG_R17_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-translation-preview-r17.mjs" "scripts\iran-progress\news-display-translation-preview-r17.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-io-r1.mjs" "scripts\iran-progress\news-display-io-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-safe-preview-r12.mjs" "scripts\iran-progress\news-display-safe-preview-r12.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-model-shadow-r10.mjs" "scripts\iran-progress\news-display-model-shadow-r10.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-r1.mjs" "scripts\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
>> "%ZG_R17_LOG%" echo [1] Read existing PC display news, GOV.UK official content and local Ollama only
node "%ZG_R17_STAGE%\scripts\iran-progress\news-display-translation-preview-r17.mjs" --read-only > "%ZG_R17_REPORT%" 2>> "%ZG_R17_LOG%"
set "ZG_R17_RC=%ERRORLEVEL%"
if exist "%ZG_R17_REPORT%" type "%ZG_R17_REPORT%" >> "%ZG_R17_LOG%"
if not "%ZG_R17_RC%"=="0" goto :review
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(r.status!=='R17_KOREAN_TRANSLATION_REVIEW_ONLY'||r.publication!=='DISABLED'||r.pcCacheWritten!==false||r.d1Written!==false||r.schedulerModified!==false||r.scoreLedgerModified!==false||r.translatedDrafts<1)process.exit(2)" "%ZG_R17_REPORT%" >> "%ZG_R17_LOG%" 2>&1
if errorlevel 1 goto :review
goto :passed

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R17_RAW%/%~1" --output "%ZG_R17_STAGE%\%~2" >> "%ZG_R17_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R17_LOG%" echo ERROR: R17 helper download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R17_REPORT%" del /q "%ZG_R17_REPORT%" >nul 2>nul
if exist "%ZG_R17_STAGE%\scripts\iran-progress\news-display-translation-preview-r17.mjs" del /q "%ZG_R17_STAGE%\scripts\iran-progress\news-display-translation-preview-r17.mjs" >nul 2>nul
if exist "%ZG_R17_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R17_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R17_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" del /q "%ZG_R17_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" >nul 2>nul
if exist "%ZG_R17_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" del /q "%ZG_R17_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" >nul 2>nul
if exist "%ZG_R17_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" del /q "%ZG_R17_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" >nul 2>nul
if exist "%ZG_R17_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R17_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R17_STAGE%\scripts\iran-progress\news-display-r1.mjs" del /q "%ZG_R17_STAGE%\scripts\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R17_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R17_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R17_STAGE%\scripts\iran-progress" rmdir "%ZG_R17_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R17_STAGE%\scripts" rmdir "%ZG_R17_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R17_STAGE%\lib\iran-progress" rmdir "%ZG_R17_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R17_STAGE%\lib" rmdir "%ZG_R17_STAGE%\lib" >nul 2>nul
if exist "%ZG_R17_STAGE%" rmdir "%ZG_R17_STAGE%" >nul 2>nul
exit /b 0

:passed
call :cleanup
>> "%ZG_R17_LOG%" echo FINAL_STATUS=PASS_R17_KOREAN_DRAFTS_REQUIRE_REVIEW_NO_PUBLICATION
echo Korean draft preview saved. Upload IRAN_NEWS_R17_KOREAN_TRANSLATION_RESULT.txt for review.
exit /b 0

:review
call :cleanup
>> "%ZG_R17_LOG%" echo FINAL_STATUS=NEEDS_REVIEW_R17_TRANSLATION_NO_PUBLICATION
echo R17 Korean translation needs review. Upload IRAN_NEWS_R17_KOREAN_TRANSLATION_RESULT.txt.
exit /b 2

:failed
if "%ZG_R17_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R17_LOG%" echo FINAL_STATUS=STOP_R17_TRANSLATION_PREVIEW_NO_PUBLICATION
echo R17 translation preview stopped. Upload IRAN_NEWS_R17_KOREAN_TRANSLATION_RESULT.txt.
exit /b 1
