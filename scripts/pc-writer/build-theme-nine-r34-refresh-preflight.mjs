// Generate an offline, self-contained Windows CMD with SHA-checked R34 code/roster.
// Build only; generated CMD performs NO API/D1/scheduler/publication operations.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(here, 'THEME_NINE_R34_REFRESH_PREFLIGHT.cmd');
const sources = [
  ['CODE', fs.readFileSync(path.join(here, 'theme-nine-r34-refresh-preflight.mjs')),
    'theme-nine-r34-refresh-preflight.mjs'],
  ['ROSTER', fs.readFileSync(path.resolve(here, '../../config/theme-nine-r20-approved-candidates.json')),
    'theme-nine-r20-approved-candidates.json']
];
const sha = buf => createHash('sha256').update(buf).digest('hex');
const segments = sources.map(([kind, data, name]) => ({kind, data, name, hash: sha(data)}));
const js = [
  "const fs=require('node:fs')",
  "const cr=require('node:crypto')",
  "const p=require('node:path')",
  "const s=fs.readFileSync(process.env.R34_SELF,'ascii')",
  "const h=b=>cr.createHash('sha256').update(b).digest('hex')",
  "const section=n=>{const a='::R34_'+n+'_BEGIN',z='::R34_'+n+'_END';const i=s.lastIndexOf(a),j=s.indexOf(z,i+a.length);if(i<0||j<0)throw Error('BUNDLE_SECTION_MISSING_'+n);return Buffer.from(s.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64')}"
];
for(const seg of segments)js.push(`{const b=section('${seg.kind}');if(h(b)!=='${seg.hash}')throw Error('BUNDLE_SHA_MISMATCH_${seg.kind}');fs.writeFileSync(p.join(process.env.R34_STAGE,'${seg.name}'),b,{flag:'wx'})}`);
js.push("console.log('BUNDLE_SHA_VERIFIED=YES')");
const extract = js.join(';');
if (extract.includes('"') || extract.length >= 7500) throw Error('BUNDLE_WINDOWS_COMMAND_TOO_LONG');
const lines = [
  '@echo off',
  'setlocal EnableExtensions DisableDelayedExpansion',
  'rem R34 offline only: verify immutable R23 and report candidate incremental anchor.',
  'rem No provider requests, DB, publication or scheduler changes.',
  'set "R34_SELF=%~f0"',
  'set "R34_FOLDER=%~dp0"',
  'set "R34_STAGE=%~dp0R34_STAGE_%RANDOM%_%RANDOM%"',
  'set "R34_LOG=%~dp0THEME_NINE_R34_REFRESH_PREFLIGHT_%RANDOM%_%RANDOM%.txt"',
  'set "R34_JSON_RESULT=%~dp0THEME_NINE_R34_REFRESH_PREFLIGHT_%RANDOM%_%RANDOM%.json"',
  'set "R34_NODE=node"',
  'if exist "E:\\ZGmini\\runtime\\node.exe" set "R34_NODE=E:\\ZGmini\\runtime\\node.exe"',
  'if exist "%R34_STAGE%" goto :collision',
  'if exist "%R34_LOG%" goto :collision',
  'if exist "%R34_JSON_RESULT%" goto :collision',
  'mkdir "%R34_STAGE%"',
  'if errorlevel 1 goto :mkdir_failed',
  '>"%R34_LOG%" echo REPORT=THEME_NINE_R34_PRIVATE_REFRESH_PREFLIGHT',
  '>>"%R34_LOG%" echo PROVIDER_DB_D1_SCHEDULER_PUBLICATION_WRITES=0',
  '"%R34_NODE%" --version >>"%R34_LOG%" 2>&1',
  'if errorlevel 1 goto :node_failed',
  `"%R34_NODE%" -e "${extract}" >>"%R34_LOG%" 2>&1`,
  'if errorlevel 1 goto :extract_failed',
  '"%R34_NODE%" "%R34_STAGE%\\theme-nine-r34-refresh-preflight.mjs" --inspect >>"%R34_LOG%" 2>&1',
  'set "R34_RC=%ERRORLEVEL%"',
  'goto :cleanup',
  ':node_failed',
  '>>"%R34_LOG%" echo STATUS=NODE_UNAVAILABLE',
  'set "R34_RC=1"',
  'goto :cleanup',
  ':extract_failed',
  '>>"%R34_LOG%" echo STATUS=EMBEDDED_SHA_OR_EXTRACTION_FAILED',
  'set "R34_RC=1"',
  'goto :cleanup',
  ':mkdir_failed',
  '>"%R34_LOG%" echo STATUS=R34_STAGE_CREATE_FAILED',
  'set "R34_RC=1"',
  'goto :cleanup',
  ':collision',
  'echo STATUS=R34_RESULT_OR_STAGE_NAME_COLLISION',
  'exit /b 2',
  ':cleanup',
  'if exist "%R34_STAGE%\\theme-nine-r34-refresh-preflight.mjs" del /q "%R34_STAGE%\\theme-nine-r34-refresh-preflight.mjs"',
  'if exist "%R34_STAGE%\\theme-nine-r20-approved-candidates.json" del /q "%R34_STAGE%\\theme-nine-r20-approved-candidates.json"',
  'if exist "%R34_STAGE%" rmdir "%R34_STAGE%"',
  'type "%R34_LOG%"',
  'exit /b %R34_RC%'
];
for (const seg of segments) {
  lines.push(`::R34_${seg.kind}_BEGIN`);
  lines.push(...seg.data.toString('base64').match(/.{1,128}/g).map(s => '::' + s));
  lines.push(`::R34_${seg.kind}_END`);
}
const content = lines.join('\r\n') + '\r\n';
if (/[^\x00-\x7F]/.test(content) || /(?<!\r)\n/.test(content)) throw Error('R34_CMD_NOT_ASCII_CRLF');
fs.writeFileSync(dest, content);
process.stdout.write(JSON.stringify({file: path.basename(dest), bytes: Buffer.byteLength(content),
  sources: segments.map(({kind, hash}) => ({kind,sha256:hash})), offlineOnly:true})+'\n');
