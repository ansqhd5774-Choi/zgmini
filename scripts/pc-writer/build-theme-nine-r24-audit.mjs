// Self-contained, read-only CMD: embeds stage-2 R24 verifier and approved R20 roster.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(here, 'theme-nine-r24-session-audit.mjs'));
const roster = fs.readFileSync(path.resolve(here, '../../config/theme-nine-r20-approved-candidates.json'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const encode = bytes => bytes.toString('base64').match(/.{1,128}/g).map(line => '::' + line);

const unpack = [
  "const fs=require('node:fs')",
  "const cr=require('node:crypto')",
  "const s=fs.readFileSync(process.env.R24_SELF,'utf8')",
  "function part(a,b){const i=s.lastIndexOf(a);if(i<0)throw Error('BUNDLE_START_MISSING');const j=s.indexOf(b,i+a.length);if(j<0)throw Error('BUNDLE_END_MISSING');return Buffer.from(s.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64')}",
  "const c=part('::R24_CODE_BEGIN','::R24_CODE_END')",
  "const r=part('::R24_ROSTER_BEGIN','::R24_ROSTER_END')",
  "const sha=b=>cr.createHash('sha256').update(b).digest('hex')",
  `if(sha(c)!=='${sha(code)}')throw Error('BUNDLE_CODE_SHA_MISMATCH')`,
  `if(sha(r)!=='${sha(roster)}')throw Error('BUNDLE_ROSTER_SHA_MISMATCH')`,
  "fs.writeFileSync(process.env.R24_STAGE_CODE,c,{flag:'wx'})",
  "fs.writeFileSync(process.env.R24_STAGE_ROSTER,r,{flag:'wx'})",
  "console.log('BUNDLE_SHA_VERIFIED=YES')"
].join(';');
if (unpack.includes('"') || unpack.length >= 7500) throw Error('WINDOWS_UNPACK_UNSAFE');

const lines = [
  '@echo off',
  'setlocal EnableExtensions DisableDelayedExpansion',
  'rem Read-only 1h OHLCV audit. NO API calls, no writes to E: or production.',
  'set "R24_SELF=%~f0"',
  'set "R24_RESULT=%~dp0THEME_NINE_R24_SESSION_AUDIT_RESULT.txt"',
  'set "R24_NODE=node"',
  'if exist "E:\\ZGmini\\runtime\\node.exe" set "R24_NODE=E:\\ZGmini\\runtime\\node.exe"',
  'set "R24_STAGE_CODE=%~dp0R24_LOCAL_%RANDOM%_%RANDOM%.mjs"',
  'set "R24_STAGE_ROSTER=%~dp0R24_LOCAL_%RANDOM%_%RANDOM%.json"',
  'set "R24_EXIT=1"',
  'if exist "%R24_STAGE_CODE%" goto :collision',
  'if exist "%R24_STAGE_ROSTER%" goto :collision',
  '>"%R24_RESULT%" echo REPORT=THEME_NINE_R24_SESSION_AUDIT',
  '>>"%R24_RESULT%" echo SOURCE_BRANCH=codex/theme-fear-greed-integration-20261025',
  '>>"%R24_RESULT%" echo SCOPE=READ_ONLY_R23_RAW_SHA_SPY_252_SESSION_AUDIT',
  '>>"%R24_RESULT%" echo API_REQUESTS_AND_DATA_ROOT_WRITES=ZERO',
  '"%R24_NODE%" --version >>"%R24_RESULT%" 2>&1',
  'if errorlevel 1 goto :node_missing',
  `"%R24_NODE%" -e "${unpack}" >>"%R24_RESULT%" 2>&1`,
  'if errorlevel 1 goto :unpack_failed',
  'set "ZGMINI_R24_ROSTER_PATH=%R24_STAGE_ROSTER%"',
  '"%R24_NODE%" "%R24_STAGE_CODE%" --audit 2023-01-01 2026-10-26 >>"%R24_RESULT%" 2>&1',
  'set "R24_EXIT=%ERRORLEVEL%"',
  'goto :cleanup',
  ':node_missing',
  '>>"%R24_RESULT%" echo STATUS=NODE_NOT_AVAILABLE',
  'goto :cleanup',
  ':unpack_failed',
  '>>"%R24_RESULT%" echo STATUS=BUNDLE_VERIFICATION_OR_EXTRACTION_FAILED',
  'goto :cleanup',
  ':collision',
  '>"%R24_RESULT%" echo STATUS=STAGING_FILENAME_COLLISION',
  'type "%R24_RESULT%"',
  'exit /b 2',
  ':cleanup',
  'if exist "%R24_STAGE_CODE%" del /q "%R24_STAGE_CODE%"',
  'if exist "%R24_STAGE_ROSTER%" del /q "%R24_STAGE_ROSTER%"',
  'type "%R24_RESULT%"',
  'exit /b %R24_EXIT%',
  '::R24_CODE_BEGIN', ...encode(code), '::R24_CODE_END',
  '::R24_ROSTER_BEGIN', ...encode(roster), '::R24_ROSTER_END'
];
const output = path.join(here, 'THEME_NINE_R24_SESSION_AUDIT.cmd');
const contents = lines.join('\r\n') + '\r\n';
if (/[^\x00-\x7f]/.test(contents)) throw Error('CMD_NON_ASCII');
fs.writeFileSync(output, contents, 'ascii');
const verify = fs.readFileSync(output, 'ascii');
const extract = (a, b) => Buffer.from(verify.split(a).at(-1).split(b)[0]
  .replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
if (!extract('::R24_CODE_BEGIN', '::R24_CODE_END').equals(code) ||
    !extract('::R24_ROSTER_BEGIN', '::R24_ROSTER_END').equals(roster))
  throw Error('CMD_BUNDLE_READBACK_MISMATCH');
process.stdout.write(JSON.stringify({output, bytes: fs.statSync(output).size,
  sourceSha256: sha(code), rosterSha256: sha(roster), status: 'ONE_FILE_CMD_VERIFIED'}) + '\n');
