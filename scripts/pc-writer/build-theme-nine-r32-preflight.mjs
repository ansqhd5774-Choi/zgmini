// Produce one ASCII/CRLF Windows CMD. This command reads a prior R25 result
// and emits a TXT preflight report beside itself, but never computes or writes
// a public theme score.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const sha = b => createHash('sha256').update(b).digest('hex');
const bundled = [
  ['R32_CODE', 'theme-nine-r32-readonly-preflight.mjs', 'theme-nine-r32-readonly-preflight.mjs'],
  ['R32_ROSTER', 'theme-nine-r20-approved-candidates.json', '../../config/theme-nine-r20-approved-candidates.json'],
  ['R32_AUM', 'theme-nine-r26-official-aum-evidence.json', '../../config/theme-nine-r26-official-aum-evidence.json']
].map(([label, filename, rel]) => ({label, filename, bytes: fs.readFileSync(path.resolve(here, rel))}));
const baseLines = bytes => bytes.toString('base64').match(/.{1,128}/g).map(line => '::' + line);
const run = [
  "const fs=require('node:fs')",
  "const cr=require('node:crypto')",
  "const p=require('node:path')",
  "const s=fs.readFileSync(process.env.R32_SELF,'ascii')",
  "const h=b=>cr.createHash('sha256').update(b).digest('hex')",
  "function part(n){const a='::'+n+'_BEGIN',b='::'+n+'_END';const i=s.lastIndexOf(a);if(i<0)throw Error('NO_START_'+n);const j=s.indexOf(b,i+a.length);if(j<0)throw Error('NO_END_'+n);return Buffer.from(s.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64')}"
];
for (const b of bundled) {
  run.push(`{const b=part('${b.label}');if(h(b)!=='${sha(b.bytes)}')throw Error('SHA_MISMATCH_${b.label}');fs.writeFileSync(p.join(process.env.R32_STAGE_DIR,'${b.filename}'),b,{flag:'wx'})}`);
}
run.push("console.log('R32_THREE_COMPONENT_SHA_VERIFIED=YES')");
const js = run.join(';');
if (js.includes('"') || js.length > 7500) throw Error('CMD_INLINE_JS_UNSAFE');
const cmd = [
  '@echo off',
  'setlocal EnableExtensions DisableDelayedExpansion',
  'rem R32 Stage-5 PRECHECK ONLY. No theme aggregate, AUM weights or network.',
  'rem Save this CMD and ONE R25 *_numbers_numbers.json together.',
  'rem If multiple R25 files exist, drag a selected R25 JSON onto this CMD.',
  'set "R32_SELF=%~f0"',
  'set "R32_FOLDER=%~dp0"',
  'set "R32_SELECTED=%~1"',
  'set "R32_RESULT=%~dp0THEME_NINE_R32_PREFLIGHT_RESULT_%RANDOM%_%RANDOM%.txt"',
  'set "R32_STAGE_DIR=%~dp0R32_PREFLIGHT_STAGE_%RANDOM%_%RANDOM%"',
  'set "R32_NODE=node"',
  'if exist "E:\\ZGmini\\runtime\\node.exe" set "R32_NODE=E:\\ZGmini\\runtime\\node.exe"',
  'set "R32_EXIT=1"',
  'if exist "%R32_STAGE_DIR%" goto :collision',
  'if exist "%R32_RESULT%" goto :collision',
  'mkdir "%R32_STAGE_DIR%"',
  'if errorlevel 1 goto :mkdir_failed',
  '>"%R32_RESULT%" echo REPORT=THEME_NINE_R32_READ_ONLY_PREFLIGHT',
  '>>"%R32_RESULT%" echo BRANCH=codex/theme-fear-greed-integration-20261025',
  '>>"%R32_RESULT%" echo NO_API_NO_AUM_WEIGHT_NO_SCORE_AGGREGATION_NO_PUBLICATION=YES',
  '"%R32_NODE%" --version >>"%R32_RESULT%" 2>&1',
  'if errorlevel 1 goto :node_failed',
  `"%R32_NODE%" -e "${js}" >>"%R32_RESULT%" 2>&1`,
  'if errorlevel 1 goto :unpack_failed',
  '"%R32_NODE%" "%R32_STAGE_DIR%\\theme-nine-r32-readonly-preflight.mjs" --preflight >>"%R32_RESULT%" 2>&1',
  'set "R32_EXIT=%ERRORLEVEL%"',
  'goto :cleanup',
  ':node_failed',
  '>>"%R32_RESULT%" echo STATUS=NODE_MISSING',
  'goto :cleanup',
  ':unpack_failed',
  '>>"%R32_RESULT%" echo STATUS=EMBEDDED_SHA_MISMATCH',
  'goto :cleanup',
  ':mkdir_failed',
  '>"%R32_RESULT%" echo STATUS=STAGING_CREATE_FAILED',
  'goto :cleanup',
  ':collision',
  'echo STATUS=STAGING_OR_OUTPUT_NAME_COLLISION',
  'exit /b 2',
  ':cleanup',
  ...bundled.map(b => `if exist "%R32_STAGE_DIR%\\${b.filename}" del /q "%R32_STAGE_DIR%\\${b.filename}"`),
  'if exist "%R32_STAGE_DIR%" rmdir "%R32_STAGE_DIR%"',
  'type "%R32_RESULT%"',
  'exit /b %R32_EXIT%',
  ...bundled.flatMap(b => [`::${b.label}_BEGIN`, ...baseLines(b.bytes), `::${b.label}_END`])
].join('\r\n') + '\r\n';
if (/[^\x00-\x7f]/.test(cmd)) throw Error('CMD_ASCII_ONLY');
const dest = path.join(here, 'THEME_NINE_R32_PREFLIGHT.cmd');
fs.writeFileSync(dest, cmd, 'ascii');
const reread = fs.readFileSync(dest, 'ascii');
for (const b of bundled) {
  const i = reread.lastIndexOf(`::${b.label}_BEGIN`);
  const j = reread.indexOf(`::${b.label}_END`, i);
  if (i < 0 || j < 0) throw Error('CMD_SECTION_MISSING_' + b.label);
  const actual = Buffer.from(reread.slice(i + `::${b.label}_BEGIN`.length, j)
    .replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
  if (!actual.equals(b.bytes)) throw Error('CMD_SECTION_READBACK_FAILED_' + b.label);
}
process.stdout.write(JSON.stringify({
  status: 'R32_CMD_EMBEDDED_READBACK_PASS',
  bytes: fs.statSync(dest).size,
  codeSha256: sha(bundled[0].bytes),
  rosterSha256: sha(bundled[1].bytes),
  aumEvidenceSha256: sha(bundled[2].bytes)
}, null, 2) + '\n');
