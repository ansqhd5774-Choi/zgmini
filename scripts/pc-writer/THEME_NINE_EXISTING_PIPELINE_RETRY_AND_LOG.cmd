@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem One manual cycle of the ALREADY APPROVED R48/R54 pipeline.
rem Collect its underlying logs so a successful CMD exit cannot be mistaken for D1 publication.
rem Do not alter ETF membership, scores, formula, source, task schedules, or Git branches.
set "RTRY_ROOT=%~dp0"
set "RTRY_NODE=E:\ZGmini\runtime\node.exe"
set "RTRY_R48=E:\ZGmini\data\pc-writer\theme-nine-r48\THEME_NINE_R48_PRIVATE_CYCLE.cmd"
set "RTRY_R54=E:\ZGmini\data\pc-writer\theme-nine-r54\scripts\pc-writer\THEME_NINE_R54_PUBLIC_CYCLE.cmd"
set "RTRY_R48_LOGS=E:\ZGmini\data\pc-writer\theme-nine-r48"
set "RTRY_R54_LOGS=E:\ZGmini\data\pc-writer\theme-nine-r54\logs"
set "RTRY_OUT=%RTRY_ROOT%THEME_NINE_EXISTING_PIPELINE_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%RTRY_OUT%" goto :collision
>"%RTRY_OUT%" echo REPORT=THEME_NINE_EXISTING_APPROVED_PIPELINE_RETRY_AND_LOG
>>"%RTRY_OUT%" echo STARTED=%DATE% %TIME%
>>"%RTRY_OUT%" echo FORMULA_ROSTER_SOURCE_SCHEDULE_BRANCH_CHANGES=0
>>"%RTRY_OUT%" echo PUBLIC_PROVISIONAL_DEFINITION_CHANGES=0
if not exist "%RTRY_NODE%" goto :missing
if not exist "%RTRY_R48%" goto :missing
if not exist "%RTRY_R54%" goto :missing

>>"%RTRY_OUT%" echo STAGE=R48_APPROVED_PRIVATE_COLLECTION
call "%RTRY_R48%" >>"%RTRY_OUT%" 2>&1
set "RTRY_R48_RC=%ERRORLEVEL%"
>>"%RTRY_OUT%" echo R48_EXIT=%RTRY_R48_RC%

>>"%RTRY_OUT%" echo STAGE=R54_APPROVED_D1_PUBLISH_GATE
call "%RTRY_R54%" >>"%RTRY_OUT%" 2>&1
set "RTRY_R54_RC=%ERRORLEVEL%"
>>"%RTRY_OUT%" echo R54_EXIT=%RTRY_R54_RC%

>>"%RTRY_OUT%" echo STAGE=R48_LATEST_DETAILED_LOG
set "RTRY_R48_LAST="
if exist "%RTRY_R48_LOGS%\" for /f "delims=" %%F in ('dir /b /a:-d /o:-d "%RTRY_R48_LOGS%\THEME_NINE_R48_PRIVATE_CYCLE_*.txt" 2^>nul') do if not defined RTRY_R48_LAST set "RTRY_R48_LAST=%%F"
if defined RTRY_R48_LAST (type "%RTRY_R48_LOGS%\%RTRY_R48_LAST%" >>"%RTRY_OUT%" 2>&1) else (>>"%RTRY_OUT%" echo R48_DETAILED_LOG=NOT_FOUND)

>>"%RTRY_OUT%" echo STAGE=R54_LATEST_DETAILED_LOG
set "RTRY_R54_LAST="
if exist "%RTRY_R54_LOGS%\" for /f "delims=" %%F in ('dir /b /a:-d /o:-d "%RTRY_R54_LOGS%\THEME_NINE_R54_CYCLE_*.txt" 2^>nul') do if not defined RTRY_R54_LAST set "RTRY_R54_LAST=%%F"
if defined RTRY_R54_LAST (type "%RTRY_R54_LOGS%\%RTRY_R54_LAST%" >>"%RTRY_OUT%" 2>&1) else (>>"%RTRY_OUT%" echo R54_DETAILED_LOG=NOT_FOUND)

>>"%RTRY_OUT%" echo STAGE=PUBLIC_API_READ_ONLY_VERIFICATION
"%RTRY_NODE%" -e "const u='https://zgmini.kr/api/theme-fear-greed/?existing='+Date.now();fetch(u,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)}).then(async r=>{if(!r.ok)throw Error('HTTP_'+r.status);const j=await r.json();const good=j.status==='READY'&&j.modelRevision==='THEME_LEGACY_NINE_R37_PUBLIC_V1'&&j.themes?.length===10&&j.themes.every(t=>t.history?.length===252);console.log(JSON.stringify({status:j.status,modelRevision:j.modelRevision??null,methodologyVersion:j.methodologyVersion,confirmedObservationDate:j.confirmedObservationDate??null,provisionalDates:j.provisional?.points?.map(p=>p.date)??[],visibleThemes:j.themes?.length??0,publicR32Verified:good}));if(!good)process.exitCode=5}).catch(e=>{console.error('PUBLIC_API_CHECK_ERROR='+e.message);process.exitCode=6})" >>"%RTRY_OUT%" 2>&1
set "RTRY_PUBLIC_RC=%ERRORLEVEL%"
>>"%RTRY_OUT%" echo PUBLIC_API_CHECK_EXIT=%RTRY_PUBLIC_RC%
if not "%RTRY_PUBLIC_RC%"=="0" goto :not_published
>>"%RTRY_OUT%" echo RESULT=PUBLIC_R32_LIVE_VERIFIED
set "RTRY_EXIT=0"
goto :done

:missing
>>"%RTRY_OUT%" echo RESULT=STOP_EXISTING_NODE_OR_R48_R54_MISSING
set "RTRY_EXIT=2"
goto :done

:not_published
>>"%RTRY_OUT%" echo RESULT=NOT_YET_PUBLIC_READ_R48_R54_DETAILS_ABOVE
set "RTRY_EXIT=5"
goto :done

:collision
echo RESULT=STOP_LOG_FILENAME_COLLISION
pause
exit /b 3

:done
echo RESULT_FILE=%RTRY_OUT%
type "%RTRY_OUT%"
pause
exit /b %RTRY_EXIT%
