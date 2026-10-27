// R33 Stage 6 helper: one GET of ZGMINI's own already-public derived-score
// endpoint. Does not fetch underlying data vendors or change D1/PC data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const validate=[
 "const fs=require('node:fs')",
 "const cr=require('node:crypto')",
 "const p=require('node:path')",
 "const f=process.env.R33_PUBLIC_FILE",
 "const d=fs.readFileSync(f)",
 "if(d.length>5000000)throw Error('PUBLIC_JSON_TOO_LARGE')",
 "const x=JSON.parse(d)",
 "if(x.status!=='READY'||!Array.isArray(x.themes)||x.themes.length<7)throw Error('PUBLIC_BASELINE_NOT_READY')",
 "if(x.themes.some(t=>!Array.isArray(t.history)||!t.history.length))throw Error('PUBLIC_HISTORY_MISSING')",
 "const out={status:'R33_READONLY_PUBLIC_SNAPSHOT_SAVED',name:p.basename(f),sha256:cr.createHash('sha256').update(d).digest('hex'),observationDate:x.observationDate,sourceVersion:x.sourceVersion,phase:x.phase,themes:x.themes.map(t=>({name:t.theme,points:t.history.length,first:t.history[0].date,last:t.history.at(-1).date})),d1Writes:0,publicationWrites:0}",
 "console.log(JSON.stringify(out,null,2))"
].join(';');
if(validate.includes('"')||validate.length>7800)throw Error('CMD_INLINE_JS_UNSAFE');
const cmd=[
 '@echo off',
 'setlocal EnableExtensions DisableDelayedExpansion',
 'rem One READ-ONLY HTTPS GET of the existing public ZGMINI theme API.',
 'rem Existing scores and all PC source files remain unchanged.',
 'set "R33_PUBLIC_FILE=%~dp0THEME_NINE_R33_PUBLIC_BASELINE_%RANDOM%_%RANDOM%.json"',
 'set "R33_PUBLIC_LOG=%~dp0THEME_NINE_R33_PUBLIC_RESULT_%RANDOM%_%RANDOM%.txt"',
 'set "R33_NODE=node"',
 'if exist "E:\\ZGmini\\runtime\\node.exe" set "R33_NODE=E:\\ZGmini\\runtime\\node.exe"',
 'if exist "%R33_PUBLIC_FILE%" goto :collision',
 'if exist "%R33_PUBLIC_LOG%" goto :collision',
 '>"%R33_PUBLIC_LOG%" echo REPORT=THEME_NINE_R33_PUBLIC_SNAPSHOT_READONLY',
 '>>"%R33_PUBLIC_LOG%" echo BRANCH=codex/theme-fear-greed-integration-20261025',
 '>>"%R33_PUBLIC_LOG%" echo REQUEST=GET https://zgmini.kr/api/theme-fear-greed',
 '>>"%R33_PUBLIC_LOG%" echo PROVIDER_CALLS=0',
 '>>"%R33_PUBLIC_LOG%" echo D1_DATA_ROOT_SCHEDULER_FORMULA_PUBLICATION_WRITES=0',
 'curl.exe --fail --silent --show-error --location --max-time 25 --retry 0 --output "%R33_PUBLIC_FILE%" "https://zgmini.kr/api/theme-fear-greed" >>"%R33_PUBLIC_LOG%" 2>&1',
 'if errorlevel 1 goto :get_failed',
 '"%R33_NODE%" --version >>"%R33_PUBLIC_LOG%" 2>&1',
 'if errorlevel 1 goto :node_failed',
 `"%R33_NODE%" -e "${validate}" >>"%R33_PUBLIC_LOG%" 2>&1`,
 'if errorlevel 1 goto :invalid',
 'type "%R33_PUBLIC_LOG%"',
 'exit /b 0',
 ':get_failed',
 '>>"%R33_PUBLIC_LOG%" echo STATUS=STOP_PUBLIC_HTTP_NOT_AVAILABLE',
 'goto :done',
 ':node_failed',
 '>>"%R33_PUBLIC_LOG%" echo STATUS=STOP_NODE_MISSING',
 'goto :done',
 ':invalid',
 '>>"%R33_PUBLIC_LOG%" echo STATUS=STOP_PUBLIC_SNAPSHOT_INVALID',
 'goto :done',
 ':collision',
 'echo STATUS=STOP_PUBLIC_OUTPUT_COLLISION',
 'exit /b 2',
 ':done',
 'type "%R33_PUBLIC_LOG%"',
 'exit /b 1'
].join('\r\n')+'\r\n';
if(/[^\x00-\x7f]/.test(cmd)||cmd.includes('%TEMP%'))
 throw Error('CMD_ENCODING_OR_TEMP_VIOLATION');
const out=path.join(here,'THEME_NINE_R33_PUBLIC_BASELINE_READONLY.cmd');
fs.writeFileSync(out,cmd,'ascii');
if(fs.readFileSync(out,'ascii')!==cmd)throw Error('R33_CMD_READBACK_MISMATCH');
process.stdout.write(JSON.stringify({status:'R33_PUBLIC_CMD_ASCII_CRLF_PASS',
 bytes:Buffer.byteLength(cmd),url:'https://zgmini.kr/api/theme-fear-greed',
 d1Writes:0,providerCalls:0})+'\n');
