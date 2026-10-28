@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Read-only diagnosis of a failed R38 preflight. NEVER installs or publishes.
set "ZG_R38_DIAG_RESULT=%~dp0IRAN_NEWS_R38_PREFLIGHT_DIAG_RESULT.txt"
set "ZG_R38_DIAG_SCRIPT=%~dp0scripts\iran-progress\news-display-upgrade-r38.mjs"
if exist "%ZG_R38_DIAG_RESULT%" goto :existing
> "%ZG_R38_DIAG_RESULT%" echo R38_READ_ONLY_PREFLIGHT_DIAGNOSTIC
>> "%ZG_R38_DIAG_RESULT%" echo NO_INSTALL_NO_D1_NO_SCHEDULER_WRITE=YES
if not exist "%ZG_R38_DIAG_SCRIPT%" goto :missing
set "ZG_R38_DIAG_NODE=node.exe"
where node.exe >nul 2>nul
if errorlevel 1 (
 if exist "E:\ZGmini\runtime\node.exe" (
  set "ZG_R38_DIAG_NODE=E:\ZGmini\runtime\node.exe"
 ) else (
  >> "%ZG_R38_DIAG_RESULT%" echo STOP_R38_NODE_MISSING
  goto :done
 )
)
"%ZG_R38_DIAG_NODE%" "%ZG_R38_DIAG_SCRIPT%" --preflight >> "%ZG_R38_DIAG_RESULT%" 2>&1
if errorlevel 1 (
 >> "%ZG_R38_DIAG_RESULT%" echo FINAL_STATUS=STOP_R38_DIAGNOSTIC_REVIEW_REQUIRED
) else (
 >> "%ZG_R38_DIAG_RESULT%" echo FINAL_STATUS=R38_PREFLIGHT_READ_ONLY_PASS
)
goto :done
:missing
>> "%ZG_R38_DIAG_RESULT%" echo STOP_R38_DIAGNOSTIC_PACKAGE_INCOMPLETE
goto :done
:existing
echo STOP_R38_DIAGNOSTIC_RESULT_ALREADY_EXISTS. Send the original result.
goto :done
:done
echo Send IRAN_NEWS_R38_PREFLIGHT_DIAG_RESULT.txt without rerunning the installer.
pause
