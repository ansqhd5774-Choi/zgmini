@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "TASK_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "TASK_NODE=E:\ZGmini\runtime\node.exe"
set "TASK_INVENTORY=%~dp0theme-data-inventory.mjs"
set "TASK_DATA_ROOT=E:\ZGmini\data"
set "TASK_RESULT=%~dp0THEME_NINE_BASELINE_R1_RESULT.txt"
>"%TASK_RESULT%" echo REPORT=THEME_NINE_BASELINE_R1_READ_ONLY
>>"%TASK_RESULT%" echo TARGET=EXISTING_NINE_OPERATIONS_WITH_FULL_REGISTRY_INVENTORY
>>"%TASK_RESULT%" echo SOURCE=PC_STORED_DATA_AND_TASKS
>>"%TASK_RESULT%" echo MODIFICATIONS=NONE
if not exist "%TASK_INVENTORY%" (
  >>"%TASK_RESULT%" echo ERROR=THEME_DATA_INVENTORY_SCRIPT_NOT_FOUND
  type "%TASK_RESULT%"
  exit /b 1
)
if not exist "%TASK_DATA_ROOT%" (
  >>"%TASK_RESULT%" echo ERROR=APPROVED_E_DATA_ROOT_NOT_FOUND
  type "%TASK_RESULT%"
  exit /b 1
)
>>"%TASK_RESULT%" echo PHASE=FILE_AND_MANIFEST_INVENTORY
"%TASK_NODE%" "%TASK_INVENTORY%" --data-root "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1
set "TASK_INVENTORY_EXIT=%ERRORLEVEL%"
>>"%TASK_RESULT%" echo INVENTORY_EXIT=%TASK_INVENTORY_EXIT%
>>"%TASK_RESULT%" echo PHASE=SCHEDULE_READ_ONLY
for %%N in (ZGMINI-PC-GetMarketHistory-ETF ZGMINI-PC-MarketParquet-ETF ZGMINI-PC-Theme-AI-Semiconductor ZGMINI-PC-Theme-Biotech) do (
  >>"%TASK_RESULT%" echo TASK=%%N
  schtasks /Query /TN "%%N" /FO LIST >>"%TASK_RESULT%" 2>&1
)
>>"%TASK_RESULT%" echo PUBLIC_D1_AND_PROVIDER=NOT_QUERIED
>>"%TASK_RESULT%" echo STATUS=PC_READ_ONLY_EVIDENCE_ONLY
type "%TASK_RESULT%"
exit /b 0
