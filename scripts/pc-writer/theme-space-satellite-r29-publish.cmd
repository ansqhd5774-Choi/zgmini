@echo off
setlocal DisableDelayedExpansion
rem R29: approved four-ETF score -> new D1 key -> exact public readback.
rem This CMD belongs in the root of the packaged source tree, next to scripts/.
rem Existing nine theme keys, scheduled tasks, and raw data are untouched.
set "SPACE29_NODE=E:\ZGmini\runtime\node.exe"
set "SPACE29_DATA=E:\ZGmini\data"
set "SPACE29_SCRIPT=%~dp0scripts\pc-writer\theme-space-satellite-publish-r29.mjs"
set "SPACE29_LOG=%~dp0SPACE_SATELLITE_R29_PUBLICATION_RESULT.txt"
>"%SPACE29_LOG%" echo REPORT=SPACE_SATELLITE_R29_PUBLICATION
>>"%SPACE29_LOG%" echo STARTED=%DATE% %TIME%
>>"%SPACE29_LOG%" echo APPROVED_ETFS=UFO_NASA_WARP_ROKT
>>"%SPACE29_LOG%" echo NEW_D1_KEY=theme-space-satellite-r1
>>"%SPACE29_LOG%" echo NEW_AUM_API=NO
>>"%SPACE29_LOG%" echo EXISTING_NINE_THEME_MUTATIONS=NO
if not exist "%SPACE29_NODE%" goto node_missing
if not exist "%SPACE29_DATA%" goto data_missing
if not exist "%SPACE29_SCRIPT%" goto script_missing
if not exist "%~dp0worker\theme-space-satellite-r1.mjs" goto script_missing
set "ZGMINI_DATA_ROOT=%SPACE29_DATA%"
>>"%SPACE29_LOG%" echo PHASE=SHA_VERIFIED_STORED_PC_AUDIT
"%SPACE29_NODE%" "%~dp0scripts\pc-writer\theme-space-satellite-operational-r28.mjs" --audit >>"%SPACE29_LOG%" 2>&1
if errorlevel 1 goto audit_failed
>>"%SPACE29_LOG%" echo PHASE=DEDICATED_NEW_THEME_D1_CAS_AND_PUBLIC_READBACK
"%SPACE29_NODE%" "%SPACE29_SCRIPT%" --once --publish >>"%SPACE29_LOG%" 2>&1
if errorlevel 1 goto publish_failed
>>"%SPACE29_LOG%" echo CMD_RESULT=FINISHED_READ_REPORT_FOR_PUBLIC_API_STATUS
type "%SPACE29_LOG%"
exit /b 0
:node_missing
>>"%SPACE29_LOG%" echo CMD_RESULT=STOP_PC_NODE_MISSING
goto stopped
:data_missing
>>"%SPACE29_LOG%" echo CMD_RESULT=STOP_APPROVED_PC_DATA_MISSING
goto stopped
:script_missing
>>"%SPACE29_LOG%" echo CMD_RESULT=STOP_PACKAGE_INCOMPLETE
goto stopped
:audit_failed
>>"%SPACE29_LOG%" echo CMD_RESULT=STOP_PRIVATE_RAW_AUDIT_FAILED
goto stopped
:publish_failed
>>"%SPACE29_LOG%" echo CMD_RESULT=STOP_PUBLICATION_CHECK_FAILED
:stopped
type "%SPACE29_LOG%"
exit /b 1
