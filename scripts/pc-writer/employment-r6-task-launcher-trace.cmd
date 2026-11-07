@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Read only: Core task/VBS structure, no scheduler, DB or network mutations.
call "%~dp0..\resolve-local-node.cmd"
if errorlevel 1 exit /b 2
"%NODE%" "%~dp0employment-r6-task-launcher-trace.mjs" "%~dp0."
exit /b %errorlevel%
