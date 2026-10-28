@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R43: read-only diagnosis of the existing R42 preflight. NEVER writes D1.
set "R43_NODE=E:\ZGmini\runtime\node.exe"
set "R43_STAGE=%TEMP%\ZGMINI_IRAN_NEWS_R42_RUNTIME_FIX2"
set "R43_RESULT=%~dp0IRAN_NEWS_R43_READ_ONLY_DIAG_RESULT.txt"
if exist "%R43_RESULT%" goto result_exists
> "%R43_RESULT%" echo R43_READ_ONLY_DIAG_STARTED=YES
if errorlevel 1 goto log_failed
>> "%R43_RESULT%" echo D1_WRITES=DISABLED
if not exist "%R43_NODE%" goto node_missing
if not exist "%R43_STAGE%\scripts\pc-writer\d1.mjs" goto stage_missing

"%R43_NODE%" --input-type=module -e "import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';const safe=e=>{const m=String(e?.message||'');if(/^[A-Z0-9_]{3,90}$/.test(m))return m;const code=String(e?.code||'');return /^[A-Z0-9_]{3,35}$/.test(code)?code:'UNKNOWN'};const home=os.homedir();const cp=path.join(home,'.zgmini','pc-writer','config.json');const op=path.join(home,'AppData','Roaming','xdg.config','.wrangler','config','default.toml');console.log('CONFIG_PRESENT='+fs.existsSync(cp));console.log('OAUTH_PRESENT='+fs.existsSync(op));console.log('ENV_TOKEN_PRESENT='+Boolean(process.env.CLOUDFLARE_API_TOKEN));if(!fs.existsSync(cp)){console.log('READ_DIAG=CONFIG_MISSING');process.exit(2)}let cfg;try{cfg=JSON.parse(fs.readFileSync(cp,'utf8'))}catch(e){console.log('READ_DIAG=CONFIG_PARSE_FAILED');process.exit(2)}const stage=process.env.R43_STAGE;const p=await import(pathToFileURL(path.join(stage,'scripts','pc-writer','d1.mjs')).href);let token;try{token=p.credential(stage)}catch(e){console.log('AUTH_REASON='+safe(e));console.log('READ_DIAG=AUTH_FAILED');process.exit(2)}let remote;try{remote=p.client(cfg,token)}catch(e){console.log('CLIENT_REASON='+safe(e));console.log('READ_DIAG=CLIENT_CONFIG_FAILED');process.exit(2)}try{const r=await remote.query(cfg.core,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',['public:iran-progress:news:iran:r1']);console.log('R1_ROWS='+(r?.results?.length??0));const body=r?.results?.[0]?.body??'{}';let version='INVALID_JSON';try{version=JSON.parse(body).version??'MISSING'}catch{}console.log('R1_VERSION='+version)}catch(e){console.log('D1_READ_REASON='+safe(e));console.log('READ_DIAG=D1_READ_FAILED');process.exit(2)}try{const r42=await import(pathToFileURL(path.join(stage,'scripts','iran-progress','news-metadata-d1-once-r42.mjs')).href);const r=await r42.r42Preflight({remote,db:cfg.core});console.log('PREFLIGHT_STATUS='+r.status);console.log('READ_DIAG=PREFLIGHT_PASSED')}catch(e){console.log('PREFLIGHT_REASON='+safe(e));console.log('READ_DIAG=PREFLIGHT_FAILED');process.exit(2)}" >> "%R43_RESULT%" 2>&1
if errorlevel 1 goto read_diag_failed
>> "%R43_RESULT%" echo FINAL_STATUS=READ_ONLY_DIAGNOSTIC_SUCCEEDED
echo Read-only diagnosis complete. Upload IRAN_NEWS_R43_READ_ONLY_DIAG_RESULT.txt.
pause
exit /b 0

:read_diag_failed
>> "%R43_RESULT%" echo FINAL_STATUS=READ_ONLY_DIAGNOSTIC_IDENTIFIED_FAILURE
echo Read-only diagnosis recorded. Upload IRAN_NEWS_R43_READ_ONLY_DIAG_RESULT.txt.
pause
exit /b 2
:stage_missing
>> "%R43_RESULT%" echo FINAL_STATUS=R42_STAGE_MISSING_NO_D1_WRITE
echo R42 downloaded runtime not found. Upload result.
pause
exit /b 1
:node_missing
>> "%R43_RESULT%" echo FINAL_STATUS=EXISTING_NODE_MISSING_NO_D1_WRITE
echo Existing Node not found. Upload result.
pause
exit /b 1
:result_exists
echo Diagnostic result already exists. Do not overwrite: "%R43_RESULT%"
pause
exit /b 1
:log_failed
echo Unable to create diagnostic log. Move CMD to Downloads and retry once.
pause
exit /b 1
