@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Existing approved R48 collection and R54 D1 publication, one manual cycle.
rem Does not change scheduled tasks, formulas, roster, raw history or main.
set "R55_ROOT=%~dp0"
set "R55_NODE=E:\ZGmini\runtime\node.exe"
set "R55_R48=E:\ZGmini\data\pc-writer\theme-nine-r48\THEME_NINE_R48_PRIVATE_CYCLE.cmd"
set "R55_R54=E:\ZGmini\data\pc-writer\theme-nine-r54\scripts\pc-writer\THEME_NINE_R54_PUBLIC_CYCLE.cmd"
set "R55_LOG=%R55_ROOT%THEME_NINE_R55_PUBLISH_NOW_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%R55_LOG%" goto :collision
>"%R55_LOG%" echo REPORT=THEME_NINE_R55_EXISTING_PIPELINE_PUBLISH_NOW
>>"%R55_LOG%" echo STARTED=%DATE% %TIME%
>>"%R55_LOG%" echo EXISTING_R48_R54_CODE_ONLY=YES
>>"%R55_LOG%" echo FORMULA_CHANGES=0
>>"%R55_LOG%" echo SCHEDULE_CHANGES=0
if not exist "%R55_NODE%" goto :missing
if not exist "%R55_R48%" goto :missing
if not exist "%R55_R54%" goto :missing

>>"%R55_LOG%" echo STAGE=R48_PRIVATE_COLLECTION_AND_CANDIDATE
call "%R55_R48%" >>"%R55_LOG%" 2>&1
set "R55_R48_RC=%ERRORLEVEL%"
>>"%R55_LOG%" echo R48_EXIT=%R55_R48_RC%

rem The R54 writer has its own eligibility/CAS/read-back safeguards.
rem Attempt even if the collection step stopped: previously verified R48
rem candidates may already cover all currently published dates.
>>"%R55_LOG%" echo STAGE=R54_D1_PUBLISH_AND_READBACK
call "%R55_R54%" >>"%R55_LOG%" 2>&1
set "R55_R54_RC=%ERRORLEVEL%"
>>"%R55_LOG%" echo R54_EXIT=%R55_R54_RC%

>>"%R55_LOG%" echo STAGE=LIVE_PUBLIC_API_INDEPENDENT_VERIFICATION
"%R55_NODE%" -e "const u='https://zgmini.kr/api/theme-fear-greed/?r55='+Date.now();fetch(u,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)}).then(async r=>{if(!r.ok)throw Error('HTTP_'+r.status);const j=await r.json();const good=j.status==='READY'&&j.modelRevision==='THEME_LEGACY_NINE_R37_PUBLIC_V1'&&j.themes?.length===10&&j.themes.every(t=>t.history?.length===252);console.log(JSON.stringify({status:j.status,modelRevision:j.modelRevision??null,methodologyVersion:j.methodologyVersion,confirmedObservationDate:j.confirmedObservationDate??null,provisionalDates:j.provisional?.points?.map(p=>p.date)??[],visibleThemes:j.themes?.length??0,publicR32Verified:good}));if(!good)process.exitCode=5}).catch(e=>{console.error('PUBLIC_API_CHECK_ERROR='+e.message);process.exitCode=6})" >>"%R55_LOG%" 2>&1
set "R55_LIVE_RC=%ERRORLEVEL%"
>>"%R55_LOG%" echo PUBLIC_API_CHECK_EXIT=%R55_LIVE_RC%
if not "%R55_LIVE_RC%"=="0" goto :not_published
>>"%R55_LOG%" echo RESULT=PUBLIC_R32_LIVE_VERIFIED
set "R55_EXIT=0"
goto :done

:missing
>>"%R55_LOG%" echo RESULT=STOP_INSTALLED_R48_R54_OR_NODE_MISSING
set "R55_EXIT=2"
goto :done

:not_published
>>"%R55_LOG%" echo RESULT=NOT_YET_PUBLIC_CHECK_R48_R54_DETAILS
set "R55_EXIT=5"
goto :done

:collision
echo RESULT=STOP_RESULT_FILENAME_COLLISION
pause
exit /b 3

:done
echo RESULT_FILE=%R55_LOG%
type "%R55_LOG%"
pause
exit /b %R55_EXIT%
