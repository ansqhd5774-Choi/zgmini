@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

set "TARGET_BRANCH=codex/earnings-e1-r5-sec-period-r24"
set "TARGET_REMOTE=github"
set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%~dp0ZGMINI_E1_R5_G2_R38_RUNTIME_LOG.txt"
set "WT=%TEMP%\zgmini-e1-r5-g2-r38-%RANDOM%-%RANDOM%"

if /I "%~1"=="--worker" goto :worker

call "%~f0" --worker > "%LOG%" 2>&1
set "RC=%ERRORLEVEL%"
type "%LOG%"
echo.
echo [LOG] %LOG%
exit /b %RC%

:worker
echo ============================================================
echo ZGMINI E1-R5 G2 R38 RUNTIME VALIDATION
echo ============================================================
echo [TARGET_BRANCH] %TARGET_BRANCH%
echo [MODE] RESEARCH-ONLY / LOCAL STORED SEC SOURCE
echo [PROVIDER_FETCH] 0
echo [DB_D1_WRITE] 0
echo [PRODUCTION_ACTIVATION] NO
echo [BASE] %BASE%
echo [STARTED] %DATE% %TIME%
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [AUTOMATION_BLOCKED] git.exe not found in PATH.
  exit /b 2
)
where node >nul 2>&1
if errorlevel 1 (
  echo [AUTOMATION_BLOCKED] node.exe not found in PATH.
  exit /b 2
)

git rev-parse --show-toplevel >nul 2>&1
if errorlevel 1 (
  echo [AUTOMATION_BLOCKED] Run this CMD from any existing ZGMINI Git worktree.
  exit /b 2
)

git remote get-url %TARGET_REMOTE% >nul 2>&1
if errorlevel 1 (
  echo [AUTOMATION_BLOCKED] Git remote "%TARGET_REMOTE%" is not configured.
  exit /b 2
)

echo ==================== REMOTE SOURCE ====================
git fetch %TARGET_REMOTE% %TARGET_BRANCH%
if errorlevel 1 (
  echo [AUTOMATION_BLOCKED] Could not fetch target branch.
  exit /b 2
)
for /f "delims=" %%S in ('git rev-parse FETCH_HEAD') do set "TARGET_SHA=%%S"
if not defined TARGET_SHA (
  echo [AUTOMATION_BLOCKED] Could not resolve fetched target SHA.
  exit /b 2
)
echo [REMOTE_BRANCH_SHA] %TARGET_SHA%

echo ==================== ISOLATED WORKTREE ====================
git worktree add --detach "%WT%" %TARGET_SHA%
if errorlevel 1 (
  echo [AUTOMATION_BLOCKED] Could not create isolated worktree.
  exit /b 2
)
cd /d "%WT%"
if errorlevel 1 (
  echo [AUTOMATION_BLOCKED] Could not enter isolated worktree.
  exit /b 2
)
for /f "delims=" %%S in ('git rev-parse HEAD') do set "WORK_SHA=%%S"
echo [WORK_SHA] %WORK_SHA%
if /I not "%WORK_SHA%"=="%TARGET_SHA%" (
  echo [BLOCKED] Isolated worktree SHA does not match fetched target SHA.
  exit /b 5
)

echo ==================== R38 TARGET TEST ====================
node --test tests\earnings-r5-forward-readiness-r4.test.mjs
set "TEST_RC=%ERRORLEVEL%"
echo [R38_TARGET_TEST_EXIT_CODE] %TEST_RC%
if not "%TEST_RC%"=="0" (
  echo [RUNTIME_FAILED] R38 target test failed. STOP.
  goto :finish_fail
)

echo ==================== R36 STORED AUDIT CONTRACT ====================
node -e "const fs=require('fs'),path=require('path');const p=path.join(process.env.USERPROFILE,'.zgmini','pc-writer','manual-input','e1-r5','reports','e1-r5-sec-cross-filing-audit-last.json');if(!fs.existsSync(p)){console.log('[BLOCKED] CROSS_REPORT_MISSING '+p);process.exit(5)}const r=JSON.parse(fs.readFileSync(p,'utf8')),a=r.audit||{};const ok=r.status==='PASS'&&a.currentIssuerCount===499&&a.comparableIssuerCount===19&&a.currentParse&&a.currentParse.readyIssuers===43&&a.currentParse.ambiguousIssuers===2&&a.currentParse.noGuidanceIssuers===456&&a.directions&&a.directions.up===16&&a.directions.same===2&&a.directions.down===1&&Math.abs(a.s12aRaw-0.013186813186813062)<1e-15&&Math.abs(a.s13Raw-0.7894736842105263)<1e-15;console.log(JSON.stringify({status:ok?'PASS':'MISMATCH',asOf:r.asOf,currentIssuerCount:a.currentIssuerCount,currentGuidance:a.currentParse,comparableIssuerCount:a.comparableIssuerCount,s12aRaw:a.s12aRaw,s13Raw:a.s13Raw,directions:a.directions}));process.exit(ok?0:5)"
set "AUDIT_RC=%ERRORLEVEL%"
echo [R36_AUDIT_CONTRACT_EXIT_CODE] %AUDIT_RC%
if not "%AUDIT_RC%"=="0" (
  echo [BLOCKED] Stored cross-filing report is not the validated R36 contract. STOP without regenerating data.
  goto :finish_fail
)

echo ==================== CURRENT 19-PAIR SAMPLE ====================
call ZGMINI_EARNINGS_R5_SEC_MATCHING_SAMPLE_R1.cmd
set "SAMPLE_RC=%ERRORLEVEL%"
echo [R38_SAMPLE_EXIT_CODE] %SAMPLE_RC%
if not "%SAMPLE_RC%"=="0" goto :finish_fail

echo ==================== CURRENT SOURCE REVIEW ====================
call ZGMINI_EARNINGS_R5_SEC_MATCHING_SOURCE_REVIEW_R1.cmd
set "REVIEW_RC=%ERRORLEVEL%"
echo [R38_SOURCE_REVIEW_EXIT_CODE] %REVIEW_RC%
if not "%REVIEW_RC%"=="0" goto :finish_fail

echo ==================== R4 G2 EVIDENCE GATE ====================
call ZGMINI_EARNINGS_R5_FORWARD_READINESS_R4.cmd
set "R4_RC=%ERRORLEVEL%"
echo [R38_READINESS_R4_EXIT_CODE] %R4_RC%
if not "%R4_RC%"=="0" goto :finish_fail

echo ==================== FINAL READBACK ====================
if exist "%BASE%\manual-input\e1-r5\reports\e1-r5-forward-readiness-r4-last.txt" type "%BASE%\manual-input\e1-r5\reports\e1-r5-forward-readiness-r4-last.txt"
echo [R38_RUNTIME] PASS
echo [EXPECTED_G2_BEFORE_MANUAL_PASS] PARTIAL_AUTOMATED_EVIDENCE / MANUAL_REVIEW_EVIDENCE_MISSING
echo [PROVIDER_FETCH] 0
echo [DB_D1_WRITE] 0
echo [PRODUCTION_ACTIVATION] NO
set "FINAL_RC=0"
goto :cleanup

:finish_fail
echo [R38_RUNTIME] FAIL_OR_BLOCKED
set "FINAL_RC=5"

:cleanup
cd /d "%~dp0" >nul 2>&1
git worktree remove "%WT%" >nul 2>&1
if errorlevel 1 (
  echo [NON_BLOCKING] Temporary worktree cleanup did not complete: %WT%
) else (
  echo [WORKTREE_CLEANUP] PASS
)
echo [FINISHED] %DATE% %TIME%
exit /b %FINAL_RC%
