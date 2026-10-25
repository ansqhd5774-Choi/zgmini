@echo off
setlocal
rem Stage 04 R18 common-source preflight (manual launch / no scheduler).
rem One fixed source per field. Historical R17 readers are research-only.
rem Read-only: no orders, DB writes, Cloudflare publishing or formula changes.
set "ZG_BOT_SCRIPT=%~dp0common-source-gate-readonly.mjs"
if not exist "%ZG_BOT_SCRIPT%" (
    echo STAGE04_BOT_SCRIPT_MISSING
    exit /b 2
)
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_BOT_SCRIPT%"
) else (
    node "%ZG_BOT_SCRIPT%"
)
set "ZG_BOT_EXIT=%errorlevel%"
echo STAGE04_BOT_EXIT=%ZG_BOT_EXIT%
exit /b %ZG_BOT_EXIT%
