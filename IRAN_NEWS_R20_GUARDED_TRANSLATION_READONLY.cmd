@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R20: source-anchored Korean translation experiment with installed TranslateGemma.
rem READ ONLY: no install, no D1, no news cache, no score or scheduler writes.
set "ZG_R20_LOG=%~dp0IRAN_NEWS_R20_GUARDED_TRANSLATION_RESULT.txt"
set "ZG_R20_STAGE=%~dp0IRAN_NEWS_R20_GUARDED_READONLY_RUNTIME"
set "ZG_R20_SHA=e0f4d3f867825a65ce8c80dd75845f79feef43fa"
set "ZG_R20_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_R20_SHA%"
set "ZG_R20_OWN=0"
> "%ZG_R20_LOG%" echo ZGMINI IRAN NEWS R20 - PROTECTED KOREAN TRANSLATION READ-ONLY
>> "%ZG_R20_LOG%" echo PINNED_SOURCE_SHA=%ZG_R20_SHA%
>> "%ZG_R20_LOG%" echo USE_EXISTING_MODEL=translategemma:4b
>> "%ZG_R20_LOG%" echo MODEL_PULL_DISABLED=YES
>> "%ZG_R20_LOG%" echo NO_PC_CACHE_WRITE_NO_D1_WRITE_NO_SCORE_CHANGE_NO_SCHEDULER_CHANGE
echo R20 Korean translation read-only evaluation is starting.
echo The result file will be:
echo "%ZG_R20_LOG%"
if exist "%ZG_R20_STAGE%" (
 >> "%ZG_R20_LOG%" echo STOP=R20_HELPER_DIRECTORY_ALREADY_EXISTS_PRESERVED
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 (
 >> "%ZG_R20_LOG%" echo STOP=NODE_NOT_AVAILABLE_ON_PATH
 goto :failed
)
where curl >nul 2>nul
if errorlevel 1 (
 >> "%ZG_R20_LOG%" echo STOP=CURL_NOT_AVAILABLE_ON_PATH
 goto :failed
)
mkdir "%ZG_R20_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R20_OWN=1"
mkdir "%ZG_R20_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-translation-guarded-r20.mjs" "scripts\iran-progress\news-display-translation-guarded-r20.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-translation-anchors-r20.mjs" "scripts\iran-progress\news-display-translation-anchors-r20.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-translategemma-review-r19.mjs" "scripts\iran-progress\news-display-translategemma-review-r19.mjs"
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
>> "%ZG_R20_LOG%" echo SOURCE_DOWNLOADS=COMPLETE_PINNED_SHA
>> "%ZG_R20_LOG%" echo R20_EVALUATION=START
echo R20 files are ready. The installed 4B model will now translate nine existing articles.
node "%ZG_R20_STAGE%\scripts\iran-progress\news-display-translation-guarded-r20.mjs" --read-only >> "%ZG_R20_LOG%" 2>&1
set "ZG_R20_RC=%ERRORLEVEL%"
if not "%ZG_R20_RC%"=="0" goto :review
goto :passed

:download
curl --fail --location --silent --show-error --max-time 45 "%ZG_R20_RAW%/%~1" --output "%ZG_R20_STAGE%\%~2" >> "%ZG_R20_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R20_LOG%" echo STOP=R20_SOURCE_DOWNLOAD_FAILED_%~1
 exit /b 1
)
exit /b 0

:cleanup
if not "%ZG_R20_OWN%"=="1" exit /b 0
if exist "%ZG_R20_STAGE%\scripts\iran-progress\news-display-translation-guarded-r20.mjs" del /q "%ZG_R20_STAGE%\scripts\iran-progress\news-display-translation-guarded-r20.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts\iran-progress\news-display-translation-anchors-r20.mjs" del /q "%ZG_R20_STAGE%\scripts\iran-progress\news-display-translation-anchors-r20.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts\iran-progress\news-display-translategemma-review-r19.mjs" del /q "%ZG_R20_STAGE%\scripts\iran-progress\news-display-translategemma-review-r19.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts\iran-progress\news-display-translation-compare-r18.mjs" del /q "%ZG_R20_STAGE%\scripts\iran-progress\news-display-translation-compare-r18.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts\iran-progress\news-display-translation-preview-r17.mjs" del /q "%ZG_R20_STAGE%\scripts\iran-progress\news-display-translation-preview-r17.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R20_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" del /q "%ZG_R20_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" del /q "%ZG_R20_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" del /q "%ZG_R20_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R20_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts\iran-progress\news-display-r1.mjs" del /q "%ZG_R20_STAGE%\scripts\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R20_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts\iran-progress" rmdir "%ZG_R20_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R20_STAGE%\scripts" rmdir "%ZG_R20_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R20_STAGE%\lib\iran-progress" rmdir "%ZG_R20_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R20_STAGE%\lib" rmdir "%ZG_R20_STAGE%\lib" >nul 2>nul
if exist "%ZG_R20_STAGE%" rmdir "%ZG_R20_STAGE%" >nul 2>nul
exit /b 0

:passed
call :cleanup
>> "%ZG_R20_LOG%" echo CMD_STATUS=R20_KOREAN_DRAFT_REVIEW_EXECUTED_NO_PUBLICATION
echo R20 completed. Upload IRAN_NEWS_R20_GUARDED_TRANSLATION_RESULT.txt for review.
exit /b 0

:review
call :cleanup
>> "%ZG_R20_LOG%" echo CMD_STATUS=R20_NEEDS_REVIEW_NO_PUBLICATION
echo R20 needs review. Upload IRAN_NEWS_R20_GUARDED_TRANSLATION_RESULT.txt.
exit /b 2

:failed
call :cleanup
:failed_no_cleanup
>> "%ZG_R20_LOG%" echo CMD_STATUS=STOP_R20_NO_PUBLICATION
echo R20 stopped safely. Upload IRAN_NEWS_R20_GUARDED_TRANSLATION_RESULT.txt.
exit /b 1
