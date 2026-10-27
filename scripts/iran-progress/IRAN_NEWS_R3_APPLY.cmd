@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R3 applies ONE reviewed GOV.UK display item to the PC news-only JSON cache.
rem No existing Iran R3/R5 SQLite mutation, no D1 write, no scheduler changes.
set "ZG_IRAN_LOG=%~dp0IRAN_NEWS_R3_APPLY_RESULT.txt"
set "ZG_IRAN_RUNTIME=%~dp0IRAN_NEWS_R3_RUNTIME"
set "ZG_IRAN_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/7faabc4e340c494a9c81cbf8a09fddcf28fa6d67"
set "ZG_IRAN_STAGE=%ZG_IRAN_RUNTIME%\approved-input.json"
set "ZG_IRAN_PREVIEW=%ZG_IRAN_RUNTIME%\dry-run.json"
set "ZG_IRAN_APPLIED=%ZG_IRAN_RUNTIME%\applied.json"
> "%ZG_IRAN_LOG%" echo ZGMINI IRAN NEWS R3 - FIRST REVIEWED PC DISPLAY CACHE APPLY
>> "%ZG_IRAN_LOG%" echo Code commit: 7faabc4e340c494a9c81cbf8a09fddcf28fa6d67
>> "%ZG_IRAN_LOG%" echo Scope: FIRST news-display-r1.json only. No D1, score, ledger, scheduler changes.
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [0] R2 result gate
if not exist "%~dp0IRAN_NEWS_R2_PREFLIGHT_RESULT.txt" goto :failed
findstr /X /C:"FINAL_STATUS=PASS_READ_ONLY_REVIEWED" "%~dp0IRAN_NEWS_R2_PREFLIGHT_RESULT.txt" >nul
if errorlevel 1 goto :failed
findstr /X /C:"REVIEW_DRY_RUN_EXIT=0" "%~dp0IRAN_NEWS_R2_PREFLIGHT_RESULT.txt" >nul
if errorlevel 1 goto :failed
findstr /X /C:"TASK_QUERY_EXIT=0" "%~dp0IRAN_NEWS_R2_PREFLIGHT_RESULT.txt" >nul
if errorlevel 1 goto :failed
>> "%ZG_IRAN_LOG%" echo R2_GATE=PASS
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
if not exist "%ZG_IRAN_RUNTIME%\scripts\iran-progress" mkdir "%ZG_IRAN_RUNTIME%\scripts\iran-progress"
if errorlevel 1 goto :failed
if not exist "%ZG_IRAN_RUNTIME%\lib\iran-progress" mkdir "%ZG_IRAN_RUNTIME%\lib\iran-progress"
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
>> "%ZG_IRAN_LOG%" echo [1] Existing R13 task recheck - read only
schtasks /query /tn "ZGMINI-PC-Iran-Progress-R13" /fo list >> "%ZG_IRAN_LOG%" 2>&1
set "ZG_IRAN_TASK_EXIT=%ERRORLEVEL%"
>> "%ZG_IRAN_LOG%" echo TASK_QUERY_EXIT=%ZG_IRAN_TASK_EXIT%
if not "%ZG_IRAN_TASK_EXIT%"=="0" goto :failed
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [2] Verify DB marker and that the news-only cache is NOT already present
node -e "const fs=require('node:fs'),path=require('node:path'),os=require('node:os');const root=process.env.ZGMINI_IRAN_HOME||path.join(os.homedir(),'.zgmini','iran-progress-r13');const db=path.join(root,'iran.sqlite');const f=path.join(root,'news-display-r1.json');if(!fs.existsSync(db)||!fs.statSync(db).isFile())throw Error('OPERATIONAL_DB_MARKER_MISSING');if(fs.existsSync(f))throw Error('NEWS_CACHE_ALREADY_EXISTS_STOP_FOR_REVIEW');console.log('DB_MARKER=PASS');console.log('CACHE_ABSENT=PASS');" >> "%ZG_IRAN_LOG%" 2>&1
if errorlevel 1 goto :failed
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [3] Prepare the exact individually reviewed GOV.UK item
node -e "require('node:fs').writeFileSync(process.argv[1],Buffer.from(process.argv[2],'base64'))" "%ZG_IRAN_STAGE%" "eyJ2ZXJzaW9uIjoiSVJBTl9ORVdTX1JFVklFV0VEX0lOUFVUX1IxIiwiaXRlbXMiOlt7InNvdXJjZSI6IkdPVi5VSyIsInNvdXJjZVVybCI6Imh0dHBzOi8vd3d3Lmdvdi51ay9nb3Zlcm5tZW50L25ld3MvY2hpZWYtb2YtZGVmZW5jZS1ob3N0cy10ZW50aC1kcmFnb24tZ3JvdXAtbWVldGluZy1pbi1sb25kb24iLCJwdWJsaXNoZWRBdCI6IjIwMjYtMTAtMjNUMTM6MzA6NTAuMDAwWiIsInRpdGxlIjoi7JiB6rWtIOyjvOyerCDspJHrj5kg6rWt67CpIOyImOuHjOu2gCDtmozsnZjsl5DshJwg66+4wrfsnbTrnoAg67aE7J+BIOuFvOydmCIsInN1bW1hcnkiOiLsmIHqta0g6rWt67Cp7LC466qo7LSd7J6l7J20IOufsOuNmOyXkOyEnCDqsbjtlITCt+ykkeuPmSDsp4Dsl60g6rWt67CpIOyImOuHjOu2gCDtmozsnZjrpbwg7KO87J6s7ZaI64ukLiDsmIHqta0g6rWt67Cp67aAIOuwnO2RnOyXkCDrlLDrpbTrqbQg7LC47ISd7J6Q65Ok7J2AIOuvuMK37J20656AIOu2hOyfgeqzvCDsgqzsmrDrlJTslYTrnbzruYTslYTrpbwg7Zal7ZWcIO2bhO2LsCDqs7Xqsqkg7ZmV64yAIOuTsSDsp4Dsl60g7JWI67O0IO2YhOyViOydhCDrhbzsnZjtlojri6QuIiwiaW1wYWN0IjoibmV1dHJhbCIsInJpZ2h0c1ZlcmlmaWVkIjp0cnVlLCJyaWdodHNTb3VyY2UiOiJHT1ZfVUtfT0dMX1YzIiwicmlnaHRzUG9saWN5VXJsIjoiaHR0cHM6Ly93d3cuZ292LnVrL2hlbHAvcmV1c2UtZ292dWstY29udGVudCIsInJpZ2h0c1Jldmlld0RhdGUiOiIyMDI2LTEwLTI2IiwicmlnaHRzUmV2aWV3U2NvcGUiOiJNT0Qtb3JpZ2luYXRlZCBhcnRpY2xlIHRleHQgb25seTsgbm8gcGhvdG9ncmFwaHMsIGxvZ29zIG9yIHRoaXJkLXBhcnR5IGV4Y2VycHRzIiwiZXZpZGVuY2VVcmwiOiJodHRwczovL3d3dy5nb3YudWsvaGVscC90ZXJtcy1jb25kaXRpb25zIn1dfQ==" >> "%ZG_IRAN_LOG%" 2>&1
if errorlevel 1 goto :failed
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [4] Mandatory same-source dry run
node "%ZG_IRAN_RUNTIME%\scripts\iran-progress\news-display-maintenance-r1.mjs" --dry-run "--reviewed-input=%ZG_IRAN_STAGE%" > "%ZG_IRAN_PREVIEW%" 2>> "%ZG_IRAN_LOG%"
if errorlevel 1 goto :failed
type "%ZG_IRAN_PREVIEW%" >> "%ZG_IRAN_LOG%"
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(r.before!==0||r.received!==1||r.accepted!==1||r.rejected!==0||r.after!==1||r.dryRun!==true||r.written!==false)throw Error('REVIEWED_DRY_RUN_GATE_FAILED');console.log('DRY_RUN_GATE=PASS');" "%ZG_IRAN_PREVIEW%" >> "%ZG_IRAN_LOG%" 2>&1
if errorlevel 1 goto :failed
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [5] APPLY one display-only cache file; DO NOT rerun after any write uncertainty
node "%ZG_IRAN_RUNTIME%\scripts\iran-progress\news-display-maintenance-r1.mjs" --apply "--reviewed-input=%ZG_IRAN_STAGE%" > "%ZG_IRAN_APPLIED%" 2>> "%ZG_IRAN_LOG%"
if errorlevel 1 goto :uncertain
type "%ZG_IRAN_APPLIED%" >> "%ZG_IRAN_LOG%"
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(r.before!==0||r.received!==1||r.accepted!==1||r.after!==1||r.written!==true||r.visibleCount!==1||r.publication!=='SKIPPED_NOT_REQUESTED')throw Error('CACHE_APPLY_REPORT_INVALID');console.log('APPLY_REPORT=PASS');" "%ZG_IRAN_APPLIED%" >> "%ZG_IRAN_LOG%" 2>&1
if errorlevel 1 goto :uncertain
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [6] Independent read-back of the sole reviewed article
node -e "const fs=require('node:fs'),p=require('node:path'),os=require('node:os');const root=process.env.ZGMINI_IRAN_HOME||p.join(os.homedir(),'.zgmini','iran-progress-r13');const c=JSON.parse(fs.readFileSync(p.join(root,'news-display-r1.json'),'utf8'));if(c.version!=='IRAN_NEWS_PC_DISPLAY_R1'||c.items.length!==1||c.items[0].source!=='GOV.UK'||c.items[0].sourceUrl!=='https://www.gov.uk/government/news/chief-of-defence-hosts-tenth-dragon-group-meeting-in-london'||c.items[0].publishedAt!=='2026-10-23T13:30:50.000Z'||c.items[0].impact!=='neutral')throw Error('NEWS_READBACK_MISMATCH');console.log('NEWS_CACHE_READBACK=PASS');console.log('NEWS_ITEMS=1');" >> "%ZG_IRAN_LOG%" 2>&1
if errorlevel 1 goto :uncertain
call :cleanup
>> "%ZG_IRAN_LOG%" echo FINAL_STATUS=PASS_PC_CACHE_APPLIED_NOT_PUBLISHED
echo PC news cache applied and read back. Upload IRAN_NEWS_R3_APPLY_RESULT.txt.
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
if exist "%ZG_IRAN_PREVIEW%" del /q "%ZG_IRAN_PREVIEW%" >nul 2>nul
if exist "%ZG_IRAN_APPLIED%" del /q "%ZG_IRAN_APPLIED%" >nul 2>nul
exit /b 0
:uncertain
call :cleanup
>> "%ZG_IRAN_LOG%" echo FINAL_STATUS=STOP_CACHE_WRITE_VERIFY_REQUIRED
>> "%ZG_IRAN_LOG%" echo WARNING: Cache write may have occurred. DO NOT RERUN. Send this log.
echo Cache write requires review. DO NOT RERUN. Upload IRAN_NEWS_R3_APPLY_RESULT.txt.
exit /b 2
:failed
call :cleanup
>> "%ZG_IRAN_LOG%" echo FINAL_STATUS=STOP_NO_CACHE_WRITE_ATTEMPTED
echo No cache write attempted. Upload IRAN_NEWS_R3_APPLY_RESULT.txt.
exit /b 1
