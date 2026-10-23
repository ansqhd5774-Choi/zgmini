@echo off
setlocal EnableExtensions DisableDelayedExpansion
if /I "%~1"=="ai-semiconductor" goto Start
if /I "%~1"=="biotech" goto Start
echo ERROR: theme must be ai-semiconductor or biotech.
exit /b 2
:Start
set "ZG_THEME_NODE=E:\ZGmini\runtime\node.exe"
set "ZG_THEME_DATA=E:\ZGmini\data"
if not exist "%ZG_THEME_NODE%" (
  echo ERROR: approved E: Node runtime missing.
  exit /b 3
)
if not exist "%ZG_THEME_DATA%\themes\%~1\raw-manifest.json" (
  echo ERROR: approved E: raw manifest missing.
  exit /b 4
)
set "ZGMINI_DATA_ROOT=%ZG_THEME_DATA%"
if /I "%~2"=="--publish" goto Publish
"%ZG_THEME_NODE%" "%~dp0theme-optional-cycle.mjs" --once "%~1"
exit /b %ERRORLEVEL%
:Publish
"%ZG_THEME_NODE%" "%~dp0theme-optional-cycle.mjs" --once "%~1" --publish
exit /b %ERRORLEVEL%
