// Build a single downloadable Windows CMD from the audited R23 collector and R20 roster.
// The one-file bundle verifies embedded SHA256 and removes its two temporary files.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(here, 'theme-nine-r23-collect.mjs'));
const roster = fs.readFileSync(path.resolve(here, '../../config/theme-nine-r20-approved-candidates.json'));
const sha = value => createHash('sha256').update(value).digest('hex');

function linesOf(bytes) {
  return bytes.toString('base64').match(/.{1,128}/g).map(line => '::' + line);
}

const extraction = [
  "const fs=require('node:fs')",
  "const cr=require('node:crypto')",
  "const s=fs.readFileSync(process.env.R23_SELF,'utf8')",
  "function part(a,b){const i=s.lastIndexOf(a);if(i<0)throw Error('BUNDLE_START_MISSING');const j=s.indexOf(b,i+a.length);if(j<0)throw Error('BUNDLE_END_MISSING');const b64=s.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,'');return Buffer.from(b64,'base64')}",
  "const c=part('::R23_BUNDLE_CODE_BEGIN','::R23_BUNDLE_CODE_END')",
  "const r=part('::R23_BUNDLE_ROSTER_BEGIN','::R23_BUNDLE_ROSTER_END')",
  "const sha=b=>cr.createHash('sha256').update(b).digest('hex')",
  `if(sha(c)!=='${sha(code)}')throw Error('BUNDLE_CODE_SHA_MISMATCH')`,
  `if(sha(r)!=='${sha(roster)}')throw Error('BUNDLE_ROSTER_SHA_MISMATCH')`,
  "fs.writeFileSync(process.env.R23_STAGE_CODE,c,{flag:'wx'})",
  "fs.writeFileSync(process.env.R23_STAGE_ROSTER,r,{flag:'wx'})",
  "console.log('BUNDLE_SHA_VERIFIED=YES')"
].join(';');

if (extraction.includes('"') || extraction.length >= 7500) throw Error('WINDOWS_EVAL_UNSAFE');

const variants = [
  {filename: 'THEME_NINE_R23_PILOT.cmd', log: 'THEME_NINE_R23_PILOT_RESULT.txt',
    scope: 'AUTO_UP_TO_64_BATCHES_FOUR_FREE_GET_EACH_60S_PAUSE', mode: '--collect-auto'},
  {filename: 'THEME_NINE_R23_DIAGNOSE.cmd', log: 'THEME_NINE_R23_DIAGNOSE_RESULT.txt',
    scope: 'READ_ONLY_FAILED_CHECKPOINT_NO_NETWORK', mode: '--inspect-failure'}
];

for (const variant of variants) {
const lines = [
  '@echo off',
  'setlocal EnableExtensions DisableDelayedExpansion',
  'rem One-file private OHLCV pilot. Node.js required. No PowerShell, WSL or paid API.',
  'set "R23_SELF=%~f0"',
  `set "R23_RESULT=%~dp0${variant.log}"`,
  'set "R23_NODE=node"',
  'if exist "E:\\ZGmini\\runtime\\node.exe" set "R23_NODE=E:\\ZGmini\\runtime\\node.exe"',
  'set "R23_STAGE_CODE=%~dp0R23_LOCAL_%RANDOM%_%RANDOM%.mjs"',
  'set "R23_STAGE_ROSTER=%~dp0R23_LOCAL_%RANDOM%_%RANDOM%.json"',
  'set "R23_EXIT=1"',
  'if exist "%R23_STAGE_CODE%" goto :collision',
  'if exist "%R23_STAGE_ROSTER%" goto :collision',
  '>"%R23_RESULT%" echo REPORT=THEME_NINE_R23_PRIVATE_PRICE_PILOT',
  '>>"%R23_RESULT%" echo SOURCE_BRANCH=codex/theme-fear-greed-integration-20261025',
  `>>"%R23_RESULT%" echo SCOPE=${variant.scope}`,
  '>>"%R23_RESULT%" echo DATA_ROOT=E:/ZGmini/data',
  '>>"%R23_RESULT%" echo RAW_PUBLICATION_AND_SCHEDULER_WRITES=ZERO',
  '"%R23_NODE%" --version >>"%R23_RESULT%" 2>&1',
  'if errorlevel 1 goto :node_missing',
  `"%R23_NODE%" -e "${extraction}" >>"%R23_RESULT%" 2>&1`,
  'if errorlevel 1 goto :unpack_failed',
  'set "ZGMINI_R23_ROSTER_PATH=%R23_STAGE_ROSTER%"',
  `"%R23_NODE%" "%R23_STAGE_CODE%" ${variant.mode} 2023-01-01 2026-10-26 >>"%R23_RESULT%" 2>&1`,
  'set "R23_EXIT=%ERRORLEVEL%"',
  'goto :cleanup',
  ':node_missing',
  '>>"%R23_RESULT%" echo STATUS=NODE_NOT_AVAILABLE',
  'goto :cleanup',
  ':unpack_failed',
  '>>"%R23_RESULT%" echo STATUS=BUNDLE_VERIFICATION_OR_EXTRACTION_FAILED',
  'goto :cleanup',
  ':collision',
  '>"%R23_RESULT%" echo STATUS=STAGING_FILENAME_COLLISION',
  'type "%R23_RESULT%"',
  'exit /b 2',
  ':cleanup',
  'if exist "%R23_STAGE_CODE%" del /q "%R23_STAGE_CODE%"',
  'if exist "%R23_STAGE_ROSTER%" del /q "%R23_STAGE_ROSTER%"',
  'type "%R23_RESULT%"',
  'exit /b %R23_EXIT%',
  '::R23_BUNDLE_CODE_BEGIN',
  ...linesOf(code),
  '::R23_BUNDLE_CODE_END',
  '::R23_BUNDLE_ROSTER_BEGIN',
  ...linesOf(roster),
  '::R23_BUNDLE_ROSTER_END'
];

const output = path.join(here, variant.filename);
const content = lines.join('\r\n') + '\r\n';
if (/[^\x00-\x7f]/.test(content)) throw Error('NON_ASCII_CMD');
fs.writeFileSync(output, content, 'ascii');
const verification = fs.readFileSync(output, 'ascii');
const extract = (a, b) => Buffer.from(verification.split(a).at(-1).split(b)[0]
  .replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
if (!extract('::R23_BUNDLE_CODE_BEGIN', '::R23_BUNDLE_CODE_END').equals(code) ||
    !extract('::R23_BUNDLE_ROSTER_BEGIN', '::R23_BUNDLE_ROSTER_END').equals(roster))
  throw Error('BUNDLE_READBACK_MISMATCH');
process.stdout.write(JSON.stringify({output, bytes: fs.statSync(output).size,
  codeSha256: sha(code), rosterSha256: sha(roster), mode: 'ONE_FILE_CMD_VERIFIED'}) + '\n');
}
