@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title ZGMINI E1-R5 SEC MATCHING SAMPLE R1

if defined ZGMINI_PC_HOME (
  set "BASE=%ZGMINI_PC_HOME%"
) else (
  set "BASE=%USERPROFILE%\.zgmini\pc-writer"
)

echo ============================================================
echo ZGMINI E1-R5 SEC MATCHING SAMPLE R1
echo ============================================================
echo [MODE] RESEARCH-ONLY / LOCAL STORED CROSS-FILING REPORT
echo [BASE] %BASE%
echo [NETWORK_CALLS] 0
echo [DB_D1_WRITE] 0
echo [PRODUCTION_ACTIVATION] NO
echo.

node "%~dp0scripts\pc-writer\earnings-r5-sec-matching-sample-r1.mjs" --base="%BASE%"
set "RC=%ERRORLEVEL%"

echo [FINAL_EXIT_CODE] %RC%
exit /b %RC%
