@echo off
setlocal
cd /d "%~dp0"
set "R37_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%R37_NODE%" (
  echo STOP=APPROVED_NODE_RUNTIME_MISSING
  echo EXPECTED=%R37_NODE%
  exit /b 2
)
if not exist "..\STAGE04_R35_FOUR_MEDIA_CAGR_MATRIX_20261026.md" (
  echo STOP=R35_URL_SEED_DOCUMENT_MISSING
  exit /b 3
)
echo REPORT=STAGE04_R37_FOUR_MEDIA_OLLAMA_READONLY
echo MODEL=gemma3:4b
echo MODE=RESEARCH_ONLY_NO_SCORES_OR_TRADES
if /I "%~1"=="PILOT" (
  echo SCOPE=PILOT_FIRST_3_ROWS_X_4_PUBLISHERS
  "%R37_NODE%" "stage04-four-publisher-r37-readonly.mjs" --limit=3 --model=gemma3:4b
) else (
  echo SCOPE=FULL_21_ROWS_X_4_PUBLISHERS
  "%R37_NODE%" "stage04-four-publisher-r37-readonly.mjs" --all --model=gemma3:4b
)
if errorlevel 1 (
  echo STOP=R37_EXECUTION_FAILED
  exit /b 1
)
echo NEXT=REVIEW_RESULT_CSV_AND_JSON_BESIDE_THIS_CMD
endlocal
