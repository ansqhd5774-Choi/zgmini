@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RESULT_DIR=%USERPROFILE%\Downloads"
if not exist "%RESULT_DIR%\" set "RESULT_DIR=%TEMP%"
set "RESULT=%RESULT_DIR%\US_BREADTH_R36_D1_TARGET_READONLY_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-r2-d1-target-probe-r36.mjs"
set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"

(
  echo ZGMINI US BREADTH R36 READ-ONLY D1 TARGET PROBE
  echo MODE=READ_ONLY_TWO_DATABASE_METADATA_PROBE
  echo MARKETPARQUET_PROVIDER_CALLS=0
  echo SOURCE_DOWNLOADS=0
  echo E_SOURCE_WRITES=0
  echo D1_WRITES=0
  echo CORE_TASK_CHANGES=0
  echo NO_ACCOUNT_IDS_TOKENS_OR_STORED_BODIES_IN_LOG=YES
  echo.
  echo [R36_D1_TARGET_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "E:\ZGmini\runtime\node.exe" (
  echo APPROVED_E_NODE_NOT_FOUND>>"%RESULT%"
) else (
  if not exist "%SCRIPT%" (
    echo PACKAGE_R36_SCRIPT_NOT_FOUND>>"%RESULT%"
  ) else (
    "E:\ZGmini\runtime\node.exe" "%SCRIPT%" --probe-only 1>>"%RESULT%" 2>&1
    if errorlevel 1 echo R36_READONLY_PROBE_EXIT_NONZERO>>"%RESULT%"
  )
)

echo.
echo R36 read-only D1 target probe finished. Upload this TXT to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal
