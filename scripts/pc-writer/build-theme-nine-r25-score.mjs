// Build one portable Windows CMD with exact existing adaptive R2 code and
// source-extracted original proxy-close selector. No API calls; no runtime installs.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = relative => fs.readFileSync(path.join(here, relative));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const approved = read('theme-space-satellite-adaptive-r2.mjs').toString('utf8');
function piece(start, end) {
  const i = approved.indexOf(start);
  const j = approved.indexOf(end, i + start.length);
  if (i < 0 || j < 0 || approved.indexOf(start, i + 1) !== -1) throw Error('APPROVED_SOURCE_CONTRACT_CHANGED');
  return approved.slice(i, j).trimEnd();
}
// Each following block is an exact substring of the approved GitHub module.
// In particular, the session-selection function body is NOT rewritten here.
const selector = [
  '// Exact, byte-for-byte excerpts from theme-space-satellite-adaptive-r2.mjs.',
  '// The bundled source SHA and section SHA are verified at build and on CMD execution.',
  piece('const EARLY_CLOSE=', '\nconst RAW_MODE='),
  piece('const check=', '\nconst isDate='),
  piece('const ny=', '\n\n// Same proxy-close selection'),
  piece('export function selectRealHourlySessions(rows){', '\n\nexport function auditSpaceSatelliteAdaptive('),
  ''
].join('\n\n');
if (!selector.includes('export function selectRealHourlySessions(rows)') ||
    !selector.includes("EARLY_CLOSE.has(date)?'12':'15'"))
  throw Error('APPROVED_PROXY_EXCERPT_INVALID');
const adapterPath = path.join(here, 'theme-nine-r25-approved-selector.mjs');
if (fs.existsSync(adapterPath) && fs.readFileSync(adapterPath, 'utf8') !== selector)
  throw Error('APPROVED_SELECTOR_ADAPTER_CHANGED_REVIEW_REQUIRED');
if (!fs.existsSync(adapterPath)) fs.writeFileSync(adapterPath, selector, {flag: 'wx'});
const bundles = [
  ['R25_CODE', read('theme-nine-r25-individual-score.mjs'), 'theme-nine-r25-individual-score.mjs'],
  ['R25_ROSTER', fs.readFileSync(path.resolve(here, '../../config/theme-nine-r20-approved-candidates.json')),
    'theme-nine-r20-approved-candidates.json'],
  ['R25_R24_AUDIT', read('theme-nine-r24-session-audit.mjs'), 'theme-nine-r24-session-audit.mjs'],
  ['R25_APPROVED_ADAPTIVE', read('theme-optional-adaptive-r2.mjs'), 'theme-optional-adaptive-r2.mjs'],
  ['R25_APPROVED_SELECTOR', Buffer.from(selector), 'theme-nine-r25-approved-selector.mjs']
];
const emit = buffer => buffer.toString('base64').match(/.{1,128}/g).map(line => '::' + line);
const js = [
  "const fs=require('node:fs')",
  "const cr=require('node:crypto')",
  "const p=require('node:path')",
  "const s=fs.readFileSync(process.env.R25_SELF,'utf8')",
  "const h=b=>cr.createHash('sha256').update(b).digest('hex')",
  "function part(n){const a='::'+n+'_BEGIN';const b='::'+n+'_END';const i=s.lastIndexOf(a);if(i<0)throw Error('NO_START_'+n);const j=s.indexOf(b,i+a.length);if(j<0)throw Error('NO_END_'+n);return Buffer.from(s.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64')}"
];
for (const [name, bytes, filename] of bundles) {
  js.push(`{const b=part('${name}');if(h(b)!=='${sha(bytes)}')throw Error('SHA_MISMATCH_${name}');fs.writeFileSync(p.join(process.env.R25_STAGE_DIR,'${filename}'),b,{flag:'wx'})}`);
}
js.push("console.log('BUNDLE_ALL_FIVE_SHA_VERIFIED=YES')");
const unpack = js.join(';');
if (unpack.includes('"') || unpack.length >= 7500) throw Error('WINDOWS_INLINE_NODE_UNSAFE');
const lines = [
  '@echo off',
  'setlocal EnableExtensions DisableDelayedExpansion',
  'rem R25 PRIVATE ETF scores: local read-only GMH 1h; existing R2 and NY proxy.',
  'rem All original OHLCV / D1 / scheduler / public resources are read-only.',
  'set "R25_SELF=%~f0"',
  'set "R25_RESULT=%~dp0THEME_NINE_R25_INDIVIDUAL_SCORES_RESULT.txt"',
  'set "R25_JSON_RESULT=%~dp0THEME_NINE_R25_INDIVIDUAL_SCORES_%RANDOM%_%RANDOM%.json"',
  'set "R25_NODE=node"',
  'if exist "E:\\ZGmini\\runtime\\node.exe" set "R25_NODE=E:\\ZGmini\\runtime\\node.exe"',
  'set "R25_STAGE_DIR=%~dp0R25_STAGE_%RANDOM%_%RANDOM%"',
  'set "R25_EXIT=1"',
  'if exist "%R25_STAGE_DIR%" goto :collision',
  'if exist "%R25_JSON_RESULT%" goto :collision',
  'mkdir "%R25_STAGE_DIR%"',
  'if errorlevel 1 goto :mkdir_failed',
  '>"%R25_RESULT%" echo REPORT=THEME_NINE_R25_PRIVATE_INDIVIDUAL_ETF_SCORES',
  '>>"%R25_RESULT%" echo BRANCH=codex/theme-fear-greed-integration-20261025',
  '>>"%R25_RESULT%" echo SOURCE=SHA_VERIFIED_R23_RAW_AND_EXACT_APPROVED_R2_MODULES',
  '>>"%R25_RESULT%" echo MODE=PRIVATE_NO_NETWORK_NO_DATA_ROOT_WRITE',
  '"%R25_NODE%" --version >>"%R25_RESULT%" 2>&1',
  'if errorlevel 1 goto :node_missing',
  `"%R25_NODE%" -e "${unpack}" >>"%R25_RESULT%" 2>&1`,
  'if errorlevel 1 goto :unpack_failed',
  'set "ZGMINI_R25_ROSTER_PATH=%R25_STAGE_DIR%\\theme-nine-r20-approved-candidates.json"',
  'set "ZGMINI_R25_JSON_RESULT=%R25_JSON_RESULT%"',
  '"%R25_NODE%" "%R25_STAGE_DIR%\\theme-nine-r25-individual-score.mjs" --private-score 2023-01-01 2026-10-26 >>"%R25_RESULT%" 2>&1',
  'set "R25_EXIT=%ERRORLEVEL%"',
  'goto :cleanup',
  ':node_missing',
  '>>"%R25_RESULT%" echo STATUS=NODE_NOT_AVAILABLE',
  'goto :cleanup',
  ':unpack_failed',
  '>>"%R25_RESULT%" echo STATUS=BUNDLE_SHA_OR_EXTRACT_FAILED',
  'goto :cleanup',
  ':mkdir_failed',
  '>"%R25_RESULT%" echo STATUS=STAGING_DIRECTORY_CREATION_FAILED',
  'goto :cleanup',
  ':collision',
  '>"%R25_RESULT%" echo STATUS=STAGING_OR_RESULT_FILENAME_COLLISION',
  'type "%R25_RESULT%"',
  'exit /b 2',
  ':cleanup',
  ...bundles.map(([, , filename]) => `if exist "%R25_STAGE_DIR%\\${filename}" del /q "%R25_STAGE_DIR%\\${filename}"`),
  'if exist "%R25_STAGE_DIR%" rmdir "%R25_STAGE_DIR%"',
  'type "%R25_RESULT%"',
  'exit /b %R25_EXIT%',
  ...bundles.flatMap(([name, bytes]) => [`::${name}_BEGIN`, ...emit(bytes), `::${name}_END`])
];
const output = path.join(here, 'THEME_NINE_R25_INDIVIDUAL_SCORES.cmd');
const contents = lines.join('\r\n') + '\r\n';
if (/[^\x00-\x7f]/.test(contents)) throw Error('WINDOWS_CMD_NON_ASCII');
fs.writeFileSync(output, contents, 'ascii');
const reread = fs.readFileSync(output, 'ascii');
for (const [name, bytes] of bundles) {
  const i = reread.lastIndexOf(`::${name}_BEGIN`);
  const j = reread.indexOf(`::${name}_END`, i);
  const extracted = Buffer.from(reread.slice(i + `::${name}_BEGIN`.length, j)
    .replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
  if (i < 0 || j < 0 || !bytes.equals(extracted)) throw Error('CMD_READBACK_SHA_MISMATCH_' + name);
}
process.stdout.write(JSON.stringify({status: 'R25_SINGLE_CMD_FIVE_SHA_READBACK_PASS',
  output, bytes: fs.statSync(output).size,
  exactExistingR2Sha256: sha(bundles[3][1]),
  extractedNYSelectorSha256: sha(bundles[4][1]),
  originalNYSelectorSourceSha256: sha(Buffer.from(approved)),
  rosterSha256: sha(bundles[1][1]),
  stage2AuditCodeSha256: sha(bundles[2][1])}, null, 2) + '\n');
