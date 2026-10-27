@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R27: save rights-unapproved article metadata into ONE isolated PC candidate file.
rem No public news cache, score DB, D1, UI, translation or scheduler changes.
set "ZG_R27_LOG=%~dp0IRAN_NEWS_R27_COLLECTION_APPLY_RESULT.txt"
set "ZG_R27_STAGE=%~dp0IRAN_NEWS_R27_COLLECTION_RUNTIME"
set "ZG_R27_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/39b0642d35a255561722dac6bcd3126f6d177749"
set "ZG_R27_REPORT=%ZG_R27_STAGE%\report.json"
set "ZG_R27_OWN_STAGE=0"
> "%ZG_R27_LOG%" echo ZGMINI IRAN NEWS R27 - SAVE SEVEN-SOURCE PRIVATE CANDIDATES
>> "%ZG_R27_LOG%" echo Pinned source SHA: 39b0642d35a255561722dac6bcd3126f6d177749
>> "%ZG_R27_LOG%" echo One new PC candidate file only. Unlicensed articles are NOT published.
if exist "%ZG_R27_STAGE%" (
 >> "%ZG_R27_LOG%" echo STOP: R27 helper directory exists. No overwrite.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R27_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R27_OWN_STAGE=1"
mkdir "%ZG_R27_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-collection-r26.mjs" "scripts\iran-progress\news-display-collection-r26.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-multisource-audit-r24.mjs" "scripts\iran-progress\news-display-multisource-audit-r24.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-article-audit-r25.mjs" "scripts\iran-progress\news-display-article-audit-r25.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-source-registry-r26.mjs" "scripts\iran-progress\news-display-source-registry-r26.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
>> "%ZG_R27_LOG%" echo [1] Discover and validate sources, save isolated private metadata to PC
set "ZGMINI_IRAN_NEWS_R26_APPROVED=YES"
node "%ZG_R27_STAGE%\scripts\iran-progress\news-display-collection-r26.mjs" --collect > "%ZG_R27_REPORT%" 2>> "%ZG_R27_LOG%"
set "ZG_R27_COLLECT_EXIT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R26_APPROVED="
if not "%ZG_R27_COLLECT_EXIT%"=="0" goto :uncertain
type "%ZG_R27_REPORT%" >> "%ZG_R27_LOG%"
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(!['COLLECTION_REVIEW_READY','PARTIAL_COLLECTION_REVIEW_REQUIRED'].includes(r.status)||r.sourceCount!==7||r.dryRun!==false||r.written!==true||r.candidatesSaved<1||r.metadataReviewed<1||!Array.isArray(r.articleOutcomes)||!Array.isArray(r.failedArticles)||r.publication!=='NOT_AUTHORIZED'||r.scoreLedgerModified!==false||r.publicCacheModified!==false||r.d1Written!==false||r.schedulerModified!==false||r.translationModified!==false||r.rightsVerified!==0||r.displayEligible!==0)throw Error('R27_PRIVATE_CANDIDATE_WRITE_GATE_FAILED');console.log('R27_GATE='+r.status);" "%ZG_R27_REPORT%" >> "%ZG_R27_LOG%" 2>&1
if errorlevel 1 goto :uncertain
goto :passed

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R27_RAW%/%~1" --output "%ZG_R27_STAGE%\%~2" >> "%ZG_R27_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R27_LOG%" echo ERROR: R27 helper download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R27_REPORT%" del /q "%ZG_R27_REPORT%" >nul 2>nul
if exist "%ZG_R27_STAGE%\scripts\iran-progress\news-display-collection-r26.mjs" del /q "%ZG_R27_STAGE%\scripts\iran-progress\news-display-collection-r26.mjs" >nul 2>nul
if exist "%ZG_R27_STAGE%\scripts\iran-progress\news-display-multisource-audit-r24.mjs" del /q "%ZG_R27_STAGE%\scripts\iran-progress\news-display-multisource-audit-r24.mjs" >nul 2>nul
if exist "%ZG_R27_STAGE%\scripts\iran-progress\news-display-article-audit-r25.mjs" del /q "%ZG_R27_STAGE%\scripts\iran-progress\news-display-article-audit-r25.mjs" >nul 2>nul
if exist "%ZG_R27_STAGE%\scripts\iran-progress\news-display-source-registry-r26.mjs" del /q "%ZG_R27_STAGE%\scripts\iran-progress\news-display-source-registry-r26.mjs" >nul 2>nul
if exist "%ZG_R27_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R27_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R27_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R27_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R27_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R27_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R27_STAGE%\scripts\iran-progress" rmdir "%ZG_R27_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R27_STAGE%\scripts" rmdir "%ZG_R27_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R27_STAGE%\lib\iran-progress" rmdir "%ZG_R27_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R27_STAGE%\lib" rmdir "%ZG_R27_STAGE%\lib" >nul 2>nul
if exist "%ZG_R27_STAGE%" rmdir "%ZG_R27_STAGE%" >nul 2>nul
exit /b 0

:passed
call :cleanup
>> "%ZG_R27_LOG%" echo NEXT_GATE=VERIFY_PC_CANDIDATES_THEN_NON_BLOCKING_R15_HOOK
>> "%ZG_R27_LOG%" echo FINAL_STATUS=PASS_R27_PRIVATE_CANDIDATES_SAVED
echo R27 private news metadata saved and verified. Upload IRAN_NEWS_R27_COLLECTION_APPLY_RESULT.txt.
exit /b 0

:uncertain
>> "%ZG_R27_LOG%" echo FINAL_STATUS=STOP_R27_CANDIDATE_FILE_OUTCOME_REQUIRES_REVIEW
>> "%ZG_R27_LOG%" echo Do not rerun blindly. Existing public cache, score database and D1 were not intentionally changed.
echo R27 candidate file result requires review. Upload IRAN_NEWS_R27_COLLECTION_APPLY_RESULT.txt.
exit /b 2

:failed
if "%ZG_R27_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R27_LOG%" echo FINAL_STATUS=STOP_R27_BEFORE_CANDIDATE_WRITE
echo R27 stopped before PC candidate write. Upload IRAN_NEWS_R27_COLLECTION_APPLY_RESULT.txt.
exit /b 1
