@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R45_ONCE_DIR=%~dp0"
set "R45_ONCE_RUNNER=%R45_ONCE_DIR%MARKET_CALENDAR_R45_PC_CURRENT_DETACH.cmd"
set "R45_ONCE_PREFLIGHT=%R45_ONCE_DIR%MARKET_CALENDAR_R45_PC_CURRENT_PREFLIGHT_RESULT.txt"
set "R45_ONCE_APPLY=%R45_ONCE_DIR%MARKET_CALENDAR_R45_PC_CURRENT_APPLY_RESULT.txt"
set "R45_ONCE_FAIL=%R45_ONCE_DIR%MARKET_CALENDAR_R45_PC_ONE_CLICK_RESULT.txt"
if not exist "%R45_ONCE_RUNNER%" goto R45_ONCE_MISSING
if exist "%R45_ONCE_APPLY%" goto R45_ONCE_SHOW_APPLY
if not exist "%R45_ONCE_PREFLIGHT%" call "%R45_ONCE_RUNNER%"
if not exist "%R45_ONCE_PREFLIGHT%" goto R45_ONCE_FAIL_PREFLIGHT
findstr /C:"R45_CURRENT_PREFLIGHT_READY_NO_CHANGES" "%R45_ONCE_PREFLIGHT%" >nul
if errorlevel 1 goto R45_ONCE_FAIL_PREFLIGHT
echo Preflight READY. Starting guarded local-only R45 detach.
call "%R45_ONCE_RUNNER%" --apply
if exist "%R45_ONCE_APPLY%" goto R45_ONCE_SHOW_APPLY
goto R45_ONCE_FAIL_APPLY
:R45_ONCE_MISSING
if exist "%R45_ONCE_FAIL%" goto R45_ONCE_MISSING_REPORT_PRESERVED
> "%R45_ONCE_FAIL%" echo {"decision":"R45_CURRENT_ONE_CLICK_RUNNER_MISSING_STOP","changedFiles":[]}
:R45_ONCE_MISSING_REPORT_PRESERVED
echo Could not find the original CMD. Extract the whole ZIP.
goto R45_ONCE_SHOW_FAIL
:R45_ONCE_FAIL_PREFLIGHT
echo Preflight did not approve apply. Nothing was changed by this launcher.
if exist "%R45_ONCE_PREFLIGHT%" goto R45_ONCE_SHOW_PREFLIGHT
if exist "%R45_ONCE_FAIL%" goto R45_ONCE_SHOW_FAIL
> "%R45_ONCE_FAIL%" echo {"decision":"R45_CURRENT_ONE_CLICK_PREFLIGHT_RESULT_MISSING_STOP","changedFiles":[]}
goto R45_ONCE_SHOW_FAIL
:R45_ONCE_FAIL_APPLY
if exist "%R45_ONCE_FAIL%" goto R45_ONCE_APPLY_FAIL_REPORT_PRESERVED
> "%R45_ONCE_FAIL%" echo {"decision":"R45_CURRENT_ONE_CLICK_APPLY_RESULT_MISSING_STOP","changedFiles":[]}
:R45_ONCE_APPLY_FAIL_REPORT_PRESERVED
echo Apply result not found. Do not retry before review.
goto R45_ONCE_SHOW_FAIL
:R45_ONCE_SHOW_APPLY
echo.
echo SEND THIS TXT FILE TO CHATGPT:
echo "%R45_ONCE_APPLY%"
goto R45_ONCE_END
:R45_ONCE_SHOW_PREFLIGHT
echo.
echo SEND THIS TXT FILE TO CHATGPT:
echo "%R45_ONCE_PREFLIGHT%"
goto R45_ONCE_END
:R45_ONCE_SHOW_FAIL
echo.
echo SEND THIS TXT FILE TO CHATGPT:
echo "%R45_ONCE_FAIL%"
:R45_ONCE_END
echo.
echo Never delete Core locks or force-run Core.
pause
exit /b 0
