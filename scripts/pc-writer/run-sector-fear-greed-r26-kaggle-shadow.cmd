@echo off
setlocal EnableExtensions DisableDelayedExpansion

for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"
set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "WORK=%BASE%\sector-r26-kaggle"
set "CSV=%WORK%\sp500_stocks.csv"
set "DOWNLOAD=%WORK%\sp500_stocks.download"
set "URL=https://www.kaggle.com/api/v1/datasets/download/andrewmvd/sp-500-stocks/sp500_stocks.csv"
set "PROVIDER_CALLS=0"

if not exist "%BASE%\local-sector-fear-greed-r1-pit-gics.csv" (
  echo R26_KAGGLE_PIT_FILE_MISSING
  exit /b 2
)

if defined ZGMINI_KAGGLE_SP500_CSV (
  if not exist "%ZGMINI_KAGGLE_SP500_CSV%" (
    echo R26_KAGGLE_OVERRIDE_CSV_MISSING
    exit /b 3
  )
  set "CSV=%ZGMINI_KAGGLE_SP500_CSV%"
  goto :RUN_DIAGNOSTIC
)

if exist "%CSV%" goto :RUN_DIAGNOSTIC
if not exist "%WORK%" mkdir "%WORK%" >nul 2>&1
if not exist "%WORK%" (
  echo R26_KAGGLE_WORKDIR_CREATE_FAILED
  exit /b 4
)

where curl.exe >nul 2>&1
if errorlevel 1 (
  echo R26_KAGGLE_CURL_MISSING
  exit /b 5
)

if exist "%DOWNLOAD%" del /q "%DOWNLOAD%" >nul 2>&1
if exist "%DOWNLOAD%" (
  echo R26_KAGGLE_TEMP_DELETE_FAILED
  exit /b 6
)

echo R26_KAGGLE_DOWNLOAD_START
curl.exe -L --fail --silent --show-error --retry 0 --max-redirs 3 --connect-timeout 20 --max-time 900 -o "%DOWNLOAD%" "%URL%"
if errorlevel 1 (
  echo R26_KAGGLE_DOWNLOAD_FAILED
  exit /b 7
)
set "PROVIDER_CALLS=1"

findstr /b /c:"Date,Symbol," "%DOWNLOAD%" >nul 2>&1
if not errorlevel 1 (
  move /y "%DOWNLOAD%" "%CSV%" >nul
  if errorlevel 1 (
    echo R26_KAGGLE_CSV_MOVE_FAILED
    exit /b 8
  )
  goto :RUN_DIAGNOSTIC
)

where tar.exe >nul 2>&1
if errorlevel 1 (
  echo R26_KAGGLE_ARCHIVE_WITHOUT_TAR
  exit /b 9
)
set "EXTRACT=%WORK%\extract-%RANDOM%-%RANDOM%"
mkdir "%EXTRACT%" >nul 2>&1
if not exist "%EXTRACT%" (
  echo R26_KAGGLE_EXTRACT_DIR_FAILED
  exit /b 10
)
tar.exe -xf "%DOWNLOAD%" -C "%EXTRACT%"
if errorlevel 1 (
  echo R26_KAGGLE_ARCHIVE_EXTRACT_FAILED
  exit /b 11
)
set "FOUND_CSV="
for /r "%EXTRACT%" %%F in (sp500_stocks.csv) do if not defined FOUND_CSV set "FOUND_CSV=%%~fF"
if not defined FOUND_CSV (
  echo R26_KAGGLE_CSV_NOT_IN_ARCHIVE
  exit /b 12
)
copy /y "%FOUND_CSV%" "%CSV%" >nul
if errorlevel 1 (
  echo R26_KAGGLE_CSV_COPY_FAILED
  exit /b 13
)

:RUN_DIAGNOSTIC
if not exist "%CSV%" (
  echo R26_KAGGLE_CSV_MISSING
  exit /b 14
)
findstr /b /c:"Date,Symbol," "%CSV%" >nul 2>&1
if errorlevel 1 (
  echo R26_KAGGLE_CSV_HEADER_INVALID
  exit /b 15
)
where node.exe >nul 2>&1
if errorlevel 1 (
  echo R26_KAGGLE_NODE_MISSING
  exit /b 16
)
set "ZGMINI_R26_KAGGLE_PROVIDER_CALLS=%PROVIDER_CALLS%"
node "%ROOT%\scripts\pc-writer\sector-fear-greed-r26-kaggle-diagnostic.mjs" "%CSV%"
if errorlevel 1 (
  echo R26_KAGGLE_DIAGNOSTIC_FAILED
  exit /b 17
)

echo R26_KAGGLE_DIAGNOSTIC_COMPLETE
echo RESULT=%BASE%\local-sector-fear-greed-r26-kaggle-diagnostic.txt
exit /b 0
