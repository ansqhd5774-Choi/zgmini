@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Iran news R2 single-file Windows CMD preflight. PC cache and D1 are READ-ONLY.
set "ZG_IRAN_LOG=%~dp0IRAN_NEWS_R2_PREFLIGHT_RESULT.txt"
set "ZG_IRAN_RUNTIME=%~dp0IRAN_NEWS_R2_RUNTIME"
set "ZG_IRAN_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/7faabc4e340c494a9c81cbf8a09fddcf28fa6d67"
set "ZG_IRAN_STAGE=%ZG_IRAN_RUNTIME%\approved-input.json"
> "%ZG_IRAN_LOG%" echo ZGMINI IRAN NEWS R2 - REVIEWED GOVERNMENT NEWS DRY RUN
>> "%ZG_IRAN_LOG%" echo Commit: 7faabc4e340c494a9c81cbf8a09fddcf28fa6d67
>> "%ZG_IRAN_LOG%" echo No PC cache write, no D1 publish, no score or ledger changes.
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
if not exist "%ZG_IRAN_RUNTIME%\scripts\iran-progress" mkdir "%ZG_IRAN_RUNTIME%\scripts\iran-progress"
if errorlevel 1 goto :failed
if not exist "%ZG_IRAN_RUNTIME%\lib\iran-progress" mkdir "%ZG_IRAN_RUNTIME%\lib\iran-progress"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-maintenance-r1.mjs" "scripts\iran-progress\news-display-maintenance-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-r1.mjs" "scripts\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-io-r1.mjs" "scripts\iran-progress\news-display-io-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-publication-r1.mjs" "scripts\iran-progress\news-display-publication-r1.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [1] GOV.UK live discovery
node "%ZG_IRAN_RUNTIME%\scripts\iran-progress\news-display-discover-r1.mjs" --preview >> "%ZG_IRAN_LOG%" 2>&1
set "ZG_IRAN_DISCOVERY_EXIT=%ERRORLEVEL%"
>> "%ZG_IRAN_LOG%" echo DISCOVERY_EXIT=%ZG_IRAN_DISCOVERY_EXIT%
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [2] Existing PC scheduler registration
schtasks /query /tn "ZGMINI-PC-Iran-Progress-R13" /fo list >> "%ZG_IRAN_LOG%" 2>&1
set "ZG_IRAN_TASK_EXIT=%ERRORLEVEL%"
>> "%ZG_IRAN_LOG%" echo TASK_QUERY_EXIT=%ZG_IRAN_TASK_EXIT%
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [3] Individually reviewed GOV.UK article - cache dry run
node -e "require('node:fs').writeFileSync(process.argv[1],Buffer.from(process.argv[2],'base64'))" "%ZG_IRAN_STAGE%" "eyJ2ZXJzaW9uIjoiSVJBTl9ORVdTX1JFVklFV0VEX0lOUFVUX1IxIiwiaXRlbXMiOlt7InNvdXJjZSI6IkdPVi5VSyIsInNvdXJjZVVybCI6Imh0dHBzOi8vd3d3Lmdvdi51ay9nb3Zlcm5tZW50L25ld3MvY2hpZWYtb2YtZGVmZW5jZS1ob3N0cy10ZW50aC1kcmFnb24tZ3JvdXAtbWVldGluZy1pbi1sb25kb24iLCJwdWJsaXNoZWRBdCI6IjIwMjYtMTAtMjNUMTM6MzA6NTAuMDAwWiIsInRpdGxlIjoi7JiB6rWtIOyjvOyerCDspJHrj5kg6rWt67CpIOyImOuHjOu2gCDtmozsnZjsl5DshJwg66+4wrfsnbTrnoAg67aE7J+BIOuFvOydmCIsInN1bW1hcnkiOiLsmIHqta0g6rWt67Cp7LC466qo7LSd7J6l7J20IOufsOuNmOyXkOyEnCDqsbjtlITCt+ykkeuPmSDsp4Dsl60g6rWt67CpIOyImOuHjOu2gCDtmozsnZjrpbwg7KO87J6s7ZaI64ukLiDsmIHqta0g6rWt67Cp67aAIOuwnO2RnOyXkCDrlLDrpbTrqbQg7LC47ISd7J6Q65Ok7J2AIOuvuMK37J20656AIOu2hOyfgeqzvCDsgqzsmrDrlJTslYTrnbzruYTslYTrpbwg7Zal7ZWcIO2bhO2LsCDqs7Xqsqkg7ZmV64yAIOuTsSDsp4Dsl60g7JWI67O0IO2YhOyViOydhCDrhbzsnZjtlojri6QuIiwiaW1wYWN0IjoibmV1dHJhbCIsInJpZ2h0c1ZlcmlmaWVkIjp0cnVlLCJyaWdodHNTb3VyY2UiOiJHT1ZfVUtfT0dMX1YzIiwicmlnaHRzUG9saWN5VXJsIjoiaHR0cHM6Ly93d3cuZ292LnVrL2hlbHAvcmV1c2UtZ292dWstY29udGVudCIsInJpZ2h0c1Jldmlld0RhdGUiOiIyMDI2LTEwLTI2IiwicmlnaHRzUmV2aWV3U2NvcGUiOiJNT0Qtb3JpZ2luYXRlZCBhcnRpY2xlIHRleHQgb25seTsgbm8gcGhvdG9ncmFwaHMsIGxvZ29zIG9yIHRoaXJkLXBhcnR5IGV4Y2VycHRzIiwiZXZpZGVuY2VVcmwiOiJodHRwczovL3d3dy5nb3YudWsvaGVscC90ZXJtcy1jb25kaXRpb25zIn1dfQ==" >> "%ZG_IRAN_LOG%" 2>&1
if errorlevel 1 goto :failed
node "%ZG_IRAN_RUNTIME%\scripts\iran-progress\news-display-maintenance-r1.mjs" --dry-run "--reviewed-input=%ZG_IRAN_STAGE%" >> "%ZG_IRAN_LOG%" 2>&1
set "ZG_IRAN_REVIEW_EXIT=%ERRORLEVEL%"
>> "%ZG_IRAN_LOG%" echo REVIEW_DRY_RUN_EXIT=%ZG_IRAN_REVIEW_EXIT%
call :cleanup
if not "%ZG_IRAN_DISCOVERY_EXIT%"=="0" goto :failed
if not "%ZG_IRAN_REVIEW_EXIT%"=="0" goto :failed
>> "%ZG_IRAN_LOG%" echo FINAL_STATUS=PASS_READ_ONLY_REVIEWED
echo Finished. Upload IRAN_NEWS_R2_PREFLIGHT_RESULT.txt to ChatGPT.
exit /b 0
:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_IRAN_RAW%/%~1" --output "%ZG_IRAN_RUNTIME%\%~2" >> "%ZG_IRAN_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_IRAN_LOG%" echo ERROR: source download failed: %~1
 exit /b 1
)
exit /b 0
:cleanup
if exist "%ZG_IRAN_STAGE%" del /q "%ZG_IRAN_STAGE%" >nul 2>nul
exit /b 0
:failed
call :cleanup
>> "%ZG_IRAN_LOG%" echo FINAL_STATUS=FAIL_OR_PARTIAL_READ_ONLY
echo Check failed or partial. Upload IRAN_NEWS_R2_PREFLIGHT_RESULT.txt to ChatGPT.
exit /b 1
