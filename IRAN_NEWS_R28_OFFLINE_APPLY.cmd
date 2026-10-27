@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Portable R28 bundle. Extract the entire ZIP first. No runtime code downloads.
rem Only the separate PC private metadata candidate file may be updated.
set "ZG_R28_LOG=%~dp0IRAN_NEWS_R28_OFFLINE_APPLY_RESULT.txt"
set "ZG_R28_RUNNER=%~dp0scripts\iran-progress\news-display-offline-bundle-r28.mjs"
> "%ZG_R28_LOG%" echo ZGMINI IRAN NEWS R28 - PORTABLE OFFLINE-CODE CANDIDATE COLLECTION
>> "%ZG_R28_LOG%" echo Source code snapshot: 39b0642d35a255561722dac6bcd3126f6d177749
>> "%ZG_R28_LOG%" echo Network is used only to request public news feeds and articles.
>> "%ZG_R28_LOG%" echo No GitHub or raw.githubusercontent.com downloads are performed.
if not exist "%ZG_R28_RUNNER%" (
 >> "%ZG_R28_LOG%" echo STOP: Extract the whole ZIP. The local runner is missing.
 goto :failed_before_write
)
where node >nul 2>nul
if errorlevel 1 (
 >> "%ZG_R28_LOG%" echo STOP: Node executable not found on PATH.
 goto :failed_before_write
)
>> "%ZG_R28_LOG%" echo [1] Check hashes of the seven bundled collector modules - READ ONLY
node "%ZG_R28_RUNNER%" --check >> "%ZG_R28_LOG%" 2>&1
if errorlevel 1 goto :failed_before_write
>> "%ZG_R28_LOG%" echo [2] Save only validated, rights-unapproved news metadata to the existing PC data home
set "ZGMINI_IRAN_NEWS_R28_APPROVED=YES"
node "%ZG_R28_RUNNER%" --collect >> "%ZG_R28_LOG%" 2>&1
set "ZG_R28_RESULT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R28_APPROVED="
if not "%ZG_R28_RESULT%"=="0" goto :uncertain
>> "%ZG_R28_LOG%" echo FINAL_STATUS=PASS_R28_PRIVATE_NEWS_CANDIDATES_SAVED
>> "%ZG_R28_LOG%" echo NEXT_GATE=REVIEW_ARTICLE_FAILURES_AND_EXISTING_R15_HOOK
echo R28 local bundle collection completed. Upload IRAN_NEWS_R28_OFFLINE_APPLY_RESULT.txt.
exit /b 0

:uncertain
>> "%ZG_R28_LOG%" echo FINAL_STATUS=STOP_R28_CANDIDATE_RESULT_REQUIRES_REVIEW
>> "%ZG_R28_LOG%" echo Do not rerun blindly. Existing public cache, SQLite score ledger and D1 are not targeted.
echo R28 stopped. Upload IRAN_NEWS_R28_OFFLINE_APPLY_RESULT.txt before retrying.
exit /b 2

:failed_before_write
>> "%ZG_R28_LOG%" echo FINAL_STATUS=STOP_R28_BEFORE_PRIVATE_CANDIDATE_WRITE
echo R28 offline check stopped. Upload IRAN_NEWS_R28_OFFLINE_APPLY_RESULT.txt.
exit /b 1
