@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Safe one-time R2 preview, guarded install, and D1 readback.
rem Never changes R41 collection, R5 score, task configuration, or other D1 keys.
set "ZG_LOG=%~dp0IRAN_NEWS_ANALYSIS_R2_FIX1_RESULT.txt"
set "ZG_TARGET=E:\ZGmini\projects\iran-news-analysis-r1-56eec668"
set "ZG_SOURCE=%ZG_TARGET%\scripts\iran-progress\news-r41-auto-interpret-r1.mjs"
set "ZG_LIB=%ZG_TARGET%\lib\iran-progress\news-analysis-public-r1.mjs"
set "ZG_DATA=E:\ZGmini\data\iran-progress-r13"
set "ZG_COMMIT=861308ef7b08e8278e3e31431685509415d9548d"
set "ZG_SOURCE_OLD=dfcf5b57092e3ae2d180601e2e99041a7565844ad35fe42986a34d1e15c6039d"
set "ZG_SOURCE_NEW=8e0e800f4ab5408ba5317e02795f66d765e850c51000f1d8a294867765709a4e"
set "ZG_LIB_OLD=b5dd8b9a112e2c60d622a97e18875e6523b2e1035cf8e50f1d1f33dcf79dcd36"
set "ZG_LIB_NEW=7a368d1159ec3389ee87e24f7e44386e3a40dfde6f8f1b3d3042076ea0de7be0"
set "ZG_RUNID=%RANDOM%_%RANDOM%"
set "ZG_SOURCE_CAND=%ZG_SOURCE%.%ZG_RUNID%.r2-candidate.mjs"
set "ZG_LIB_CAND=%ZG_LIB%.%ZG_RUNID%.r2-candidate.mjs"
set "ZG_SOURCE_BAK=%ZG_SOURCE%.%ZG_RUNID%.before-r2.bak"
set "ZG_LIB_BAK=%ZG_LIB%.%ZG_RUNID%.before-r2.bak"
set "ZG_CACHE=%ZG_DATA%\news-analysis-r1-cache.json"
set "ZG_STAGE=%ZG_DATA%\news-analysis-r1-public-staged.json"
set "ZG_CACHE_BAK=%ZG_CACHE%.%ZG_RUNID%.before-r2.bak"
set "ZG_STAGE_BAK=%ZG_STAGE%.%ZG_RUNID%.before-r2.bak"
set "ZG_CACHE_TEST=%ZG_DATA%\news-analysis-r2-preview-cache-%ZG_RUNID%.json"
set "ZG_STAGE_TEST=%ZG_DATA%\news-analysis-r2-preview-stage-%ZG_RUNID%.json"
set "ZG_PUB_LOG=%ZG_DATA%\news-analysis-r2-publish-%ZG_RUNID%.txt"
set "ZG_CHANGED=0"
set "ZG_FILES_CHANGED=0"
>"%ZG_LOG%" echo IRAN NEWS R2 FIX1 SAFE ONE CLICK
if errorlevel 1 goto no_log
>>"%ZG_LOG%" echo COMMIT=%ZG_COMMIT%
if not exist "%ZG_SOURCE%" goto missing
if not exist "%ZG_LIB%" goto missing
if not exist "%ZG_DATA%\" goto missing
if not exist "%ZG_STAGE%" goto missing
where curl.exe >nul 2>&1
if errorlevel 1 goto tools_missing
where certutil.exe >nul 2>&1
if errorlevel 1 goto tools_missing
call "%ZG_TARGET%\scripts\resolve-local-node.cmd" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto tools_missing

>>"%ZG_LOG%" echo [1] CHECK PINNED INSTALLED FILES
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_SOURCE_OLD%" >nul
if not errorlevel 1 goto source_old
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_SOURCE_NEW%" >nul
if errorlevel 1 goto unknown_source
set "ZG_SOURCE_STATE=NEW"
goto lib_check
:source_old
set "ZG_SOURCE_STATE=OLD"
:lib_check
certutil.exe -hashfile "%ZG_LIB%" SHA256 | findstr /I /C:"%ZG_LIB_OLD%" >nul
if not errorlevel 1 goto lib_old
certutil.exe -hashfile "%ZG_LIB%" SHA256 | findstr /I /C:"%ZG_LIB_NEW%" >nul
if errorlevel 1 goto unknown_lib
set "ZG_LIB_STATE=NEW"
goto states_checked
:lib_old
set "ZG_LIB_STATE=OLD"
:states_checked
>>"%ZG_LOG%" echo INSTALLED_SOURCE=%ZG_SOURCE_STATE% LIB=%ZG_LIB_STATE%
if "%ZG_SOURCE_STATE%"=="OLD" if "%ZG_LIB_STATE%"=="NEW" goto mixed
if "%ZG_SOURCE_STATE%"=="NEW" if "%ZG_LIB_STATE%"=="OLD" goto mixed
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" --inspect >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto schedule_blocked

>>"%ZG_LOG%" echo [2] DOWNLOAD EXACT R2 CANDIDATES
curl.exe -fL --retry 2 --connect-timeout 15 --max-time 120 -o "%ZG_SOURCE_CAND%" "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_COMMIT%/scripts/iran-progress/news-r41-auto-interpret-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto download_error
curl.exe -fL --retry 2 --connect-timeout 15 --max-time 120 -o "%ZG_LIB_CAND%" "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_COMMIT%/lib/iran-progress/news-analysis-public-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto download_error
certutil.exe -hashfile "%ZG_SOURCE_CAND%" SHA256 | findstr /I /C:"%ZG_SOURCE_NEW%" >nul
if errorlevel 1 goto bad_download
certutil.exe -hashfile "%ZG_LIB_CAND%" SHA256 | findstr /I /C:"%ZG_LIB_NEW%" >nul
if errorlevel 1 goto bad_download
"%NODE%" --check "%ZG_SOURCE_CAND%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto bad_download
"%NODE%" --check "%ZG_LIB_CAND%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto bad_download

>>"%ZG_LOG%" echo [3] PREVIEW R2 ON PRIVATE COPIES ONLY - NO D1 WRITE
if exist "%ZG_CACHE%" copy /B "%ZG_CACHE%" "%ZG_CACHE_TEST%" >>"%ZG_LOG%" 2>&1
if exist "%ZG_CACHE%" if not exist "%ZG_CACHE_TEST%" goto preview_failed
"%NODE%" "%ZG_SOURCE_CAND%" --mode=cycle --feed-url=https://zgmini.kr/api/outbreak-news/iran/r41 --cache="%ZG_CACHE_TEST%" --output="%ZG_STAGE_TEST%" --model=gemma3:4b --max-new=16 >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto preview_failed
"%NODE%" -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const b=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const ids=new Set([...b.items,...b.pending].map(x=>x.id));const ready=new Set(b.items.map(x=>x.id));const carried=a.items.filter(x=>ids.has(x.id));const facts=b.items.filter(x=>typeof x.keyPointKo==='string'&&Array.isArray(x.keyFactsKo)&&x.keyFactsKo.length>=2&&x.keyFactsKo.length<=3);const okay=facts.length>0&&carried.every(x=>ready.has(x.id));console.log(JSON.stringify({status:okay?'R2_PREVIEW_VALID':'R2_PREVIEW_BLOCKED',oldReady:a.items.length,newReady:b.items.length,r2FactCards:facts.length,pending:b.pending.length,preservedOldReady:carried.filter(x=>ready.has(x.id)).length}));if(!okay)process.exitCode=1;" "%ZG_STAGE%" "%ZG_STAGE_TEST%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto preview_failed

>>"%ZG_LOG%" echo [4] BACKUP AND INSTALL BOTH VERIFIED R2 FILES
if "%ZG_SOURCE_STATE%"=="NEW" goto files_ready
copy /B "%ZG_SOURCE%" "%ZG_SOURCE_BAK%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto backup_failed
copy /B "%ZG_LIB%" "%ZG_LIB_BAK%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto backup_failed
certutil.exe -hashfile "%ZG_SOURCE_BAK%" SHA256 | findstr /I /C:"%ZG_SOURCE_OLD%" >nul
if errorlevel 1 goto backup_failed
certutil.exe -hashfile "%ZG_LIB_BAK%" SHA256 | findstr /I /C:"%ZG_LIB_OLD%" >nul
if errorlevel 1 goto backup_failed
set "ZG_FILES_CHANGED=1"
move /Y "%ZG_LIB_CAND%" "%ZG_LIB%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_files
move /Y "%ZG_SOURCE_CAND%" "%ZG_SOURCE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_files
:files_ready
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_SOURCE_NEW%" >nul
if errorlevel 1 goto restore_files
certutil.exe -hashfile "%ZG_LIB%" SHA256 | findstr /I /C:"%ZG_LIB_NEW%" >nul
if errorlevel 1 goto restore_files
"%NODE%" --check "%ZG_SOURCE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_files
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-publication-r1.mjs" --input="%ZG_STAGE_TEST%" --mode=dry-run >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_files

>>"%ZG_LOG%" echo [5] PRESERVE LOCAL STATE AND COMMIT TESTED PREVIEW
if exist "%ZG_CACHE%" copy /B "%ZG_CACHE%" "%ZG_CACHE_BAK%" >>"%ZG_LOG%" 2>&1
if exist "%ZG_CACHE%" if not exist "%ZG_CACHE_BAK%" goto restore_files
copy /B "%ZG_STAGE%" "%ZG_STAGE_BAK%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_files
set "ZG_CHANGED=1"
copy /Y /B "%ZG_CACHE_TEST%" "%ZG_CACHE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_all
copy /Y /B "%ZG_STAGE_TEST%" "%ZG_STAGE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto restore_all
>>"%ZG_LOG%" echo [6] PUBLISH VERIFIED R2 SNAPSHOT TO ISOLATED D1 KEY
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-publication-r1.mjs" --input="%ZG_STAGE%" --mode=publish >"%ZG_PUB_LOG%" 2>&1
if errorlevel 1 goto publish_uncertain
type "%ZG_PUB_LOG%" >>"%ZG_LOG%"
"%NODE%" -e "const fs=require('fs');const rows=fs.readFileSync(process.argv[1],'utf8').split(/\r?\n/).filter(Boolean);let x=null;for(let i=rows.length-1;i>=0;i--){try{x=JSON.parse(rows[i]);break}catch{}}if(!x||!['VERIFIED','UNCHANGED'].includes(x.status)||x.itemCount<1)process.exit(1);console.log('R2_D1_READBACK='+x.status+' ITEMS='+x.itemCount);" "%ZG_PUB_LOG%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto publish_uncertain
>>"%ZG_LOG%" echo FINAL_STATUS=R2_ANALYSIS_PUBLISHED_READBACK_VERIFIED
goto success

:restore_all
>>"%ZG_LOG%" echo ERROR=PRE_PUBLICATION_STATE_COPY_FAILED_RESTORE
if exist "%ZG_CACHE_BAK%" copy /Y /B "%ZG_CACHE_BAK%" "%ZG_CACHE%" >>"%ZG_LOG%" 2>&1
if exist "%ZG_STAGE_BAK%" copy /Y /B "%ZG_STAGE_BAK%" "%ZG_STAGE%" >>"%ZG_LOG%" 2>&1
:restore_files
if "%ZG_FILES_CHANGED%"=="1" if exist "%ZG_LIB_BAK%" copy /Y /B "%ZG_LIB_BAK%" "%ZG_LIB%" >>"%ZG_LOG%" 2>&1
if "%ZG_FILES_CHANGED%"=="1" if exist "%ZG_SOURCE_BAK%" copy /Y /B "%ZG_SOURCE_BAK%" "%ZG_SOURCE%" >>"%ZG_LOG%" 2>&1
>>"%ZG_LOG%" echo ERROR=R2_INSTALL_OR_PREFLIGHT_FAILED_RESTORED
goto blocked
:publish_uncertain
>>"%ZG_LOG%" echo ERROR=R2_PUBLICATION_UNCERTAIN_DO_NOT_ROLLBACK_AUTOMATICALLY
goto blocked
:missing
>>"%ZG_LOG%" echo ERROR=APPROVED_PC_SOURCE_OR_DATA_MISSING
goto blocked
:tools_missing
>>"%ZG_LOG%" echo ERROR=NODE_CURL_OR_CERTUTIL_UNAVAILABLE
goto blocked
:unknown_source
>>"%ZG_LOG%" echo ERROR=SOURCE_SHA256_UNKNOWN_NO_OVERWRITE
goto blocked
:unknown_lib
>>"%ZG_LOG%" echo ERROR=PUBLIC_LIB_SHA256_UNKNOWN_NO_OVERWRITE
goto blocked
:mixed
>>"%ZG_LOG%" echo ERROR=INSTALLED_VERSIONS_MIXED_NO_OVERWRITE
goto blocked
:schedule_blocked
>>"%ZG_LOG%" echo ERROR=EXISTING_SCHEDULE_INSPECTION_FAILED
goto blocked
:download_error
>>"%ZG_LOG%" echo ERROR=R2_PINNED_DOWNLOAD_FAILED
goto blocked
:bad_download
>>"%ZG_LOG%" echo ERROR=R2_DOWNLOAD_HASH_OR_SYNTAX_INVALID
goto blocked
:preview_failed
>>"%ZG_LOG%" echo ERROR=R2_PREVIEW_INVALID_OR_OLD_READY_NOT_PRESERVED_NO_PUBLISH
goto blocked
:backup_failed
>>"%ZG_LOG%" echo ERROR=BACKUP_FAILED_NO_OVERWRITE
goto blocked
:blocked
>>"%ZG_LOG%" echo FINAL_STATUS=BLOCKED_CHECK_LOG
type "%ZG_LOG%"
echo.
echo Log: "%ZG_LOG%"
pause
exit /b 1
:success
type "%ZG_LOG%"
echo.
echo Log: "%ZG_LOG%"
pause
exit /b 0
:no_log
echo ERROR=CANNOT_CREATE_LOG
pause
exit /b 1
