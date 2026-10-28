@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "NODE_EXE=node"
if exist "E:\ZGmini\runtime\node.exe" set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "CMD_LOG=%SCRIPT_DIR%STAGE05_R87_CMD_%RANDOM%_%RANDOM%.log"
if "%~1"=="" (
  "%NODE_EXE%" "%SCRIPT_DIR%stage05-pc-results-collector.mjs" --root "%SCRIPT_DIR%.." --extra-root "E:\ZGmini\projects" --extra-root "E:\ZGmini\data\investment-15-stage" --output-dir "%SCRIPT_DIR%." >"%CMD_LOG%" 2>&1
) else (
  "%NODE_EXE%" "%SCRIPT_DIR%stage05-pc-results-collector.mjs" --root "%SCRIPT_DIR%.." --extra-root "E:\ZGmini\projects" --extra-root "E:\ZGmini\data\investment-15-stage" --extra-root "%~1" --output-dir "%SCRIPT_DIR%." >"%CMD_LOG%" 2>&1
)
set "RUN_RESULT=%ERRORLEVEL%"
type "%CMD_LOG%"
echo STAGE05_R87_CMD_LOG=%CMD_LOG%
echo STATUS_CODE=%RUN_RESULT%  (0=results ready, 2=source files missing, 1=execution error)
echo Please send STAGE05_R87_CMD_*.log and STAGE05_R87_PC_LOG_*.json to the assistant.
pause
exit /b %RUN_RESULT%
