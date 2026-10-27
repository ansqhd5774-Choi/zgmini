@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R18: two-model Korean translation comparison, read-only report only.
rem No writes to D1, PC news cache, score ledger or Windows Task Scheduler.
set "ZG_R18_LOG=%~dp0IRAN_NEWS_R18_KOREAN_DUAL_RESULT.txt"
set "ZG_R18_STAGE=%~dp0IRAN_NEWS_R18_READONLY_RUNTIME"
set "ZG_R18_SHA=417733d3a9322babcefb02ae6535331035f3a9bd"
set "ZG_R18_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_R18_SHA%"
set "ZG_R18_REPORT=%ZG_R18_STAGE%\report.json"
set "ZG_R18_OWN=0"
> "%ZG_R18_LOG%" echo ZGMINI IRAN NEWS R18 - KOREAN DUAL MODEL READ-ONLY COMPARISON
>> "%ZG_R18_LOG%" echo Pinned source SHA: %ZG_R18_SHA%
>> "%ZG_R18_LOG%" echo R17 showed 3 structurally accepted but semantically unreliable drafts.
>> "%ZG_R18_LOG%" echo Compare the existing installed qwen3:4b and gemma3:4b without publication.
if exist "%ZG_R18_STAGE%" (
 >> "%ZG_R18_LOG%" echo STOP: R18 helper directory already exists. Preserving it.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R18_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R18_OWN=1"
mkdir "%ZG_R18_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-translation-compare-r18.mjs" "scripts\iran-progress\news-display-translation-compare-r18.mjs"
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
>> "%ZG_R18_LOG%" echo [1] Compare two local models against identical rights-gated GOV.UK source text
node "%ZG_R18_STAGE%\scripts\iran-progress\news-display-translation-compare-r18.mjs" --read-only > "%ZG_R18_REPORT%" 2>> "%ZG_R18_LOG%"
set "ZG_R18_RC=%ERRORLEVEL%"
if exist "%ZG_R18_REPORT%" type "%ZG_R18_REPORT%" >> "%ZG_R18_LOG%"
if not "%ZG_R18_RC%"=="0" goto :review
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(r.status!=='R18_DUAL_KOREAN_TRANSLATION_DIAGNOSTIC_ONLY'||r.publication!=='DISABLED'||r.pcCacheWritten!==false||r.d1Written!==false||r.schedulerModified!==false||r.scoreLedgerModified!==false||r.installedComparedModels.length<2||r.comparedArticles<1)process.exit(2)" "%ZG_R18_REPORT%" >> "%ZG_R18_LOG%" 2>&1
if errorlevel 1 goto :review
goto :passed

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R18_RAW%/%~1" --output "%ZG_R18_STAGE%\%~2" >> "%ZG_R18_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R18_LOG%" echo ERROR: R18 helper download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R18_REPORT%" del /q "%ZG_R18_REPORT%" >nul 2>nul
if exist "%ZG_R18_STAGE%\scripts\iran-progress\news-display-translation-compare-r18.mjs" del /q "%ZG_R18_STAGE%\scripts\iran-progress\news-display-translation-compare-r18.mjs" >nul 2>nul
if exist "%ZG_R18_STAGE%\scripts\iran-progress\news-display-translation-preview-r17.mjs" del /q "%ZG_R18_STAGE%\scripts\iran-progress\news-display-translation-preview-r17.mjs" >nul 2>nul
if exist "%ZG_R18_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R18_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R18_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" del /q "%ZG_R18_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" >nul 2>nul
if exist "%ZG_R18_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" del /q "%ZG_R18_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" >nul 2>nul
if exist "%ZG_R18_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" del /q "%ZG_R18_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" >nul 2>nul
if exist "%ZG_R18_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R18_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R18_STAGE%\scripts\iran-progress\news-display-r1.mjs" del /q "%ZG_R18_STAGE%\scripts\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R18_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R18_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R18_STAGE%\scripts\iran-progress" rmdir "%ZG_R18_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R18_STAGE%\scripts" rmdir "%ZG_R18_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R18_STAGE%\lib\iran-progress" rmdir "%ZG_R18_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R18_STAGE%\lib" rmdir "%ZG_R18_STAGE%\lib" >nul 2>nul
if exist "%ZG_R18_STAGE%" rmdir "%ZG_R18_STAGE%" >nul 2>nul
exit /b 0

:passed
call :cleanup
>> "%ZG_R18_LOG%" echo FINAL_STATUS=PASS_R18_DUAL_MODEL_DRAFTS_FOR_REVIEW_NO_PUBLICATION
echo R18 dual-model diagnostics saved. Upload IRAN_NEWS_R18_KOREAN_DUAL_RESULT.txt.
exit /b 0

:review
call :cleanup
>> "%ZG_R18_LOG%" echo FINAL_STATUS=NEEDS_REVIEW_R18_MODEL_OR_SOURCE_NO_PUBLICATION
echo R18 needs review. Upload IRAN_NEWS_R18_KOREAN_DUAL_RESULT.txt.
exit /b 2

:failed
if "%ZG_R18_OWN%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R18_LOG%" echo FINAL_STATUS=STOP_R18_READ_ONLY_NO_PUBLICATION
echo R18 stopped without publication. Upload IRAN_NEWS_R18_KOREAN_DUAL_RESULT.txt.
exit /b 1
