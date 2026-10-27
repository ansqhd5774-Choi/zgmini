@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R21: direct Korean translation plus source-bound guards; zero publication.
rem Does not install a model, change the news cache, D1, score or scheduler.
set "ZG_R21_LOG=%~dp0IRAN_NEWS_R21_DIRECT_TRANSLATION_RESULT.txt"
set "ZG_R21_STAGE=%~dp0IRAN_NEWS_R21_DIRECT_READONLY_RUNTIME"
set "ZG_R21_SHA=358dd7f2eb514fbc1cc94c7cff313911d56fe867"
set "ZG_R21_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_R21_SHA%"
set "ZG_R21_OWN=0"
> "%ZG_R21_LOG%" echo ZGMINI IRAN NEWS R21 - DIRECT TRANSLATION READ-ONLY
>> "%ZG_R21_LOG%" echo PINNED_SOURCE_SHA=%ZG_R21_SHA%
>> "%ZG_R21_LOG%" echo MODEL=translategemma:4b
>> "%ZG_R21_LOG%" echo MODEL_DOWNLOAD=DISABLED
>> "%ZG_R21_LOG%" echo NO_PC_CACHE_D1_SCORE_SCHEDULER_WRITES
echo R21 direct translation review is starting. No public data will be modified.
echo Result: "%ZG_R21_LOG%"
if exist "%ZG_R21_STAGE%" (
 >> "%ZG_R21_LOG%" echo STOP=R21_HELPER_DIRECTORY_EXISTS_PRESERVED
 goto :stop_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 (
 >> "%ZG_R21_LOG%" echo STOP=NODE_NOT_FOUND
 goto :stop
)
where curl >nul 2>nul
if errorlevel 1 (
 >> "%ZG_R21_LOG%" echo STOP=CURL_NOT_FOUND
 goto :stop
)
mkdir "%ZG_R21_STAGE%\scripts\iran-progress" >nul 2>nul
if errorlevel 1 goto :stop
set "ZG_R21_OWN=1"
mkdir "%ZG_R21_STAGE%\lib\iran-progress" >nul 2>nul
if errorlevel 1 goto :stop
call :download "scripts/iran-progress/news-display-translation-direct-r21.mjs" "scripts\iran-progress\news-display-translation-direct-r21.mjs"
if errorlevel 1 goto :stop
call :download "scripts/iran-progress/news-display-translation-anchors-r20.mjs" "scripts\iran-progress\news-display-translation-anchors-r20.mjs"
if errorlevel 1 goto :stop
call :download "scripts/iran-progress/news-display-translategemma-review-r19.mjs" "scripts\iran-progress\news-display-translategemma-review-r19.mjs"
if errorlevel 1 goto :stop
call :download "scripts/iran-progress/news-display-translation-compare-r18.mjs" "scripts\iran-progress\news-display-translation-compare-r18.mjs"
if errorlevel 1 goto :stop
call :download "scripts/iran-progress/news-display-translation-preview-r17.mjs" "scripts\iran-progress\news-display-translation-preview-r17.mjs"
if errorlevel 1 goto :stop
call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
if errorlevel 1 goto :stop
call :download "scripts/iran-progress/news-display-io-r1.mjs" "scripts\iran-progress\news-display-io-r1.mjs"
if errorlevel 1 goto :stop
call :download "scripts/iran-progress/news-display-safe-preview-r12.mjs" "scripts\iran-progress\news-display-safe-preview-r12.mjs"
if errorlevel 1 goto :stop
call :download "scripts/iran-progress/news-display-model-shadow-r10.mjs" "scripts\iran-progress\news-display-model-shadow-r10.mjs"
if errorlevel 1 goto :stop
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :stop
call :download "scripts/iran-progress/news-display-r1.mjs" "scripts\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :stop
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :stop
>> "%ZG_R21_LOG%" echo SOURCE_DOWNLOADS=COMPLETE
>> "%ZG_R21_LOG%" echo TRANSLATION=START
node "%ZG_R21_STAGE%\scripts\iran-progress\news-display-translation-direct-r21.mjs" --read-only >> "%ZG_R21_LOG%" 2>&1
set "ZG_R21_RC=%ERRORLEVEL%"
if not "%ZG_R21_RC%"=="0" goto :review
goto :finished

:download
curl --fail --location --silent --show-error --max-time 45 "%ZG_R21_RAW%/%~1" --output "%ZG_R21_STAGE%\%~2" >> "%ZG_R21_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R21_LOG%" echo STOP=R21_SOURCE_DOWNLOAD_FAILED_%~1
 exit /b 1
)
exit /b 0

:cleanup
if not "%ZG_R21_OWN%"=="1" exit /b 0
if exist "%ZG_R21_STAGE%\scripts\iran-progress\news-display-translation-direct-r21.mjs" del /q "%ZG_R21_STAGE%\scripts\iran-progress\news-display-translation-direct-r21.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts\iran-progress\news-display-translation-anchors-r20.mjs" del /q "%ZG_R21_STAGE%\scripts\iran-progress\news-display-translation-anchors-r20.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts\iran-progress\news-display-translategemma-review-r19.mjs" del /q "%ZG_R21_STAGE%\scripts\iran-progress\news-display-translategemma-review-r19.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts\iran-progress\news-display-translation-compare-r18.mjs" del /q "%ZG_R21_STAGE%\scripts\iran-progress\news-display-translation-compare-r18.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts\iran-progress\news-display-translation-preview-r17.mjs" del /q "%ZG_R21_STAGE%\scripts\iran-progress\news-display-translation-preview-r17.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R21_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" del /q "%ZG_R21_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" del /q "%ZG_R21_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" del /q "%ZG_R21_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R21_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts\iran-progress\news-display-r1.mjs" del /q "%ZG_R21_STAGE%\scripts\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R21_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts\iran-progress" rmdir "%ZG_R21_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R21_STAGE%\scripts" rmdir "%ZG_R21_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R21_STAGE%\lib\iran-progress" rmdir "%ZG_R21_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R21_STAGE%\lib" rmdir "%ZG_R21_STAGE%\lib" >nul 2>nul
if exist "%ZG_R21_STAGE%" rmdir "%ZG_R21_STAGE%" >nul 2>nul
exit /b 0

:finished
call :cleanup
>> "%ZG_R21_LOG%" echo CMD_STATUS=R21_READONLY_REVIEW_COMPLETED_NO_PUBLICATION
echo R21 completed. Upload IRAN_NEWS_R21_DIRECT_TRANSLATION_RESULT.txt.
exit /b 0

:review
call :cleanup
>> "%ZG_R21_LOG%" echo CMD_STATUS=R21_REVIEW_NEEDED_NO_PUBLICATION
echo R21 needs review. Upload IRAN_NEWS_R21_DIRECT_TRANSLATION_RESULT.txt.
exit /b 2

:stop
call :cleanup
:stop_no_cleanup
>> "%ZG_R21_LOG%" echo CMD_STATUS=STOP_R21_NO_PUBLICATION
echo R21 stopped safely. Upload IRAN_NEWS_R21_DIRECT_TRANSLATION_RESULT.txt.
exit /b 1
