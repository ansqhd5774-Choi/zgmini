@echo off
setlocal EnableExtensions DisableDelayedExpansion
"E:\ZGmini\runtime\node.exe" "%~dp0scripts\pc-writer\theme-config-timeout-diagnose.mjs" --diagnose
set "RESULT=%ERRORLEVEL%"
echo Diagnostic result: THEME_TASK_TIMEOUT_DIAG_RESULT.txt
pause
exit /b %RESULT%
