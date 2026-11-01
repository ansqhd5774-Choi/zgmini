@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ZG_NODE=E:\ZGmini\runtime\node.exe"
set "ZG_PROJECTS=E:\ZGmini\projects"
set "ZG_BOOTSTRAP=E:\ZGmini\projects\zgmini-theme-optional\theme-optional-stage.mjs"
set "ZG_RESULT=%~dp0THEME_OPTIONAL_STAGE_RESULT.txt"
if not exist "%ZG_NODE%" goto MissingNode
if not exist "%ZG_PROJECTS%" goto MissingProjects
if not exist "E:\ZGmini\projects\zgmini-theme-optional" mkdir "E:\ZGmini\projects\zgmini-theme-optional"
if errorlevel 1 goto MkdirError
curl.exe --fail --location --silent --show-error --retry 2 "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/main/scripts/pc-writer/theme-optional-stage.mjs" --output "%ZG_BOOTSTRAP%"
if errorlevel 1 goto DownloadError
"%ZG_NODE%" "%ZG_BOOTSTRAP%" > "%ZG_RESULT%" 2>&1
set "ZG_EXIT=%ERRORLEVEL%"
type "%ZG_RESULT%"
echo.
echo REPORT=%ZG_RESULT%
echo EXIT_CODE=%ZG_EXIT%
pause
exit /b %ZG_EXIT%
:MissingNode
echo RESULT=BLOCKED; REASON=APPROVED_E_NODE_MISSING
pause
exit /b 3
:MissingProjects
echo RESULT=BLOCKED; REASON=APPROVED_E_PROJECTS_MISSING
pause
exit /b 4
:MkdirError
echo RESULT=BLOCKED; REASON=BOOTSTRAP_DIRECTORY_CREATE_FAILED
pause
exit /b 5
:DownloadError
echo RESULT=BLOCKED; REASON=GITHUB_BOOTSTRAP_DOWNLOAD_FAILED
pause
exit /b 6
