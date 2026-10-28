@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R31: Observe R29 candidate auto-collection. Do not trigger any task.
set "ZG_R31_TOOL=%~dp0scripts\iran-progress\news-display-cycle-verify-r31.mjs"
if not exist "%ZG_R31_TOOL%" (
 echo STOP: Extract the whole R31 ZIP before running CMD.
 exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
 echo STOP: Node is not available.
 exit /b 1
)
node "%ZG_R31_TOOL%" "%~dp0"
exit /b %ERRORLEVEL%
