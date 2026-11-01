@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "OUT_FILE=%~dp0BIOTECH_R7_SCHEDULE_CHECK_LOG.txt"
> "%OUT_FILE%" echo REPORT=BIOTECH_R7_SCHEDULE_CHECK
>> "%OUT_FILE%" echo CHECK_TARGET=ZGMINI-PC-Theme-Biotech
schtasks.exe /query /tn "\ZGMINI-PC-Theme-Biotech" /v /fo LIST >> "%OUT_FILE%" 2>&1
set "CHECK_RESULT=%ERRORLEVEL%"
>> "%OUT_FILE%" echo TASK_QUERY_EXIT_CODE=%CHECK_RESULT%
if exist "%USERPROFILE%\Desktop\BIOTECH_R7_LAST_RUN.txt" (
  >> "%OUT_FILE%" echo LAST_RUN_LOG=USERPROFILE_DESKTOP_FOUND
  type "%USERPROFILE%\Desktop\BIOTECH_R7_LAST_RUN.txt" >> "%OUT_FILE%"
) else (
  >> "%OUT_FILE%" echo LAST_RUN_LOG=USERPROFILE_DESKTOP_MISSING
)
if defined OneDrive (
  if exist "%OneDrive%\Desktop\BIOTECH_R7_LAST_RUN.txt" (
    >> "%OUT_FILE%" echo LAST_RUN_LOG=ONEDRIVE_DESKTOP_FOUND
    type "%OneDrive%\Desktop\BIOTECH_R7_LAST_RUN.txt" >> "%OUT_FILE%"
  ) else (
    >> "%OUT_FILE%" echo LAST_RUN_LOG=ONEDRIVE_DESKTOP_MISSING
  )
)
if not "%CHECK_RESULT%"=="0" exit /b 2
exit /b 0
