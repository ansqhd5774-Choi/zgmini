// Package R35's private incremental collector as one offline-created Windows CMD.
// User PC downloads only the CMD. It extracts SHA-verified source next to CMD,
// collects new provider pages in its own E: root, then deletes staging only.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const dest=path.join(here,'THEME_NINE_R35_DELTA_COLLECTION.cmd');
const sources=[
  ['CODE',fs.readFileSync(path.join(here,'theme-nine-r35-delta-collect.mjs')),
    'theme-nine-r35-delta-collect.mjs'],
  ['PREFLIGHT',fs.readFileSync(path.join(here,'theme-nine-r34-refresh-preflight.mjs')),
    'theme-nine-r34-refresh-preflight.mjs'],
  ['ROSTER',fs.readFileSync(path.resolve(here,'../../config/theme-nine-r20-approved-candidates.json')),
    'theme-nine-r20-approved-candidates.json']
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const segments=sources.map(([kind,bytes,name])=>({kind,bytes,name,hash:sha(bytes)}));
const js=[
  "const fs=require('node:fs')",
  "const cr=require('node:crypto')",
  "const p=require('node:path')",
  "const s=fs.readFileSync(process.env.R35_SELF,'ascii')",
  "const h=b=>cr.createHash('sha256').update(b).digest('hex')",
  "const section=n=>{const a='::R35_'+n+'_BEGIN',z='::R35_'+n+'_END';const i=s.lastIndexOf(a),j=s.indexOf(z,i+a.length);if(i<0||j<0)throw Error('BUNDLE_SECTION_MISSING_'+n);return Buffer.from(s.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64')}"
];
for(const seg of segments)js.push(`{const b=section('${seg.kind}');if(h(b)!=='${seg.hash}')throw Error('BUNDLE_SHA_MISMATCH_${seg.kind}');fs.writeFileSync(p.join(process.env.R35_STAGE,'${seg.name}'),b,{flag:'wx'})}`);
js.push("console.log('BUNDLE_SHA_VERIFIED=YES')");
const extract=js.join(';');
if(extract.includes('"')||extract.length>=7500)throw Error('R35_WINDOWS_COMMAND_TOO_LONG');
const lines=[
  '@echo off',
  'setlocal EnableExtensions DisableDelayedExpansion',
  'rem R35: incremental private price pages only; immutable R23 is read only.',
  'rem No D1, score/publication, existing scheduler or R23 original changes.',
  'rem R35 staging and output remain next to this single CMD; no TEMP directory.',
  'set "R35_SELF=%~f0"',
  'set "R35_FOLDER=%~dp0"',
  'set "R35_STAGE=%~dp0R35_STAGE_%RANDOM%_%RANDOM%"',
  'set "R35_LOG=%~dp0THEME_NINE_R35_DELTA_COLLECTION_%RANDOM%_%RANDOM%.txt"',
  'set "R35_JSON_RESULT=%~dp0THEME_NINE_R35_DELTA_COLLECTION_%RANDOM%_%RANDOM%.json"',
  'set "R35_NODE=node"',
  'if exist "E:\\ZGmini\\runtime\\node.exe" set "R35_NODE=E:\\ZGmini\\runtime\\node.exe"',
  'if exist "%R35_STAGE%" goto :collision',
  'if exist "%R35_LOG%" goto :collision',
  'if exist "%R35_JSON_RESULT%" goto :collision',
  'mkdir "%R35_STAGE%"',
  'if errorlevel 1 goto :mkdir_failed',
  '>"%R35_LOG%" echo REPORT=THEME_NINE_R35_DELTA_PRIVATE_COLLECTION',
  '>>"%R35_LOG%" echo BASE_R23_DB_D1_SCHEDULER_PUBLICATION_WRITES=0',
  '>>"%R35_LOG%" echo WINDOW_NY=2026-10-23_TO_2026-10-26',
  '"%R35_NODE%" --version >>"%R35_LOG%" 2>&1',
  'if errorlevel 1 goto :node_failed',
  `"%R35_NODE%" -e "${extract}" >>"%R35_LOG%" 2>&1`,
  'if errorlevel 1 goto :extract_failed',
  '"%R35_NODE%" "%R35_STAGE%\\theme-nine-r35-delta-collect.mjs" --collect-auto 2026-10-23 2026-10-26 >"%R35_JSON_RESULT%" 2>>"%R35_LOG%"',
  'set "R35_RC=%ERRORLEVEL%"',
  'if exist "%R35_JSON_RESULT%" type "%R35_JSON_RESULT%" >>"%R35_LOG%"',
  'goto :cleanup',
  ':node_failed',
  '>>"%R35_LOG%" echo STATUS=NODE_UNAVAILABLE',
  'set "R35_RC=1"',
  'goto :cleanup',
  ':extract_failed',
  '>>"%R35_LOG%" echo STATUS=EMBEDDED_SHA_OR_EXTRACTION_FAILED',
  'set "R35_RC=1"',
  'goto :cleanup',
  ':mkdir_failed',
  '>"%R35_LOG%" echo STATUS=R35_STAGE_CREATE_FAILED',
  'set "R35_RC=1"',
  'goto :cleanup',
  ':collision',
  'echo STATUS=R35_RESULT_OR_STAGE_NAME_COLLISION',
  'exit /b 2',
  ':cleanup',
  'if exist "%R35_STAGE%\\theme-nine-r35-delta-collect.mjs" del /q "%R35_STAGE%\\theme-nine-r35-delta-collect.mjs"',
  'if exist "%R35_STAGE%\\theme-nine-r34-refresh-preflight.mjs" del /q "%R35_STAGE%\\theme-nine-r34-refresh-preflight.mjs"',
  'if exist "%R35_STAGE%\\theme-nine-r20-approved-candidates.json" del /q "%R35_STAGE%\\theme-nine-r20-approved-candidates.json"',
  'if exist "%R35_STAGE%" rmdir "%R35_STAGE%"',
  'type "%R35_LOG%"',
  'exit /b %R35_RC%'
];
for(const seg of segments){
  lines.push(`::R35_${seg.kind}_BEGIN`);
  lines.push(...seg.bytes.toString('base64').match(/.{1,128}/g).map(s=>'::'+s));
  lines.push(`::R35_${seg.kind}_END`);
}
const content=lines.join('\r\n')+'\r\n';
if(/[^\x00-\x7F]/.test(content)||/(?<!\r)\n/.test(content))throw Error('R35_CMD_NOT_ASCII_CRLF');
fs.writeFileSync(dest,content);
process.stdout.write(JSON.stringify({file:path.basename(dest),bytes:Buffer.byteLength(content),
  sources:segments.map(s=>({kind:s.kind,sha256:s.hash})),
  privateOnly:true,baseR23Writes:0,publicationWrites:0})+'\n');
