import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const input=fs.readFileSync(path.join(here,'theme-nine-r62-readonly-diagnose.mjs'));
const hex=bytes=>createHash('sha256').update(bytes).digest('hex');
const target=path.join(here,'THEME_NINE_R62_READONLY_DIAGNOSE.cmd');
const installJs=[
 "const fs=require('node:fs')",
 "const p=require('node:path')",
 "const h=b=>require('node:crypto').createHash('sha256').update(b).digest('hex')",
 "const s=fs.readFileSync(process.env.R62_SELF,'ascii')",
 "const x=s.lastIndexOf('::R62_SOURCE_BEGIN')",
 "const y=s.indexOf('::R62_SOURCE_END',x+19)",
 "if(x<0||y<0)throw Error('R62_EMBED_MISSING')",
 "const b=Buffer.from(s.slice(x+19,y).replace(/[^A-Za-z0-9+/=]/g,''),'base64')",
 `if(h(b)!=='${hex(input)}')throw Error('R62_SOURCE_SHA')`,
 "const root=fs.realpathSync(process.env.R62_ROOT)",
 "const file=p.join(root,'scripts','pc-writer','theme-nine-r62-readonly-diagnose.mjs')",
 "if(!file.startsWith(root+p.sep))throw Error('R62_PATH_ESCAPE')",
 "if(fs.existsSync(file)){if(fs.lstatSync(file).isSymbolicLink()||h(fs.readFileSync(file))!==h(b))throw Error('R62_EXISTING_FILE_MISMATCH')}else{fs.writeFileSync(file,b,{flag:'wx'});if(h(fs.readFileSync(file))!==h(b))throw Error('R62_READBACK_SHA')}",
 "console.log('R62_DIAGNOSTIC_SOURCE_VERIFIED=YES')",
].join(';');
if(installJs.includes('"')||installJs.length>3500)throw Error('R62_CMD_EXTRACTOR_INVALID');
const lines=[
 '@echo off',
 'setlocal EnableExtensions DisableDelayedExpansion',
 'rem R62 read-only investigation of already-written R54 nine-theme D1 snapshot.',
 'rem Adds one diagnostic JS file only; NO R54 cycle; NO write/scheduler/source change.',
 'set "R62_SELF=%~f0"',
 'set "R62_ROOT=E:\\ZGmini\\data\\pc-writer\\theme-nine-r54"',
 'set "R62_NODE=E:\\ZGmini\\runtime\\node.exe"',
 'set "ZGMINI_DATA_ROOT=E:\\ZGmini\\data"',
 'set "R62_SCRIPT=%R62_ROOT%\\scripts\\pc-writer\\theme-nine-r62-readonly-diagnose.mjs"',
 'set "R62_LOG=%~dp0THEME_NINE_R62_READONLY_DIAGNOSE_RESULT_%RANDOM%_%RANDOM%.txt"',
 'if exist "%R62_LOG%" goto :collision',
 '>"%R62_LOG%" echo REPORT=R62_READ_ONLY_ALREADY_WRITTEN_D1_VS_LIVE_READER',
 '>>"%R62_LOG%" echo STARTED=%DATE% %TIME%',
 '>>"%R62_LOG%" echo D1_WRITE_ATTEMPTS=0',
 '>>"%R62_LOG%" echo TASK_FORMULA_SOURCE_ROSTER_CHANGES=0',
 'if not exist "%R62_NODE%" goto :missing',
 'if not exist "%R62_ROOT%\\scripts\\pc-writer\\theme-nine-r54-d1-client.mjs" goto :missing',
 `"%R62_NODE%" -e "${installJs}" >>"%R62_LOG%" 2>&1`,
 'if errorlevel 1 goto :install_error',
 '"%R62_NODE%" "%R62_SCRIPT%" --read-only >>"%R62_LOG%" 2>&1',
 'set "R62_RUN_EXIT=%ERRORLEVEL%"',
 '>>"%R62_LOG%" echo DIAGNOSTIC_EXIT=%R62_RUN_EXIT%',
 'if not "%R62_RUN_EXIT%"=="0" goto :failed',
 '>>"%R62_LOG%" echo RESULT=READ_ONLY_DIAGNOSTIC_COMPLETE',
 'set "R62_EXIT=0"',
 'goto :done',
 ':failed',
 '>>"%R62_LOG%" echo RESULT=READ_ONLY_DIAGNOSTIC_FAILED',
 'set "R62_EXIT=3"',
 'goto :done',
 ':missing',
 '>>"%R62_LOG%" echo RESULT=STOP_EXISTING_R54_OR_NODE_MISSING',
 'set "R62_EXIT=2"',
 'goto :done',
 ':install_error',
 '>>"%R62_LOG%" echo RESULT=STOP_SHA_VERIFICATION',
 'set "R62_EXIT=4"',
 'goto :done',
 ':collision',
 'echo RESULT=STOP_REPORT_FILENAME_COLLISION',
 'exit /b 5',
 ':done',
 'echo RESULT_FILE=%R62_LOG%',
 'type "%R62_LOG%"',
 'pause',
 'exit /b %R62_EXIT%',
 '::R62_SOURCE_BEGIN',
 ...input.toString('base64').match(/.{1,128}/g).map(x=>'::'+x),
 '::R62_SOURCE_END',
];
const data=lines.join('\r\n')+'\r\n';
if(/[^\x00-\x7f]/.test(data)||/(?<!\r)\n/.test(data))throw Error('R62_CMD_NOT_ASCII_CRLF');
fs.writeFileSync(target,data);
console.log(JSON.stringify({target,size:Buffer.byteLength(data),sha256:hex(Buffer.from(data)),sourceSha256:hex(input)}));
