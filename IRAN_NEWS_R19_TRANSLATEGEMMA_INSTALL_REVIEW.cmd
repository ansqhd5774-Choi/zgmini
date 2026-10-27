@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R19: install the approved free TranslateGemma 4B model via local Ollama.
rem Review Korean translations of existing rights-checked news. NO PUBLICATION.
rem PC news cache, D1, score ledger, scheduler and GitHub main are unchanged.
set "ZG_R19_LOG=%~dp0IRAN_NEWS_R19_TRANSLATEGEMMA_RESULT.txt"
set "ZG_R19_STAGE=%~dp0IRAN_NEWS_R19_INSTALL_REVIEW_RUNTIME"
set "ZG_R19_SHA=e142829f5639d8ad318fe9533db77faf123eb1b0"
set "ZG_R19_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_R19_SHA%"
set "ZG_R19_OWN=0"
> "%ZG_R19_LOG%" echo ZGMINI IRAN NEWS R19 - TRANSLATEGEMMA INSTALL AND READ-ONLY REVIEW
>> "%ZG_R19_LOG%" echo PINNED_SOURCE_SHA=%ZG_R19_SHA%
>> "%ZG_R19_LOG%" echo MODEL=translategemma:4b
>> "%ZG_R19_LOG%" echo MODEL_DOWNLOAD_IF_ABSENT=ABOUT_3.3GB
>> "%ZG_R19_LOG%" echo TRANSLATION_API_COST=NONE_LOCAL_ONLY
>> "%ZG_R19_LOG%" echo NO_PUBLICATION_NO_PC_CACHE_CHANGE_NO_D1_NO_SCORE_NO_SCHEDULER_CHANGE
echo R19 is preparing an offline translation quality check.
echo The free local model download can take several minutes if not installed.
echo Progress and the final Korean drafts are saved to:
echo %ZG_R19_LOG%
if exist "%ZG_R19_STAGE%" (
 >> "%ZG_R19_LOG%" echo STOP=R19_TEMP_DIRECTORY_ALREADY_EXISTS_AND_WAS_PRESERVED
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 (
 >> "%ZG_R19_LOG%" echo STOP=NODE_NOT_AVAILABLE_ON_PATH
 goto :failed
)
where curl >nul 2>nul
if errorlevel 1 (
 >> "%ZG_R19_LOG%" echo STOP=CURL_NOT_AVAILABLE_ON_PATH
 goto :failed
)
mkdir "%ZG_R19_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R19_OWN=1"
mkdir "%ZG_R19_STAGE%\lib\iran-progress" >nul 2>&1
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
>> "%ZG_R19_LOG%" echo SOURCE_DOWNLOADS=COMPLETE_PINNED_SHA
>> "%ZG_R19_LOG%" echo MODEL_PREFLIGHT=CHECK_PC_EXISTING_DATA_BEFORE_ANY_DOWNLOAD
>> "%ZG_R19_LOG%" echo MODEL_TRANSLATION=START_AFTER_LOCAL_PULL_IF_NEEDED
echo Source files are ready. Checking the PC data and local Ollama model...
node "%ZG_R19_STAGE%\scripts\iran-progress\news-display-translategemma-review-r19.mjs" --install-and-read-only >> "%ZG_R19_LOG%" 2>&1
set "ZG_R19_RC=%ERRORLEVEL%"
if not "%ZG_R19_RC%"=="0" goto :review
goto :passed

:download
curl --fail --location --silent --show-error --max-time 45 "%ZG_R19_RAW%/%~1" --output "%ZG_R19_STAGE%\%~2" >> "%ZG_R19_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R19_LOG%" echo STOP=R19_SOURCE_DOWNLOAD_FAILED_%~1
 exit /b 1
)
exit /b 0

:cleanup
if not "%ZG_R19_OWN%"=="1" exit /b 0
if exist "%ZG_R19_STAGE%\scripts\iran-progress\news-display-translategemma-review-r19.mjs" del /q "%ZG_R19_STAGE%\scripts\iran-progress\news-display-translategemma-review-r19.mjs" >nul 2>nul
if exist "%ZG_R19_STAGE%\scripts\iran-progress\news-display-translation-compare-r18.mjs" del /q "%ZG_R19_STAGE%\scripts\iran-progress\news-display-translation-compare-r18.mjs" >nul 2>nul
if exist "%ZG_R19_STAGE%\scripts\iran-progress\news-display-translation-preview-r17.mjs" del /q "%ZG_R19_STAGE%\scripts\iran-progress\news-display-translation-preview-r17.mjs" >nul 2>nul
if exist "%ZG_R19_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R19_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R19_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" del /q "%ZG_R19_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" >nul 2>nul
if exist "%ZG_R19_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" del /q "%ZG_R19_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" >nul 2>nul
if exist "%ZG_R19_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" del /q "%ZG_R19_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" >nul 2>nul
if exist "%ZG_R19_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R19_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R19_STAGE%\scripts\iran-progress\news-display-r1.mjs" del /q "%ZG_R19_STAGE%\scripts\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R19_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R19_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R19_STAGE%\scripts\iran-progress" rmdir "%ZG_R19_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R19_STAGE%\scripts" rmdir "%ZG_R19_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R19_STAGE%\lib\iran-progress" rmdir "%ZG_R19_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R19_STAGE%\lib" rmdir "%ZG_R19_STAGE%\lib" >nul 2>nul
if exist "%ZG_R19_STAGE%" rmdir "%ZG_R19_STAGE%" >nul 2>nul
exit /b 0

:passed
call :cleanup
>> "%ZG_R19_LOG%" echo CMD_STATUS=R19_MODEL_INSTALL_AND_DRAFT_REVIEW_EXECUTED_NOT_PUBLICATION
echo R19 completed. Upload IRAN_NEWS_R19_TRANSLATEGEMMA_RESULT.txt for Korean quality review.
exit /b 0

:review
call :cleanup
>> "%ZG_R19_LOG%" echo CMD_STATUS=R19_NEEDS_REVIEW_NO_PUBLICATION
echo R19 needs review. Upload IRAN_NEWS_R19_TRANSLATEGEMMA_RESULT.txt.
exit /b 2

:failed
call :cleanup
:failed_no_cleanup
>> "%ZG_R19_LOG%" echo CMD_STATUS=STOP_R19_NO_PUBLICATION
echo R19 stopped safely. Upload IRAN_NEWS_R19_TRANSLATEGEMMA_RESULT.txt.
exit /b 1
