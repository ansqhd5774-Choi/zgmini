@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R58 read-only, maximum three SPY hourly GETs, no schedule/DB/score writes.
set "R58_HERE=%~dp0"
set "R58_NODE=E:\ZGmini\runtime\node.exe"
set "R58_SCRIPT=%R58_HERE%theme-nine-r58-alpaca-readonly-probe.mjs"
set "R58_LOG=%R58_HERE%THEME_NINE_R58_ALPACA_READONLY_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%R58_LOG%" goto collision
>"%R58_LOG%" echo REPORT=THEME_NINE_R58_ALPACA_READONLY
>>"%R58_LOG%" echo PRICE_MODE_APPROVAL=NOT_GRANTED
>>"%R58_LOG%" echo PROVIDER_REQUEST_BUDGET=3
>>"%R58_LOG%" echo RAW_DB_D1_SCHEDULE_FORMULA_WRITES=0
if not exist "%R58_NODE%" goto missing
if not exist "%R58_SCRIPT%" goto missing
"%R58_NODE%" -e "const fs=require('fs'),c=require('crypto');const h=c.createHash('sha256').update(fs.readFileSync(process.argv[1])).digest('hex');if(h!=='f95fd87a355744f13adbcdb09665d0829e45db3645a79405ea406f136dcc483c')process.exitCode=5" "%R58_SCRIPT%" >>"%R58_LOG%" 2>&1
if errorlevel 1 goto integrity
"%R58_NODE%" "%R58_SCRIPT%" --probe >>"%R58_LOG%" 2>&1
set "R58_RC=%ERRORLEVEL%"
>>"%R58_LOG%" echo PROBE_EXIT=%R58_RC%
if not "%R58_RC%"=="0" goto failed
>>"%R58_LOG%" echo RESULT=READONLY_PROBE_FINISHED_NOT_PUBLISHED
goto done

:missing
>>"%R58_LOG%" echo RESULT=STOP_NODE_OR_SCRIPT_MISSING
goto done

:integrity
>>"%R58_LOG%" echo RESULT=STOP_R58_SCRIPT_SHA256_MISMATCH
goto done

:failed
>>"%R58_LOG%" echo RESULT=STOP_PROBE_FAILED_NO_PUBLIC_CHANGES
goto done

:collision
echo RESULT=STOP_LOG_FILENAME_COLLISION
pause
exit /b 3

:done
echo RESULT_FILE=%R58_LOG%
type "%R58_LOG%"
pause
exit /b 0
