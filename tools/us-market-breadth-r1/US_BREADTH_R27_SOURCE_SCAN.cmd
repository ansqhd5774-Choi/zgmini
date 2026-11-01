@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RESULT_DIR=%USERPROFILE%\Downloads"
if not exist "%RESULT_DIR%\" set "RESULT_DIR=%TEMP%"
set "RESULT=%RESULT_DIR%\US_BREADTH_R27_SOURCE_SCAN_%RANDOM%_%RANDOM%.txt"

(
  echo ZGMINI US BREADTH R27 SOURCE SCAN
  echo READ_ONLY=YES
  echo E_DRIVE_WRITES=NO
  echo CORE_TASK_CHANGE=NO
  echo.
  echo [APPROVED_NODE_VERSION]
  if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" --version
  ) else (
    echo E_NODE_NOT_FOUND
  )
  echo.
  echo [PROJECTS_WITH_R24_SCRIPT]
  if exist "E:\ZGmini\projects\" (
    for /d %%P in ("E:\ZGmini\projects\*") do (
      if exist "%%~fP\scripts\pc-writer\us-breadth-confirmed-provider-manifest-r24.mjs" (
        echo R24_PRESENT=%%~nxP
        if exist "%%~fP\scripts\pc-writer\us-breadth-confirmed-year-preview-r25.mjs" (
          echo R25_PRESENT=%%~nxP
        ) else (
          echo R25_MISSING=%%~nxP
        )
      )
    )
  ) else (
    echo E_PROJECTS_NOT_FOUND
  )
  echo [END_PROJECT_SCAN]
  echo.
  echo A_FOUND_PROJECT_IS_NOT_APPROVED_CORE_SOURCE
  echo CHECK_CORE_TASK_ACTION_AND_CONFIG_SOURCE_BEFORE_R24_EXECUTION
) 1>"%RESULT%" 2>&1

echo.
echo Source scan finished. No E: writes, installation, or task changes.
echo Upload this TXT file to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal
