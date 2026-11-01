@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RESULT=%TEMP%\US_BREADTH_R26_NODE_DIAG_%RANDOM%_%RANDOM%.txt"

(
  echo ZGMINI US BREADTH R26 NODE DIAGNOSTIC
  echo READ_ONLY=YES
  echo D1_WRITE=NO
  echo CORE_TASK_CHANGE=NO
  echo.
  echo [NODE_ON_PATH]
  where node.exe
  echo.
  echo [APPROVED_E_NODE]
  if exist "E:\ZGmini\runtime\node.exe" (
    dir "E:\ZGmini\runtime\node.exe"
    echo [APPROVED_E_NODE_VERSION]
    "E:\ZGmini\runtime\node.exe" --version
    echo [APPROVED_E_NODE_ARCH]
    "E:\ZGmini\runtime\node.exe" -p "process.arch"
  ) else (
    echo E_NODE_NOT_FOUND
  )
  echo.
  echo [E_PROJECT_DIRECTORIES]
  if exist "E:\ZGmini\projects\" (
    dir /b /ad "E:\ZGmini\projects"
  ) else (
    echo E_PROJECTS_NOT_FOUND
  )
  echo.
  echo [CORE_TASK_SUMMARY_ONLY]
  schtasks /Query /TN "ZGMINI-PC-Local-Core" /FO TABLE
) 1>"%RESULT%" 2>&1

echo.
echo Diagnostic finished. No Node PATH changes, installs, or data writes.
echo Upload the following TXT file to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal
