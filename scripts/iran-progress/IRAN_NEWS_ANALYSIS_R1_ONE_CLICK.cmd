@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Standalone launcher: run from Downloads; no other downloaded file needed.
rem Only installs/verifies the independent R1 news analysis task.
rem Never touches existing Iran collection, R5 score, review or writer tasks.
set "ZG_LOG=%~dp0IRAN_NEWS_ANALYSIS_R1_ONE_CLICK_RESULT.txt"
set "ZG_SHA=56eec6683f957ec31b9609b22e5ba1082885909b"
set "ZG_ZIP_SHA256=9c872b4931f5ca04d42bd2f13025d0b4611456440c1390ec1986fa14557c2a3b"
set "ZG_TARGET=E:\ZGmini\projects\iran-news-analysis-r1-56eec668"
set "ZG_TASK_READY=0"
>"%ZG_LOG%" echo ZGMINI IRAN NEWS ANALYSIS R1 - STANDALONE ONE CLICK
if errorlevel 1 goto log_unavailable
>>"%ZG_LOG%" echo Source commit: %ZG_SHA%
>>"%ZG_LOG%" echo Scope: Independent R1 task only; existing tasks unchanged
>>"%ZG_LOG%" echo Source destination: %ZG_TARGET%
if not exist "E:\ZGmini\data\iran-progress-r13\" goto missing_data
if not exist "E:\ZGmini\projects\" goto missing_projects
if exist "%ZG_TARGET%\" goto source_ready

>>"%ZG_LOG%" echo [1] VERIFY REQUIRED WINDOWS UTILITIES
where curl.exe >nul 2>&1
if errorlevel 1 goto missing_utility
where tar.exe >nul 2>&1
if errorlevel 1 goto missing_utility
where certutil.exe >nul 2>&1
if errorlevel 1 goto missing_utility
where schtasks.exe >nul 2>&1
if errorlevel 1 goto missing_utility

set "ZG_STAGE=E:\ZGmini\projects\_iran_analysis_r1_stage_%RANDOM%%RANDOM%"
if exist "%ZG_STAGE%\" goto stage_collision
md "%ZG_STAGE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto stage_failed
set "ZG_ARCHIVE=%ZG_STAGE%\source.zip"

>>"%ZG_LOG%" echo [2] DOWNLOAD PINNED PUBLIC GITHUB SOURCE
curl.exe -fL --retry 2 --connect-timeout 15 --max-time 180 -o "%ZG_ARCHIVE%" "https://codeload.github.com/ansqhd5774-Choi/zgmini/zip/%ZG_SHA%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto download_failed
>>"%ZG_LOG%" echo [3] SHA256 VERIFY BEFORE EXTRACTION
certutil.exe -hashfile "%ZG_ARCHIVE%" SHA256 >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto integrity_failed
certutil.exe -hashfile "%ZG_ARCHIVE%" SHA256 | findstr /I /C:"%ZG_ZIP_SHA256%" >nul
if errorlevel 1 goto integrity_failed

>>"%ZG_LOG%" echo [4] EXTRACT TO A NEW ISOLATED SOURCE DIRECTORY
tar.exe -xf "%ZG_ARCHIVE%" -C "%ZG_STAGE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto extraction_failed
if not exist "%ZG_STAGE%\zgmini-%ZG_SHA%\scripts\iran-progress\news-analysis-schedule-r1.mjs" goto extraction_failed
if not exist "%ZG_STAGE%\zgmini-%ZG_SHA%\scripts\iran-progress\news-analysis-scheduled-r1.mjs" goto extraction_failed
if not exist "%ZG_STAGE%\zgmini-%ZG_SHA%\scripts\iran-progress\news-r41-auto-interpret-r1.mjs" goto extraction_failed
if not exist "%ZG_STAGE%\zgmini-%ZG_SHA%\scripts\iran-progress\news-analysis-publication-r1.mjs" goto extraction_failed
if exist "%ZG_TARGET%\" goto source_collision
move "%ZG_STAGE%\zgmini-%ZG_SHA%" "%ZG_TARGET%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto source_install_failed
del /q "%ZG_ARCHIVE%" >nul 2>&1
rd "%ZG_STAGE%" >nul 2>&1
>>"%ZG_LOG%" echo Pinned source installed and verified.

:source_ready
>>"%ZG_LOG%" echo [5] VERIFY EXISTING SOURCE AND NODE.JS 24+
if not exist "%ZG_TARGET%\scripts\resolve-local-node.cmd" goto source_invalid
if not exist "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" goto source_invalid
if not exist "%ZG_TARGET%\scripts\iran-progress\news-analysis-scheduled-r1.mjs" goto source_invalid
if not exist "%ZG_TARGET%\scripts\iran-progress\news-analysis-publication-r1.mjs" goto source_invalid
if not exist "%ZG_TARGET%\scripts\iran-progress\news-r41-auto-interpret-r1.mjs" goto source_invalid
call "%ZG_TARGET%\scripts\resolve-local-node.cmd" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto node_unavailable
>>"%ZG_LOG%" echo Node: %NODE%

rem The isolated source uses the PC's existing Wrangler login refresh path.
rem A junction borrows installed packages without changing approved source.
call :ensure_wrangler_runtime
if errorlevel 1 goto wrangler_unavailable

>>"%ZG_LOG%" echo [6] READ-ONLY SCHEDULE PREFLIGHT
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" --inspect >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto schedule_blocked
>>"%ZG_LOG%" echo [7] INSTALL NEW TASK OR VERIFY EXACT SAME EXISTING TASK
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" --apply >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto schedule_blocked
set "ZG_TASK_READY=1"

>>"%ZG_LOG%" echo [8] RUN ONE REAL ANALYSIS AND D1 READBACK CYCLE
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-scheduled-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto cycle_blocked
>>"%ZG_LOG%" echo FINAL_STATUS=TASK_REGISTERED_AND_CYCLE_VERIFIED
goto success

:missing_data
>>"%ZG_LOG%" echo ERROR=APPROVED_IRAN_DATA_DIRECTORY_NOT_FOUND
goto blocked
:missing_projects
>>"%ZG_LOG%" echo ERROR=APPROVED_E_PROJECTS_DIRECTORY_NOT_FOUND
goto blocked
:missing_utility
>>"%ZG_LOG%" echo ERROR=REQUIRED_WINDOWS_UTILITY_MISSING_CURL_TAR_CERTUTIL_OR_SCHTASKS
goto blocked
:stage_collision
>>"%ZG_LOG%" echo ERROR=STAGING_DIRECTORY_ALREADY_EXISTS
goto blocked
:stage_failed
>>"%ZG_LOG%" echo ERROR=CANNOT_CREATE_STAGING_DIRECTORY
goto blocked
:download_failed
>>"%ZG_LOG%" echo ERROR=PUBLIC_GITHUB_DOWNLOAD_FAILED
goto blocked
:integrity_failed
>>"%ZG_LOG%" echo ERROR=SOURCE_ARCHIVE_SHA256_MISMATCH
goto blocked
:extraction_failed
>>"%ZG_LOG%" echo ERROR=SOURCE_ARCHIVE_EXTRACTION_FAILED
goto blocked
:source_collision
>>"%ZG_LOG%" echo ERROR=TARGET_DIRECTORY_CREATED_DURING_INSTALL
goto blocked
:source_install_failed
>>"%ZG_LOG%" echo ERROR=PINNED_SOURCE_MOVE_FAILED
goto blocked
:source_invalid
>>"%ZG_LOG%" echo ERROR=EXISTING_ISOLATED_SOURCE_INCOMPLETE_NO_OVERWRITE
goto blocked
:node_unavailable
>>"%ZG_LOG%" echo ERROR=NODE24_NOT_AVAILABLE
goto blocked
:wrangler_unavailable
>>"%ZG_LOG%" echo ERROR=WRANGLER_AUTH_REFRESH_RUNTIME_MISSING
goto blocked
:schedule_blocked
>>"%ZG_LOG%" echo ERROR=TASK_PREFLIGHT_OR_INSTALL_FAILED_NO_EXISTING_TASK_CHANGED
goto blocked
:cycle_blocked
>>"%ZG_LOG%" echo ERROR=ANALYSIS_OR_D1_PUBLISH_CYCLE_FAILED
>>"%ZG_LOG%" echo FINAL_STATUS=TASK_REGISTERED_BUT_CYCLE_BLOCKED_SEE_DETAILS_ABOVE
goto failed
:blocked
>>"%ZG_LOG%" echo FINAL_STATUS=BLOCKED_CHECK_ERROR_AND_DETAILS_ABOVE
:failed
type "%ZG_LOG%"
echo.
echo Log file: "%ZG_LOG%"
echo Press any key to close.
pause >nul
exit /b 1
:success
type "%ZG_LOG%"
echo.
echo Log file: "%ZG_LOG%"
echo Press any key to close.
pause >nul
exit /b 0
:log_unavailable
echo ERROR=UNABLE_TO_WRITE_LOG_NEXT_TO_THIS_CMD
pause
exit /b 1

:ensure_wrangler_runtime
if defined CLOUDFLARE_API_TOKEN (
  >>"%ZG_LOG%" echo Cloudflare: configured environment API token; no Wrangler junction needed.
  exit /b 0
)
if exist "%ZG_TARGET%\node_modules\wrangler\bin\wrangler.js" (
  >>"%ZG_LOG%" echo Wrangler runtime already available.
  exit /b 0
)
set "ZG_MODULES="
if exist "E:\ZGmini\projects\zgmini\node_modules\wrangler\bin\wrangler.js" set "ZG_MODULES=E:\ZGmini\projects\zgmini\node_modules"
if not defined ZG_MODULES if exist "E:\ZGmini\runtime\node_modules\wrangler\bin\wrangler.js" set "ZG_MODULES=E:\ZGmini\runtime\node_modules"
if not defined ZG_MODULES if exist "E:\ZGmini\node_modules\wrangler\bin\wrangler.js" set "ZG_MODULES=E:\ZGmini\node_modules"
if not defined ZG_MODULES (
  >>"%ZG_LOG%" echo Wrangler not found in existing approved E: runtime paths.
  exit /b 1
)
if exist "%ZG_TARGET%\node_modules" (
  >>"%ZG_LOG%" echo Existing node_modules entry is not a verified Wrangler runtime; no overwrite.
  exit /b 1
)
>>"%ZG_LOG%" echo Connecting existing E: Wrangler dependencies by junction.
mklink /J "%ZG_TARGET%\node_modules" "%ZG_MODULES%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 exit /b 1
if not exist "%ZG_TARGET%\node_modules\wrangler\bin\wrangler.js" exit /b 1
exit /b 0
