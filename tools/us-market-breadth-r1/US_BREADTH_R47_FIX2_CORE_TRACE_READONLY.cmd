@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R47 FIX2 separates a unique Core source from an auxiliary launcher.
rem READ ONLY. Output beside this extracted CMD, never on E:.
set "RESULT=%~dp0US_BREADTH_R47_FIX2_CORE_TRACE_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-core-execution-trace-r47.mjs"

(
  echo ZGMINI US BREADTH R47 FIX2 CORE SOURCE AND AUXILIARY TRACE
  echo MODE=READ_ONLY_TWO_EXECUTABLES
  echo LOG_LOCATION=NEXT_TO_CMD
  echo E_SOURCE_WRITES=0
  echo D1_READS=0
  echo D1_WRITES=0
  echo PROVIDER_CALLS=0
  echo CORE_TASK_CHANGES=0
  echo LOCK_PID_ACTIONS=0
  echo.
  echo [R47_FIX2_CORE_TRACE_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "%RESULT%" (
  echo ERROR: Cannot create the TXT beside the extracted CMD.
  echo Extract the ZIP into a writable folder like Downloads first.
  pause
  exit /b 1
)

if not exist "E:\ZGmini\runtime\node.exe" (
  echo APPROVED_E_NODE_NOT_FOUND>>"%RESULT%"
) else (
  if not exist "%SCRIPT%" (
    echo R47_FIX2_SCRIPT_NOT_FOUND_EXTRACT_ZIP_FIRST>>"%RESULT%"
  ) else (
    "E:\ZGmini\runtime\node.exe" "%SCRIPT%" --inspect-only 1>>"%RESULT%" 2>nul
    if errorlevel 1 echo R47_FIX2_INSPECT_EXIT_NONZERO>>"%RESULT%"
  )
)

echo.
echo Read-only inspection finished. E source, D1 and Core Task unchanged.
echo Attach the TXT in this CMD folder:
echo "%RESULT%"
explorer.exe /select,"%RESULT%"
pause
endlocal
