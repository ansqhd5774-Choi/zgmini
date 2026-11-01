@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RESULT_DIR=%USERPROFILE%\Downloads"
if not exist "%RESULT_DIR%\" set "RESULT_DIR=%TEMP%"
set "RESULT=%RESULT_DIR%\US_BREADTH_R37_APPROVED_CORE_HISTORY_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-confirmed-percent-history-runner-r33.mjs"
set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "APPROVED_PREVIEW_SHA256=31ae5b3aa062d84ee9b28954fe726a47c36bde6bfcdfc957624fba4babee9728"

(
  echo ZGMINI US BREADTH R37 APPROVED CORE R2 PERCENT HISTORY
  echo MODE=EXPLICIT_OPERATOR_APPROVED_R2_ONLY
  echo CORRECTED_D1_ROLE=CORE_PUBLIC_SNAPSHOTS_R36_VERIFIED
  echo R2_HISTORY_KEY=public:market-breadth-confirmed-r2:usa:history-percent:v1
  echo OUTPUT=RISING_FALLING_UNCHANGED_PERCENT_ONLY
  echo E_SOURCE_WRITES=0
  echo CORE_TASK_CHANGES=0
  echo LEGACY_R1_WRITES=0
  echo D1_WRITE=REQUIRES_OPERATOR_Y_AND_VERIFIED_SHA
  echo.
  echo [R37_PUBLICATION_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "E:\ZGmini\runtime\node.exe" (
  echo APPROVED_E_NODE_NOT_FOUND>>"%RESULT%"
  goto :DONE
)
if not exist "%SCRIPT%" (
  echo PACKAGE_R37_SCRIPT_NOT_FOUND>>"%RESULT%"
  goto :DONE
)

echo.
echo Target: approved Core D1 R2 percent-history key only. Never R1 or Core task.
echo Verified MarketParquet source and approved SHA are required before D1 writing.
choice /C YN /N /M "Proceed with R37 R2 percent-history D1 publication? [Y/N] "
if errorlevel 2 goto :DECLINED
if not errorlevel 1 goto :DECLINED
echo R37_OPERATOR_CONFIRMATION=Y>>"%RESULT%"
"E:\ZGmini\runtime\node.exe" "%SCRIPT%" --publish-approved --allow-d1-final-write --approved-sha256 "%APPROVED_PREVIEW_SHA256%" 1>>"%RESULT%" 2>&1
if errorlevel 1 echo R37_PUBLISH_EXIT_NONZERO>>"%RESULT%"
goto :DONE

:DECLINED
echo R37_OPERATOR_DECLINED_NO_D1_WRITE>>"%RESULT%"

:DONE
echo.
echo R37 publication attempt finished. Upload this TXT to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal
