@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R33: local-only inspection of user-saved official IAEA HTML files.
rem No website access, task run, schedule change, database or publication writes.
set "ZG_R33_SCRIPT=%~dp0scripts\iran-progress\news-display-manual-iaea-r33.mjs"
set "ZG_R33_RESULT=%~dp0IRAN_NEWS_R33_MANUAL_IAEA_RESULT.txt"
set "ZG_R33_EXIT=1"
if not exist "%ZG_R33_SCRIPT%" goto :missing
if exist "%ZG_R33_RESULT%" goto :existing
if not exist "%~dp0IAEA_NEWS.html" goto :missinginput
if not exist "%~dp0IAEA_STATEMENT.html" goto :missinginput
set "ZG_R33_NODE=node.exe"
where node.exe >nul 2>nul
if errorlevel 1 (
 if exist "E:\ZGmini\runtime\node.exe" (
  set "ZG_R33_NODE=E:\ZGmini\runtime\node.exe"
 ) else (
  echo STOP_R33_NODE_NOT_FOUND
  goto :done
 )
)
echo R33 uses only IAEA_NEWS.html and IAEA_STATEMENT.html in this folder.
echo No IAEA article HTTP request will be made.
"%ZG_R33_NODE%" "%ZG_R33_SCRIPT%" --verify
set "ZG_R33_EXIT=%ERRORLEVEL%"
if "%ZG_R33_EXIT%"=="0" (
 echo R33 manual historical HTML inspection passed.
) else (
 echo R33 requires review. Do not rerun or overwrite the result log.
)
goto :done

:existing
echo STOP_R33_RESULT_ALREADY_EXISTS
echo Preserve the existing result; do not rerun or overwrite it.
goto :done

:missing
echo STOP_R33_PACKAGE_INCOMPLETE
goto :done

:missinginput
echo STOP_R33_HTML_INPUTS_MISSING
echo Save both required HTML files beside this CMD before the first run.

:done
echo Share IRAN_NEWS_R33_MANUAL_IAEA_RESULT.txt only; not the HTML files.
pause
exit /b %ZG_R33_EXIT%
