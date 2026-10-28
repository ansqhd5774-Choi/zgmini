@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R54 approved existing-nine publisher. Never collects raw bars or mutates tasks.
set "R54_HOME=E:\ZGmini\data\pc-writer\theme-nine-r54"
set "R54_NODE=E:\ZGmini\runtime\node.exe"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "R54_CONSENT=%R54_HOME%\PUBLISHER_CONSENT_R54.txt"
set "R54_LOG_DIR=%R54_HOME%\logs"
if not exist "%R54_LOG_DIR%\" mkdir "%R54_LOG_DIR%" 2>nul
set "R54_LOG=%R54_LOG_DIR%\THEME_NINE_R54_CYCLE_%RANDOM%_%RANDOM%.txt"
if exist "%R54_LOG%" exit /b 3
>"%R54_LOG%" echo REPORT=THEME_NINE_R54_DAILY_PUBLIC_SCORE_CONNECTION
>>"%R54_LOG%" echo STARTED=%DATE% %TIME%
if not exist "%R54_NODE%" goto :stop
if not exist "%R54_CONSENT%" goto :stop
findstr /X /C:"ACCEPT_R54_ANONYMOUS_DERIVED_RISK_20261028" "%R54_CONSENT%" >nul 2>&1
if errorlevel 1 goto :stop
"%R54_NODE%" "%R54_HOME%\scripts\pc-writer\theme-nine-r54-public-connect.mjs" --once --publish --accept-anonymous-license-risk >>"%R54_LOG%" 2>&1
if errorlevel 1 goto :stop
>>"%R54_LOG%" echo RESULT=EXECUTED_CHECK_JSON_STATUS
exit /b 0
:stop
>>"%R54_LOG%" echo RESULT=STOP_OR_PENDING_REVIEW_TXT
exit /b 1
