@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RESULT_DIR=%USERPROFILE%\Downloads"
if not exist "%RESULT_DIR%\" set "RESULT_DIR=%TEMP%"
set "RESULT=%RESULT_DIR%\US_BREADTH_R29_MANIFEST_PROBE_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-confirmed-availability-r29.mjs"
set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"

(
  echo ZGMINI US BREADTH R29 MANIFEST PROBE
  echo MODE=ONE_PROVIDER_MANIFEST_GET_ONLY
  echo SOURCE_STAGE=CANDIDATE_DIAGNOSTIC_NOT_APPROVED_CORE_SOURCE
  echo DOWNLOAD_CALLS=0
  echo LOCAL_WRITES=0
  echo CORE_TASK_CHANGES=0
  echo.
  echo [R29_MANIFEST_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "E:\ZGmini\runtime\node.exe" (
  echo E_NODE_NOT_FOUND>>"%RESULT%"
) else (
  if not exist "%SCRIPT%" (
    echo PACKAGE_R29_SCRIPT_NOT_FOUND>>"%RESULT%"
  ) else (
    "E:\ZGmini\runtime\node.exe" "%SCRIPT%" --probe-only 1>>"%RESULT%" 2>&1
    if errorlevel 1 echo R29_PROBE_EXIT_NONZERO>>"%RESULT%"
  )
)

echo.
echo Provider manifest probe finished. No E: writes or data downloads.
echo Upload this TXT file to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal
