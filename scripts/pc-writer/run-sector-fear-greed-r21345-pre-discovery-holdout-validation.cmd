@echo off
setlocal EnableExtensions DisableDelayedExpansion

echo ============================================================
echo ZGMINI SECTOR FEAR ^& GREED R2.13.45
echo PRE-DISCOVERY HOLDOUT VALIDATION - LOCAL ONLY
echo STARTED=%DATE% %TIME%
echo ============================================================
echo [SCOPE]
echo PROVIDER_CALLS=0
echo MODE=LOCAL_READ_ONLY_PRE_DISCOVERY_HOLDOUT
echo PUBLIC_MUTATION=NO
echo D1_MUTATION=NO
echo DB_SCHEMA_CHANGE=NO
echo PRODUCTION_FORMULA_CHANGE=NO
echo REFERENCE_REQUIREMENT_CHANGE=NO
echo APPROVED_R1_REFERENCE=756_UNCHANGED
echo NORMALIZATION_CHANGE=NO
echo WEIGHT_CHANGE=NO
echo REFERENCE_WINDOW_CHANGE=NO
echo SCHEDULER_CHANGE=NO
echo CANDIDATE_SELECTION=NO
echo OPTIONS_REPLACEMENT_SELECTION=NO
echo.

echo [1/2] R2.13.45 dedicated tests
node --test tests\sector-fear-greed-r21345-pre-discovery-holdout-validation.test.mjs
set "TEST_EXIT=%ERRORLEVEL%"
echo TEST_EXIT=%TEST_EXIT%
if not "%TEST_EXIT%"=="0" (
  echo STATUS=R21345_TEST_FAILED
  echo FINAL_EXIT_CODE=%TEST_EXIT%
  exit /b %TEST_EXIT%
)

echo [2/2] Local-only pre-discovery holdout validation
node scripts\pc-writer\sector-fear-greed-r21345-pre-discovery-holdout-validation.mjs
set "RUNTIME_EXIT=%ERRORLEVEL%"
echo RUNTIME_EXIT=%RUNTIME_EXIT%
if not "%RUNTIME_EXIT%"=="0" (
  echo STATUS=R21345_RUNTIME_FAILED
  echo FINAL_EXIT_CODE=%RUNTIME_EXIT%
  exit /b %RUNTIME_EXIT%
)

echo STATUS=R21345_COMPLETE
echo FINAL_EXIT_CODE=0
exit /b 0
